import { s3Configs, notes, syncStatus, type S3Config, type InsertS3Config, type Note, type InsertNote, type SyncStatus } from "@shared/schema";

export interface IStorage {
  // S3 Configuration
  getS3Config(): Promise<S3Config | undefined>;
  createS3Config(config: InsertS3Config): Promise<S3Config>;
  updateS3Config(id: number, config: Partial<InsertS3Config>): Promise<S3Config>;
  
  // Notes
  getAllNotes(): Promise<Note[]>;
  getNoteById(id: number): Promise<Note | undefined>;
  getNoteByJoplinId(joplinId: string): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: number): Promise<void>;
  deleteAllNotes(): Promise<void>;
  searchNotes(query: string): Promise<Note[]>;
  getNotesByTags(tags: string[]): Promise<Note[]>;
  
  // Sync Status
  getSyncStatus(): Promise<SyncStatus | undefined>;
  updateSyncStatus(status: Partial<SyncStatus>): Promise<SyncStatus>;
}

export class MemStorage implements IStorage {
  private s3Configs: Map<number, S3Config>;
  private notes: Map<number, Note>;
  private syncStatus: SyncStatus | undefined;
  private currentS3Id: number;
  private currentNoteId: number;

  constructor() {
    this.s3Configs = new Map();
    this.notes = new Map();
    this.currentS3Id = 1;
    this.currentNoteId = 1;

    // Initialize with hardcoded S3 configuration
    this.initializeS3Config();
  }

  private initializeS3Config() {
    const defaultConfig: S3Config = {
      id: 1,
      bucketName: process.env.S3_BUCKET_NAME || "",
      region: process.env.S3_REGION || "",
      endpoint: process.env.S3_ENDPOINT || null,
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      isActive: true,
    };
    this.s3Configs.set(1, defaultConfig);
    this.currentS3Id = 2;
  }

  // S3 Configuration
  async getS3Config(): Promise<S3Config | undefined> {
    return Array.from(this.s3Configs.values()).find(config => config.isActive);
  }

  async createS3Config(insertConfig: InsertS3Config): Promise<S3Config> {
    // Deactivate existing configs
    this.s3Configs.forEach(config => config.isActive = false);
    
    const id = this.currentS3Id++;
    const config: S3Config = { 
      ...insertConfig, 
      id, 
      isActive: true,
      endpoint: insertConfig.endpoint || null 
    };
    this.s3Configs.set(id, config);
    return config;
  }

  async updateS3Config(id: number, updates: Partial<InsertS3Config>): Promise<S3Config> {
    const config = this.s3Configs.get(id);
    if (!config) {
      throw new Error("S3 config not found");
    }
    
    const updatedConfig = { ...config, ...updates };
    this.s3Configs.set(id, updatedConfig);
    return updatedConfig;
  }

  // Notes
  async getAllNotes(): Promise<Note[]> {
    return Array.from(this.notes.values()).sort((a, b) => 
      new Date(b.updatedTime || 0).getTime() - new Date(a.updatedTime || 0).getTime()
    );
  }

  async getNoteById(id: number): Promise<Note | undefined> {
    return this.notes.get(id);
  }

  async getNoteByJoplinId(joplinId: string): Promise<Note | undefined> {
    return Array.from(this.notes.values()).find(note => note.joplinId === joplinId);
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const id = this.currentNoteId++;
    const note: Note = { 
      ...insertNote, 
      id,
      // Ensure null instead of undefined for optional fields
      source: insertNote.source || null,
      author: insertNote.author || null,
      latitude: insertNote.latitude || null,
      longitude: insertNote.longitude || null,
      altitude: insertNote.altitude || null,
      completed: insertNote.completed || null,
      tags: insertNote.tags || []
    };
    this.notes.set(id, note);
    return note;
  }

  async updateNote(id: number, updates: Partial<InsertNote>): Promise<Note> {
    const note = this.notes.get(id);
    if (!note) {
      throw new Error("Note not found");
    }
    
    const updatedNote = { ...note, ...updates };
    this.notes.set(id, updatedNote);
    return updatedNote;
  }

  async deleteNote(id: number): Promise<void> {
    this.notes.delete(id);
  }

  async deleteAllNotes(): Promise<void> {
    this.notes.clear();
  }

  async searchNotes(query: string): Promise<Note[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.notes.values()).filter(note =>
      note.title.toLowerCase().includes(lowercaseQuery) ||
      note.body.toLowerCase().includes(lowercaseQuery) ||
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
    );
  }

  async getNotesByTags(tags: string[]): Promise<Note[]> {
    return Array.from(this.notes.values()).filter(note =>
      note.tags && tags.some(tag => note.tags.includes(tag))
    );
  }

  // Sync Status
  async getSyncStatus(): Promise<SyncStatus | undefined> {
    return this.syncStatus;
  }

  async updateSyncStatus(updates: Partial<SyncStatus>): Promise<SyncStatus> {
    this.syncStatus = { 
      id: 1, 
      lastSyncTime: null, 
      totalNotes: 0, 
      storageUsed: "0 MB", 
      isConnected: false, 
      ...this.syncStatus, 
      ...updates 
    };
    return this.syncStatus;
  }
}

export const storage = new MemStorage();
