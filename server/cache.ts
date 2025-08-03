
import { getStore } from "@netlify/blobs";

// Cache helper functions
export async function getCachedNotes() {
  try {
    const store = getStore("notes-cache");
    const cachedData = await store.get("notes-data");
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (error) {
    console.log("Cache read failed:", error);
  }
  return null;
}

export async function setCachedNotes(notes: any[], syncStatus: any) {
  try {
    const store = getStore("notes-cache");
    const cacheData = {
      notes,
      syncStatus,
      timestamp: Date.now()
    };
    await store.set("notes-data", JSON.stringify(cacheData));
  } catch (error) {
    console.log("Cache write failed:", error);
  }
}

export async function isCacheValid() {
  const cached = await getCachedNotes();
  if (!cached) return false;
  
  // Cache is valid for 1 hour (3600000 ms)
  const cacheAge = Date.now() - cached.timestamp;
  return cacheAge < 3600000;
}
