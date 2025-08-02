
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../../server/routes.js";
import serverless from "serverless-http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

let isInitialized = false;

// Create a wrapper that initializes routes on first request
const initializeApp = async () => {
  if (!isInitialized) {
    await registerRoutes(app);
    isInitialized = true;
  }
  return app;
};

export const handler = async (event: any, context: any) => {
  const initializedApp = await initializeApp();
  const serverlessHandler = serverless(initializedApp);
  return serverlessHandler(event, context);
};
