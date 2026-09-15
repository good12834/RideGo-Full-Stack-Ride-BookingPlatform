import { Router } from "express";
import { validatePromo } from "../controllers/promoController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);
router.post("/validate", validatePromo);

export default router;
