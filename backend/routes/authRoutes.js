import { Router } from "express";
import { register, login, me, updateMe, logout } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.put("/me", protect, updateMe);
router.post("/logout", protect, logout);

export default router;
