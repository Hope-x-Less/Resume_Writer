/**
 * Lightweight error class that carries an HTTP status code
 * and an optional details payload for the client.
 */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}
