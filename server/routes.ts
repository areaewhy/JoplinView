import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertS3ConfigSchema, insertNoteSchema } from "@shared/schema";
import { z } from "zod";
import AWS from "aws-sdk";
import matter from "gray-matter";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // S3 Configuration endpoints
  app.get("/api/s3-config", async (req, res) => {
    try {
      const config = await storage.getS3Config();
      if (!config) {
        return res.status(404).json({ message: "No S3 configuration found" });
      }
      
      // Don't send secret key in response
      const { secretAccessKey, ...safeConfig } = config;
      res.json(safeConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to get S3 configuration" });
    }
  });

  app.post("/api/s3-config", async (req, res) => {
    try {
      const validatedData = insertS3ConfigSchema.parse(req.body);
      const config = await storage.createS3Config(validatedData);
      
      // Don't send secret key in response
      const { secretAccessKey, ...safeConfig } = config;
      res.json(safeConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save S3 configuration" });
    }
  });

  app.post("/api/s3-config/test", async (req, res) => {
    try {
      const { bucketName, region, accessKeyId, secretAccessKey } = req.body;
      
      // Configure AWS SDK
      const s3Config: any = {
        accessKeyId,
        secretAccessKey,
        region,
      };
      
      // Add custom endpoint if provided
      if (req.body.endpoint) {
        s3Config.endpoint = req.body.endpoint;
        s3Config.s3ForcePathStyle = true; // Required for most S3-compatible services
      }
      
      const s3 = new AWS.S3(s3Config);

      // Test connection by listing bucket contents
      await s3.headBucket({ Bucket: bucketName }).promise();
      
      res.json({ success: true, message: "S3 connection successful" });
    } catch (error) {
      console.error("S3 connection test failed:", error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "S3 connection failed" 
      });
    }
  });

  // Notes sync endpoint
  app.post("/api/notes/sync", async (req, res) => {
    try {
      const config = await storage.getS3Config();
      if (!config) {
        return res.status(400).json({ message: "No S3 configuration found" });
      }

      // Configure AWS SDK
      const s3Config: any = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
      };
      
      // Add custom endpoint if configured
      if (config.endpoint) {
        s3Config.endpoint = config.endpoint;
        s3Config.s3ForcePathStyle = true; // Required for most S3-compatible services
      }
      
      const s3 = new AWS.S3(s3Config);

      // List all .md files in the bucket/bucket directory
      const prefix = `${config.bucketName}/`;
      const listParams = {
        Bucket: config.bucketName,
        Prefix: prefix,
      };

      const objects = await s3.listObjectsV2(listParams).promise();
      
      if (!objects.Contents) {
        return res.json({ message: "No files found in bucket", notesCount: 0 });
      }

      const mdFiles = objects.Contents.filter(obj => 
        obj.Key && obj.Key.endsWith('.md')
      );

      // Clear existing notes
      await storage.deleteAllNotes();

      let processedCount = 0;
      let storageUsed = 0;

      // Process each markdown file
      for (const file of mdFiles) {
        if (!file.Key) continue;

        try {
          const getParams = {
            Bucket: config.bucketName,
            Key: file.Key,
          };

          const data = await s3.getObject(getParams).promise();
          const content = data.Body?.toString('utf-8') || '';
          
          // First, quickly check if this is a revision file (starts with metadata immediately)
          if (content.trim().startsWith('id:') && content.includes('type_:')) {
            console.log(`Skipping revision file: ${file.Key}`);
            continue;
          }
          
          // Parse Joplin note format
          const lines = content.split('\n');
          let bodyEndIndex = -1;
          
          // Find where the metadata starts (look for 'id:' line)
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('id:')) {
              bodyEndIndex = i - 1;
              break;
            }
          }
          
          // Extract body (content before metadata) and metadata
          const body = bodyEndIndex > 0 ? lines.slice(0, bodyEndIndex + 1).join('\n').trim() : '';
          const metadataLines = bodyEndIndex > 0 ? lines.slice(bodyEndIndex + 1) : lines;
          
          // Parse metadata into object
          const metadata: any = {};
          for (const line of metadataLines) {
            const trimmed = line.trim();
            if (trimmed && trimmed.includes(':')) {
              const colonIndex = trimmed.indexOf(':');
              const key = trimmed.substring(0, colonIndex).trim();
              const value = trimmed.substring(colonIndex + 1).trim();
              metadata[key] = value;
            }
          }
          
          // Skip revisions and resources - only process actual notes
          if (metadata.type_ !== '1') {
            console.log(`Skipping file ${file.Key}: type ${metadata.type_} (not a note)`);
            continue;
          }
          
          // Extra check: if no body content, this might be a broken file
          if (!body || body.trim().length === 0) {
            console.log(`Skipping file ${file.Key}: no body content`);
            continue;
          }

          // Extract GUID from filename (remove directory path and .md extension)
          const joplinId = file.Key.replace(prefix, '').replace('.md', '');
          
          // Extract title from body (first line) or use joplinId as fallback
          let title = joplinId;
          if (body) {
            const firstLine = body.split('\n')[0].trim();
            if (firstLine && !firstLine.startsWith('#')) {
              title = firstLine;
            } else if (firstLine.startsWith('#')) {
              title = firstLine.replace(/^#+\s*/, '');
            }
          }
          
          // Create note with parsed data
          const noteData = {
            joplinId,
            title: title || joplinId,
            body: body || '',
            author: metadata.author || null,
            source: metadata.source || null,
            latitude: metadata.latitude || null,
            longitude: metadata.longitude || null,
            altitude: metadata.altitude || null,
            completed: metadata.todo_completed === '1' || null,
            due: metadata.todo_due && metadata.todo_due !== '0' ? new Date(parseInt(metadata.todo_due)) : null,
            createdTime: metadata.created_time ? new Date(metadata.created_time) : null,
            updatedTime: metadata.updated_time ? new Date(metadata.updated_time) : null,
            s3Key: file.Key,
            tags: [], // Joplin stores tags separately, we'll handle this later
          };

          await storage.createNote(noteData);
          processedCount++;
          storageUsed += file.Size || 0;

        } catch (fileError) {
          console.error(`Error processing file ${file.Key}:`, fileError);
          // Continue processing other files
        }
      }

      // Update sync status
      await storage.updateSyncStatus({
        lastSyncTime: new Date(),
        totalNotes: processedCount,
        storageUsed: `${(storageUsed / 1024 / 1024).toFixed(2)} MB`,
        isConnected: true,
      });

      res.json({ 
        message: "Sync completed successfully", 
        notesCount: processedCount,
        storageUsed: `${(storageUsed / 1024 / 1024).toFixed(2)} MB`
      });

    } catch (error) {
      console.error("Sync failed:", error);
      await storage.updateSyncStatus({ isConnected: false });
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Sync failed" 
      });
    }
  });

  // Notes endpoints
  app.get("/api/notes", async (req, res) => {
    try {
      const { search, tags } = req.query;
      
      let notes;
      if (search) {
        notes = await storage.searchNotes(search as string);
      } else if (tags) {
        const tagArray = Array.isArray(tags) ? tags as string[] : [tags as string];
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
      res.json(status || {
        lastSyncTime: null,
        totalNotes: 0,
        storageUsed: "0 MB",
        isConnected: false,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get sync status" });
    }
  });

  // Get all unique tags
  app.get("/api/tags", async (req, res) => {
    try {
      const notes = await storage.getAllNotes();
      const tagCounts: Record<string, number> = {};
      
      notes.forEach(note => {
        note.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
      
      const tags = Object.entries(tagCounts).map(([name, count]) => ({
        name,
        count,
      }));
      
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tags" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
