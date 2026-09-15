import { Router } from "express";
import {
  getProfile,
  updateProfile,
  setStatus,
  updateLocation,
  addVehicle,
  removeVehicle,
  getEarnings,
  getRatings,
} from "../controllers/driverController.js";
import { protect, driverOnly } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = Router();
router.use(protect, driverOnly);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/status", setStatus);
router.put("/location", updateLocation);
router.post("/vehicles", upload.single("image"), addVehicle);
router.delete("/vehicles/:id", removeVehicle);
router.get("/earnings", getEarnings);
router.get("/ratings", getRatings);

export default router;
