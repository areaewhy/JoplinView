import { notes, syncStatus, type Note, type InsertNote, type SyncStatus } from "@shared/schema";

export interface IStorage {
  // Notes
  getAllNotes(): Promise<Note[]>;
  getNoteById(id: number): Promise<Note | undefined>;
  getNoteByJoplinId(joplinId: string): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: number): Promise<void>;
  deleteAllNotes(): Promise<void>;
  searchNotes(query: string): Promise<Note[]>;
  
  // Sync Status
  getSyncStatus(): Promise<SyncStatus | undefined>;
  updateSyncStatus(status: Partial<SyncStatus>): Promise<SyncStatus>;
}

export class MemStorage implements IStorage {
  private notes: Map<number, Note>;
  private syncStatus: SyncStatus | undefined;
  private currentNoteId: number;

  constructor() {
    this.notes = new Map();
    this.currentNoteId = 1;
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
      due: insertNote.due || null,
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
      (note.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
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
