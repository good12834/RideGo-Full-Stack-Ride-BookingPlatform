import { Router } from "express";
import {
  payForRide,
  topUpWallet,
  getPayments,
  getStripeConfig,
  createStripeIntent,
  confirmStripePayment,
  createStripeTopupIntent,
  confirmStripeTopup,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Public / Protected Stripe config
router.get("/stripe/config", getStripeConfig);

// Protected routes
router.use(protect);

router.post("/pay", payForRide);
router.post("/wallet/topup", topUpWallet);
router.get("/", getPayments);

// Stripe endpoints
router.post("/stripe/create-intent", createStripeIntent);
router.post("/stripe/confirm", confirmStripePayment);
router.post("/stripe/topup-intent", createStripeTopupIntent);
router.post("/stripe/confirm-topup", confirmStripeTopup);

export default router;
