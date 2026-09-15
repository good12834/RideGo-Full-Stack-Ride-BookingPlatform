import { Router } from "express";
import { handleAiCopilot, predictFareAndTraffic, performSafetyScan, getDriverHotspots } from "../services/aiService.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();

// Optional user extractor middleware
async function optionalUser(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      const token = auth.slice(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "ridego_local_dev_secret_2026");
      const user = await User.findById(decoded.id).select("-password");
      if (user && !user.isBlocked) req.user = user;
    }
  } catch {
    // optional, do not block
  }
  next();
}

// POST /api/ai/copilot
router.post("/copilot", optionalUser, async (req, res) => {
  try {
    const { message, history, context } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Message string is required" });
    }
    const result = await handleAiCopilot({
      message,
      history: history || [],
      context: context || {},
      user: req.user || null,
    });
    res.json(result);
  } catch (err) {
    console.error("[ai/copilot]", err);
    res.status(500).json({ message: "AI processing failed", error: err.message });
  }
});

// POST /api/ai/predict-fare
router.post("/predict-fare", async (req, res) => {
  try {
    const { pickup, destination, rideType } = req.body;
    const result = await predictFareAndTraffic({ pickup, destination, rideType });
    res.json(result);
  } catch (err) {
    console.error("[ai/predict-fare]", err);
    res.status(400).json({ message: err.message || "Failed to predict fare" });
  }
});

// POST /api/ai/safety-scan
router.post("/safety-scan", async (req, res) => {
  try {
    const { rideId, currentLat, currentLng, pickup, destination, rideStatus } = req.body;
    const result = await performSafetyScan({ rideId, currentLat, currentLng, pickup, destination, rideStatus });
    res.json(result);
  } catch (err) {
    console.error("[ai/safety-scan]", err);
    res.status(500).json({ message: "Safety scan failed", error: err.message });
  }
});

// GET /api/ai/driver-hotspots
router.get("/driver-hotspots", async (req, res) => {
  try {
    const result = await getDriverHotspots();
    res.json(result);
  } catch (err) {
    console.error("[ai/driver-hotspots]", err);
    res.status(500).json({ message: "Failed to fetch AI hotspots", error: err.message });
  }
});

export default router;
