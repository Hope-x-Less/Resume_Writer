import "./config/env.js";
import { createApp } from "./app.js";
import { logAiConfigOnce } from "./services/aiService.js";

const START_PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const MAX_PORT_SEARCH = 100; // try up to START_PORT + 99

const app = createApp();

function tryListen(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, HOST, () => resolve({ server, port }));
    server.on("error", (err) => reject(err));
  });
}

async function startServer() {
  logAiConfigOnce();

  let port = START_PORT;
  for (let attempt = 0; attempt < MAX_PORT_SEARCH; attempt++, port++) {
    try {
      console.log(`[server] Attempting to listen on ${port}...`);
      const { server, port: boundPort } = await tryListen(port);

      const displayHost = "localhost";
      console.log(
        `[server] Server running at http://${displayHost}:${boundPort}`,
      );

      // Helpful debug info
      console.log(`[server] Bound to ${HOST}:${boundPort}`);

      // Ensure process does not exit on server errors; log and keep running.
      server.on("error", (err) => {
        console.error("[server] Server error:", err);
      });

      return;
    } catch (err) {
      if (err && err.code === "EADDRINUSE") {
        console.warn(`[server] Port ${port} in use, trying another port...`);
        // continue to next port
        continue;
      }

      console.error("[server] Failed to start server:", err);
      // For non-port errors, rethrow so the process exits (helpful during dev)
      throw err;
    }
  }

  throw new Error(`No available ports found in range ${START_PORT}-${START_PORT + MAX_PORT_SEARCH - 1}`);
}

startServer().catch((err) => {
  console.error("[server] Startup error, exiting:", err);
  process.exit(1);
});
