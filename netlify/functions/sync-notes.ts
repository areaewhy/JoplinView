import { getNotes } from "../../server/routes";
import { getCachedNotes, setCachedNotes } from "../../server/cache";

// @ts-nocheck
// Netlify Scheduled Function: runs every hour
// See: https://docs.netlify.com/functions/scheduled-functions/

export const handler = async (event, context) => {
  // Your sync logic here (e.g., call your sync endpoint or logic directly)

  const [notes, status] = await getNotes();
  setCachedNotes(notes, status);

  // Optionally, you can log the sync status or any other information
  console.log("Notes synced successfully:", notes.length);

  return {
    statusCode: 200,
    body: "Sync completed",
  };
};

// This special comment tells Netlify to run this function on a schedule
export const config = {
  schedule: "@hourly",
};
