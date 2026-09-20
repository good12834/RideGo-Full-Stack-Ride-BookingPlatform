// Starts a local in-memory MongoDB (no installation required), then boots the RideGo API.
// Used for zero-setup local development: `npm run dev:memory` or `node scripts/devMemory.js`
// If a MongoDB server is already listening on 127.0.0.1:27017 (e.g. a persistent
// local mongod used with MongoDB Compass), it is reused instead of starting a second instance.
import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn } from "child_process";
import net from "node:net";

const rawPort = Number(process.env.PORT);
const PORT = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 5000;

async function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host, port, timeout: 1500 });
    sock.on("connect", () => {
      sock.destroy();
      resolve(true);
    });
    sock.on("error", () => resolve(false));
  });
}

async function main() {
  let uri;
  let mongod = null;

  if (await isPortOpen("127.0.0.1", 27017)) {
    uri = "mongodb://127.0.0.1:27017/ridego";
    console.log(`[memory] MongoDB already listening on 127.0.0.1:27017 - reusing it: ${uri}`);
  } else {
    console.log("[memory] Starting in-memory MongoDB...");
    mongod = await MongoMemoryServer.create({
      instance: { port: 27017, ip: "127.0.0.1" },
    });
    uri = mongod.getUri("ridego");
    console.log(`[memory] MongoDB ready at ${uri}`);
  }

  // `--watch` is a dev convenience; in production (e.g. Render) run the plain
  // server so the process stays stable and doesn't restart on file events.
  const watch = process.env.NODE_ENV !== "production";
  const child = spawn(process.execPath, watch ? ["--watch", "server.js"] : ["server.js"], {
    stdio: "inherit",
    env: { ...process.env, MONGO_URI: uri, PORT: String(PORT) },
  });

  const cleanup = () => {
    child.kill();
    mongod?.stop();
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  child.on("exit", (code) => {
    mongod?.stop();
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error("[memory] failed:", err);
  process.exit(1);
});
