import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// S3 Configuration
export const s3Configs = pgTable("s3_configs", {
  id: serial("id").primaryKey(),
  bucketName: text("bucket_name").notNull(),
  region: text("region").notNull(),
  endpoint: text("endpoint"), // Custom S3-compatible endpoint URL
  accessKeyId: text("access_key_id").notNull(),
  secretAccessKey: text("secret_access_key").notNull(),
  isActive: boolean("is_active").default(true),
});

export const insertS3ConfigSchema = createInsertSchema(s3Configs).omit({
  id: true,
  isActive: true,
});

// Notes from S3
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  joplinId: text("joplin_id").notNull().unique(), // Original GUID filename
  title: text("title").notNull(),
  body: text("body").notNull(),
  author: text("author"),
  source: text("source"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  altitude: text("altitude"),
  completed: boolean("completed"),
  due: timestamp("due"),
  createdTime: timestamp("created_time"),
  updatedTime: timestamp("updated_time"),
  s3Key: text("s3_key").notNull(), // Full S3 object key
  tags: text("tags").array().default([]),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
});

// Sync Status
export const syncStatus = pgTable("sync_status", {
  id: serial("id").primaryKey(),
  lastSyncTime: timestamp("last_sync_time"),
  totalNotes: integer("total_notes").default(0),
  storageUsed: text("storage_used"),
  isConnected: boolean("is_connected").default(false),
});

export type S3Config = typeof s3Configs.$inferSelect;
export type InsertS3Config = z.infer<typeof insertS3ConfigSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type SyncStatus = typeof syncStatus.$inferSelect;
