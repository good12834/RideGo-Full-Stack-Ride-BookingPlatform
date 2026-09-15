import { Router } from "express";
import {
  createTicket,
  myTickets,
  myNotifications,
  markNotificationsRead,
} from "../controllers/supportController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.post("/", createTicket);
router.get("/mine", myTickets);
router.get("/notifications", myNotifications);
router.put("/notifications/read", markNotificationsRead);

export default router;
