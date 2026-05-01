import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateRouter } from "./routes/generate.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

export function createApp() {
  const app = express();

  // CORS - allow the frontend to call this API.
  // Set CORS_ORIGIN to a comma-separated list of allowed origins, or "*" for any.
  const corsOrigin = process.env.CORS_ORIGIN ?? "*";
  const origin =
    corsOrigin === "*"
      ? "*"
      : corsOrigin.split(",").map((o) => o.trim()).filter(Boolean);

  app.use(
    cors({
      origin,
      methods: ["GET", "POST", "OPTIONS"],
    })
  );

  // Body parsing
  app.use(express.json({ limit: "1mb" }));

  // Static frontend - serves the resume generator UI from /public.
  // The default index.html is served at "/" automatically.
  app.use(
    express.static(PUBLIC_DIR, {
      index: "index.html",
      extensions: ["html"],
      maxAge: "1h",
    })
  );

  // JSON health check (kept off "/" so the homepage can serve the UI).
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // API routes
  app.use("/generate", generateRouter);

  // 404 + error handlers (must come last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
