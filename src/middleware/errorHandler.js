import { HttpError } from "../utils/httpError.js";

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  // Body parser JSON syntax errors
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body." });
  }

  if (err instanceof HttpError) {
    const payload = { error: err.message };
    if (err.details !== undefined) payload.details = err.details;
    return res.status(err.status).json(payload);
  }

  console.error("[errorHandler] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
}
