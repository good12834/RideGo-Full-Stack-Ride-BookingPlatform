import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function tryConnect(uri, options = {}) {
  mongoose.set("strictQuery", true);
  const conn = await mongoose.connect(uri, options);
  console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

export async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ridego";
  const canFallback = process.env.NODE_ENV !== "production";
  // In dev a missing DB is expected (we fall back to in-memory below) — don't
  // let mongoose retry the refused connection for the default 30s.
  const initialOptions = canFallback ? { serverSelectionTimeoutMS: 4_000 } : {};
  try {
    return await tryConnect(uri, initialOptions);
  } catch (err) {
    // No real MongoDB reachable. Outside production, fall back to an
    // in-memory MongoDB so the API boots with zero setup — same behavior as
    // `npm run dev:memory`, but it also covers direct launches like
    // `nodemon server.js` / `npm run dev --prefix backend`.
    if (!canFallback) {
      console.error("[db] MongoDB connection failed:", err.message);
      process.exit(1);
    }

    console.warn("[db] MongoDB not reachable, starting in-memory MongoDB:", err.message);
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri("ridego");
      process.env.MONGO_URI = memoryUri;
      console.log(`[memory] MongoDB ready at ${memoryUri}`);
      return await tryConnect(memoryUri);
    } catch (memoryErr) {
      console.error("[db] In-memory MongoDB connection failed:", memoryErr.message);
      process.exit(1);
    }
  }
}
