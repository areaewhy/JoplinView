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

// Register all the API routes
await registerRoutes(app);

export const handler = serverless(app);