
import { startServer } from "../../server/index.js";

export default async function handler(request: Request, context: any) {
  // Initialize the server if not already done
  await startServer();
  
  // For Netlify functions, we need to handle the request differently
  // This is a basic wrapper - you may need to adapt based on your specific needs
  return new Response("Netlify function created", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
