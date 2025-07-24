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
          
          // Parse front matter
          const parsed = matter(content);
          const frontMatter = parsed.data;
          const body = parsed.content;

          // Extract GUID from filename (remove directory path and .md extension)
          const joplinId = file.Key.replace(prefix, '').replace('.md', '');
          
          // Create note with parsed data
          const noteData = {
            joplinId,
            title: frontMatter.title || joplinId,
            body,
            author: frontMatter.author || null,
            source: frontMatter.source || null,
            latitude: frontMatter.latitude?.toString() || null,
            longitude: frontMatter.longitude?.toString() || null,
            altitude: frontMatter.altitude?.toString() || null,
            completed: frontMatter['completed?'] === 'yes' || frontMatter.completed === true || null,
            due: frontMatter.due ? new Date(frontMatter.due) : null,
            createdTime: frontMatter.created ? new Date(frontMatter.created) : null,
            updatedTime: frontMatter.updated ? new Date(frontMatter.updated) : null,
            s3Key: file.Key,
            tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [],
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
