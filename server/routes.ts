import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertNoteSchema, SyncStatus } from "@shared/schema";
import { z } from "zod";
import AWS from "aws-sdk";
import matter from "gray-matter";
import { getCachedNotes, setCachedNotes, isCacheValid } from "./cache";
import { NoteData } from "./types";

const parentId_filter = "ce3835780b164c92b8fa16a4edee5952";

export async function getNotes(): Promise<[NoteData[], SyncStatus]> {
  const status: SyncStatus = {
    isConnected: false,
    lastSyncTime: null,
    totalNotes: 0,
    storageUsed: "0 MB",
    id: -1,
  };

  try {
    // Get S3 configuration from environment variables
    const bucketName = process.env.S3_BUCKET_NAME;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const region = process.env.S3_REGION;
    const endpoint = process.env.S3_ENDPOINT;

    console.log(bucketName, accessKeyId, secretAccessKey, region, endpoint);

    if (!bucketName || !accessKeyId || !secretAccessKey || !region) {
      throw new Error(
        "S3 configuration missing in environment variables. Required: S3_BUCKET_NAME, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION"
      );
    }

    const notes: NoteData[] = [];

    // Configure AWS SDK
    const s3Config: any = {
      accessKeyId,
      secretAccessKey,
      region,
    };

    // Add custom endpoint if configured
    if (endpoint) {
      s3Config.endpoint = endpoint;
      s3Config.s3ForcePathStyle = true; // Required for most S3-compatible services
    }

    const s3 = new AWS.S3(s3Config);

    // List all .md files in the bucket/bucket directory
    const prefix = ""; //`${bucketName}/`;
    const listParams = {
      Bucket: bucketName,
      Prefix: prefix,
    };

    const objects = await s3.listObjectsV2(listParams).promise();

    if (!objects.Contents) {
      console.warn("No files found in bucket");
      return [[], status];
    }

    const mdFiles = objects.Contents.filter(
      (obj) => obj.Key && obj.Key.endsWith(".md")
    );

    // Process each markdown file
    for (const file of mdFiles) {
      if (!file.Key) continue;

      try {
        const getParams = {
          Bucket: bucketName,
          Key: file.Key,
        };

        const data = await s3.getObject(getParams).promise();
        const content = data.Body?.toString("utf-8") || "";

        // First, quickly check if this is a revision file (starts with metadata immediately)
        if (content.trim().startsWith("id:") && content.includes("type_:")) {
          console.log(`Skipping revision file: ${file.Key}`);
          continue;
        }

        // Parse Joplin note format
        const lines = content.split("\n");
        let bodyEndIndex = -1;

        // Find where the metadata starts (look for 'id:' line)
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith("id:")) {
            bodyEndIndex = i - 1;
            break;
          }
        }

        // Extract body and metadata
        const body: string =
          bodyEndIndex > 0
            ? lines
                .slice(0, bodyEndIndex + 1)
                .join("\n")
                .trim()
            : "";
        const metadataLines =
          bodyEndIndex > 0 ? lines.slice(bodyEndIndex + 1) : lines;

        // Extract GUID from filename first
        const joplinId: string = file.Key.replace(".md", "");

        // Extract title early for duplicate checking
        let title = joplinId;
        if (body) {
          const firstLine = body.split("\n")[0].trim();
          if (firstLine && !firstLine.startsWith("#")) {
            title = firstLine;
          } else if (firstLine.startsWith("#")) {
            title = firstLine.replace(/^#+\s*/, "");
          }
        }

        // Check for duplicate titles before processing metadata
        const allNotes = await storage.getAllNotes();
        const existingNoteByTitle = allNotes.find((n) => n.title === title);
        if (existingNoteByTitle) {
          console.log(`Skipping duplicate title: ${title}`);
          continue;
        }

        // Parse metadata into object
        const metadata: Record<string, string> = {};
        for (const line of metadataLines) {
          const trimmed = line.trim();
          if (trimmed && trimmed.includes(":")) {
            const colonIndex = trimmed.indexOf(":");
            const key = trimmed.substring(0, colonIndex).trim();
            const value = trimmed.substring(colonIndex + 1).trim();
            metadata[key] = value;
          }
        }

        // Skip revisions and resources - only process actual notes
        if (metadata.type_ !== "1") {
          console.log(
            `Skipping file ${file.Key}: type ${metadata.type_} (not a note)`
          );
          continue;
        }

        // only allow notes in the "Work" folder (parent_id: ce3835780b164c92b8fa16a4edee5952)
        if (metadata.parent_id !== parentId_filter) {
          continue;
        }

        // Extra check: if no body content, this might be a broken file
        if (!body || body.trim().length === 0) {
          console.log(`Skipping file ${file.Key}: no body content`);
          continue;
        }

        // Create note with parsed data
        const noteData: NoteData = {
          joplinId,
          title: title || joplinId,
          body: body || "",
          author: metadata.author || null,
          source: metadata.source || null,
          latitude: metadata.latitude || null,
          longitude: metadata.longitude || null,
          altitude: metadata.altitude || null,
          completed: metadata.todo_completed === "1" || null,
          due:
            metadata.todo_due && metadata.todo_due !== "0"
              ? new Date(parseInt(metadata.todo_due))
              : null,
          createdTime: metadata.created_time
            ? new Date(metadata.created_time)
            : null,
          updatedTime: metadata.updated_time
            ? new Date(metadata.updated_time)
            : null,
          s3Key: file.Key,
          tags: [] as string[], // Joplin stores tags separately, we'll handle this later
          size: file.Size,
        };

        notes.push(noteData);
      } catch (fileError) {
        console.error(`Error processing file ${file.Key}:`, fileError);
      }
    }

    let storageUsed = 0;
    for (const note of notes) {
      storageUsed += note.size || 0;
    }

    status.isConnected = true;
    status.lastSyncTime = new Date();
    status.totalNotes = notes.length;
    status.storageUsed = `${(storageUsed / 1024 / 1024).toFixed(2)} MB`;

    return [notes, status];
  } catch (error) {
    console.error("fetching files failes", error);
  }

  return [[], status];
}

export function registerRoutes(app: Express): Server {
  // Notes sync endpoint
  app.post("/api/notes/sync", async (req, res) => {
    try {
      let processedCount = 0;
      let storageUsed = 0;

      const [notes, status] = (await getNotes()) ?? [];

      // Clear existing notes
      await storage.deleteAllNotes();

      for (const noteData of notes) {
        await storage.createNote(noteData);
      }

      // Update sync status
      const syncStatus = await storage.updateSyncStatus(status);

      // Cache the synced data
      const allNotes = await storage.getAllNotes();
      await setCachedNotes(allNotes, syncStatus);

      res.json({
        message: "Sync completed successfully",
        notesCount: processedCount,
        storageUsed: `${(storageUsed / 1024 / 1024).toFixed(2)} MB`,
      });
    } catch (error) {
      console.error("Sync failed:", error);
      await storage.updateSyncStatus({ isConnected: false });
      res.status(500).json({
        message: error instanceof Error ? error.message : "Sync failed",
      });
    }
  });

  // Function to perform auto-sync if needed
  async function autoSyncIfNeeded() {
    try {
      // Check if we have valid cached data first
      if (await isCacheValid()) {
        const cachedData = await getCachedNotes();
        if (cachedData && cachedData.notes.length > 0) {
          // Load cached notes into memory storage
          await storage.deleteAllNotes();
          for (const note of cachedData.notes) {
            await storage.createNote(note);
          }
          // Update sync status from cache
          if (cachedData.syncStatus) {
            await storage.updateSyncStatus(cachedData.syncStatus);
          }
          console.log(`Loaded ${cachedData.notes.length} notes from cache`);
          return true;
        }
      }

      const cachedNotes = await storage.getAllNotes();

      // If no notes exist, perform auto-sync
      if (cachedNotes.length === 0) {
        console.log("No notes found in cache, performing auto-sync...");

        let processedCount = 0;
        let storageUsed = 0;

        const notes = (await getNotes()) ?? [];

        for (const noteData of notes) {
          await storage.createNote(noteData);
          processedCount++;
          storageUsed += noteData.size || 0;
        }

        // Update sync status
        const syncStatus = await storage.updateSyncStatus({
          lastSyncTime: new Date(),
          totalNotes: processedCount,
          storageUsed: `${(storageUsed / 1024 / 1024).toFixed(2)} MB`,
          isConnected: true,
        });

        // Cache the synced data
        const allNotes = await storage.getAllNotes();
        await setCachedNotes(allNotes, syncStatus);

        console.log(
          `Auto-sync completed: ${processedCount} notes loaded and cached`
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("Auto-sync failed:", error);
      return false;
    }
  }

  // Notes endpoints
  app.get("/api/notes", async (req, res) => {
    try {
      // Try auto-sync if cache is empty
      await autoSyncIfNeeded();

      const { search, tags } = req.query;

      let notes;
      if (search) {
        notes = await storage.searchNotes(search as string);
      } else if (tags) {
        const tagArray = Array.isArray(tags)
          ? (tags as string[])
          : [tags as string];
        notes = await storage.getNotesByTags(tagArray);
      } else {
        notes = await storage.getAllNotes();
      }

      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notes" });
    }
  });

  app.get("/api/notes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const note = await storage.getNoteById(id);

      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      res.json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to get note" });
    }
  });

  // Sync status endpoint
  app.get("/api/sync-status", async (req, res) => {
    try {
      const status = await storage.getSyncStatus();

      // Check if S3 environment variables are configured
      const isS3Configured = !!(
        process.env.S3_BUCKET_NAME &&
        process.env.S3_ACCESS_KEY_ID &&
        process.env.S3_SECRET_ACCESS_KEY &&
        process.env.S3_REGION
      );

      res.json(
        status || {
          lastSyncTime: null,
          totalNotes: 0,
          storageUsed: "0 MB",
          isConnected: isS3Configured,
        }
      );
    } catch (error) {
      res.status(500).json({ message: "Failed to get sync status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
