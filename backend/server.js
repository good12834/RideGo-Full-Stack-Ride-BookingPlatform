import express from "express";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import dotenv from "dotenv";
dotenv.config();
import { connectDB } from "./config/db.js";
import { initSocket } from "./socket/rideSocket.js";
import authRoutes from "./routes/authRoutes.js";
import rideRoutes from "./routes/rideRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import promoRoutes from "./routes/promoRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { expireStaleRides } from "./services/rideExpiry.js";
import { ensureProtectedAccounts, formatProtectedAccountReport } from "./utils/protectedAccounts.js";

const app = express();
const httpServer = http.createServer(app);
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5174",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
].filter(Boolean);
initSocket(httpServer, allowedOrigins);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ ok: true, name: "RideGo API", time: new Date() }));
app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/promos", promoRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// error handler
app.use((err, req, res, next) => {
  console.error("[error]", err.message);
  if (err.message?.includes("Only image files")) err.statusCode = 400;
  res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  // Create/heal the protected role accounts (one per role) before serving
  // traffic so a brand-new database is always immediately usable.
  try {
    const { created } = await ensureProtectedAccounts();
    const report = formatProtectedAccountReport(created);
    if (report) console.log(report);
    else console.log("[protected-accounts] protected role accounts verified");
  } catch (err) {
    console.error("[protected-accounts] failed:", err.message);
  }

  // Watchdog: periodically auto-cancel rides abandoned in a live status (they can
  // get stranded when a server restart wipes the in-memory dispatch timers, or
  // when no nearby driver matches). This keeps passengers from being permanently
  // blocked with a 409 when they try to book a new ride.
  const sweepMs = Math.max(5_000, Number(process.env.RIDE_EXPIRY_SWEEP_MS) || 60_000);
  setInterval(() => {
    expireStaleRides().catch((err) => console.error("[ride-expiry] sweep error:", err.message));
  }, sweepMs);

  httpServer.listen(PORT, () => {
    console.log(`[server] RideGo API listening on http://localhost:${PORT}`);
  });
});
