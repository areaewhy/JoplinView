import { getNotes } from "../../server/routes";
import { getCachedNotes, setCachedNotes } from "../../server/cache";
import type { Config } from "@netlify/functions";

export default async (req: Request) => {
  const [notes, status] = await getNotes();
  setCachedNotes(notes, status);

  // Optionally, you can log the sync status or any other information
  console.log("Notes synced successfully:", notes.length);

  const { next_run } = await req.json();

  console.log("Received event! Next invocation at:", next_run);
};

// This special comment tells Netlify to run this function on a schedule
export const config: Config = {
  schedule: "@hourly",
};
