
import { createApp } from "../../server/index.js";
import { registerRoutes } from "../../server/routes.js";

let app: any = null;

export default async function handler(request: Request, context: any) {
  // Initialize the Express app once
  if (!app) {
    app = createApp();
    await registerRoutes(app);
  }
  
  // Convert Netlify Request to Express-compatible request
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // Create a mock Express request/response for the serverless function
  const mockReq = {
    method,
    path,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.json().catch(() => ({})) : {},
    query: Object.fromEntries(url.searchParams.entries()),
  };
  
  const mockRes = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: '',
    status: function(code: number) {
      this.statusCode = code;
      return this;
    },
    json: function(data: any) {
      this.headers['Content-Type'] = 'application/json';
      this.body = JSON.stringify(data);
      return this;
    },
    send: function(data: any) {
      this.body = data;
      return this;
    },
    set: function(headers: Record<string, string>) {
      Object.assign(this.headers, headers);
      return this;
    }
  };
  
  // Handle the request through Express routes
  return new Promise((resolve) => {
    // This is a simplified approach - you may need a more robust Express-to-serverless adapter
    app(mockReq, mockRes, () => {
      resolve(new Response(mockRes.body, {
        status: mockRes.statusCode,
        headers: mockRes.headers,
      }));
    });
  });
}
