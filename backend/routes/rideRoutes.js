import { Router } from "express";
import {
  estimate,
  bookRide,
  acceptRide,
  rejectRide,
  updateStatus,
  getActiveRide,
  getRide,
  getHistory,
  cancelRide,
  rateRide,
  triggerEmergency,
  autoDispatchRide,
  simulateRideStep,
} from "../controllers/rideController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.post("/estimate", estimate);
router.post("/", bookRide);
router.get("/active", getActiveRide);
router.get("/history", getHistory);
router.get("/:id", getRide);
router.post("/:id/accept", acceptRide);
router.post("/:id/reject", rejectRide);
router.put("/:id/status", updateStatus);
router.post("/:id/cancel", cancelRide);
router.post("/:id/rate", rateRide);
router.post("/:id/emergency", triggerEmergency);
router.post("/:id/auto-dispatch", autoDispatchRide);
router.post("/:id/simulate-step", simulateRideStep);

export default router;
