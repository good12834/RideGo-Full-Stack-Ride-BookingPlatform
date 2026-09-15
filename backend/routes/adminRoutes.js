import { Router } from "express";
import {
  getStats,
  listUsers,
  blockUser,
  listDrivers,
  approveDriver,
  rejectDriver,
  suspendDriver,
  listRides,
  adminCancelRide,
  listPayments,
  listPromos,
  createPromo,
  updatePromo,
  deletePromo,
  listTickets,
  updateTicket,
  getAnalytics,
} from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = Router();

router.use(protect, adminOnly);

router.get("/stats", getStats);
router.get("/users", listUsers);
router.put("/users/:id/block", blockUser);
router.get("/drivers", listDrivers);
router.put("/drivers/:id/approve", approveDriver);
router.put("/drivers/:id/reject", rejectDriver);
router.put("/drivers/:id/suspend", suspendDriver);
router.get("/rides", listRides);
router.put("/rides/:id/cancel", adminCancelRide);
router.get("/payments", listPayments);
router.get("/promos", listPromos);
router.post("/promos", createPromo);
router.put("/promos/:id", updatePromo);
router.delete("/promos/:id", deletePromo);
router.get("/tickets", listTickets);
router.put("/tickets/:id", updateTicket);
router.get("/analytics", getAnalytics);

export default router;
