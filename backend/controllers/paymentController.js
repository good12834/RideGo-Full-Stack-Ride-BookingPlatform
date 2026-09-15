import Ride from "../models/Ride.js";
import Payment from "../models/Payment.js";
import Driver from "../models/Driver.js";
import User from "../models/User.js";
import { emitToUser, emitToAdmins } from "../socket/rideSocket.js";
import {
  getStripeConfig as getStripeConfigService,
  createRidePaymentIntent,
  createWalletTopupIntent,
  verifyPaymentIntent,
} from "../services/stripeService.js";

function randomRef(prefix = "TXN") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// GET /api/payments/stripe/config
export function getStripeConfig(req, res) {
  try {
    const config = getStripeConfigService();
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: "Failed to load Stripe config", error: err.message });
  }
}

// POST /api/payments/stripe/create-intent  { rideId }
export async function createStripeIntent(req, res) {
  try {
    const { rideId } = req.body;
    if (!rideId) return res.status(400).json({ message: "rideId is required" });

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    if (ride.passengerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not your ride" });
    }

    if (ride.paymentStatus === "PAID") {
      return res.status(409).json({ message: "Ride already paid" });
    }

    // Server-enforced secure amount
    const intent = await createRidePaymentIntent({
      rideId: ride._id,
      amount: ride.fare,
      passengerEmail: req.user.email,
      rideNumber: ride.rideNumber,
    });

    res.json(intent);
  } catch (err) {
    console.error("[stripe/create-intent]", err);
    res.status(500).json({ message: "Failed to create Stripe payment intent", error: err.message });
  }
}

// POST /api/payments/stripe/confirm  { rideId, paymentIntentId, cardBrand, cardLast4 }
export async function confirmStripePayment(req, res) {
  try {
    const { rideId, paymentIntentId, cardBrand, cardLast4 } = req.body;
    if (!rideId || !paymentIntentId) {
      return res.status(400).json({ message: "rideId and paymentIntentId are required" });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    if (ride.passengerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not your ride" });
    }

    if (ride.paymentStatus === "PAID") {
      return res.status(409).json({ message: "Ride already paid" });
    }

    // Verify payment with Stripe
    const verification = await verifyPaymentIntent(paymentIntentId);
    if (!verification.succeeded) {
      return res.status(400).json({ message: `Payment intent status: ${verification.status}` });
    }

    let payment = await Payment.findOne({ rideId: ride._id });
    const brand = cardBrand || verification.cardBrand || "Visa";
    const last4 = cardLast4 || verification.cardLast4 || "4242";

    if (!payment) {
      payment = await Payment.create({
        rideId: ride._id,
        passengerId: req.user._id,
        driverId: ride.driverId,
        amount: ride.fare,
        commission: ride.commission,
        netToDriver: ride.netToDriver,
        method: "card",
        status: "PAID",
        cardBrand: brand,
        cardLast4: last4,
        transactionRef: paymentIntentId,
        paidAt: new Date(),
      });
    } else {
      payment.method = "card";
      payment.status = "PAID";
      payment.cardBrand = brand;
      payment.cardLast4 = last4;
      payment.transactionRef = paymentIntentId;
      payment.paidAt = new Date();
      await payment.save();
    }

    ride.paymentStatus = "PAID";
    ride.status = "PAYMENT_COMPLETED";
    ride.statusHistory.push({ status: "PAYMENT_COMPLETED" });
    await ride.save();

    // credit driver net earnings
    if (ride.driverId) {
      const driver = await Driver.findById(ride.driverId);
      if (driver) {
        driver.totalEarnings += ride.netToDriver;
        await driver.save();
        emitToUser(driver.userId.toString(), "payment:received", { rideId: ride._id, amount: ride.netToDriver });
      }
    }

    emitToUser(ride.passengerId.toString(), "payment:completed", { rideId: ride._id, amount: ride.fare });
    emitToAdmins("payment:completed", { rideId: ride._id, amount: ride.fare, method: "stripe" });

    res.json({ payment, ride, message: "Stripe payment verified and processed successfully" });
  } catch (err) {
    console.error("[stripe/confirm]", err);
    res.status(500).json({ message: "Stripe payment confirmation failed", error: err.message });
  }
}

// POST /api/payments/stripe/topup-intent  { amount }
export async function createStripeTopupIntent(req, res) {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount < 1 || amount > 10000) {
      return res.status(400).json({ message: "Amount must be between $1.00 and $10,000.00" });
    }

    const intent = await createWalletTopupIntent({
      userId: req.user._id,
      amount,
      userEmail: req.user.email,
    });

    res.json(intent);
  } catch (err) {
    console.error("[stripe/topup-intent]", err);
    res.status(500).json({ message: "Failed to create topup intent", error: err.message });
  }
}

// POST /api/payments/stripe/confirm-topup  { paymentIntentId, amount }
export async function confirmStripeTopup(req, res) {
  try {
    const { paymentIntentId, amount } = req.body;
    if (!paymentIntentId) return res.status(400).json({ message: "paymentIntentId is required" });

    const verification = await verifyPaymentIntent(paymentIntentId);
    if (!verification.succeeded) {
      return res.status(400).json({ message: `Payment not completed (status: ${verification.status})` });
    }

    // Use the amount verified by Stripe when available; only trust the client
    // amount for simulated/demo intents where Stripe has no record.
    const verifiedAmount = Number(verification.amount) > 0 ? verification.amount : 0;
    const topupAmount = verifiedAmount || Number(amount) || 0;
    if (topupAmount <= 0) return res.status(400).json({ message: "Invalid topup amount" });
    if (verifiedAmount > 0 && Math.abs(verifiedAmount - Number(amount)) > 0.01) {
      console.warn(`[stripe/confirm-topup] Amount mismatch — client ${amount} vs Stripe ${verifiedAmount}; using Stripe amount`);
    }

    req.user.walletBalance += Math.round(topupAmount * 100) / 100;
    await req.user.save();

    res.json({
      walletBalance: req.user.walletBalance,
      amountAdded: topupAmount,
      transactionRef: paymentIntentId,
      message: `Successfully topped up $${topupAmount.toFixed(2)} via Stripe`,
    });
  } catch (err) {
    console.error("[stripe/confirm-topup]", err);
    res.status(500).json({ message: "Topup confirmation failed", error: err.message });
  }
}

// POST /api/payments/pay  { rideId, method, card?: { brand, last4 } }
export async function payForRide(req, res) {
  try {
    const { rideId, method, card } = req.body;
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    if (ride.passengerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not your ride" });
    }
    if (!["TRIP_COMPLETED"].includes(ride.status)) {
      return res.status(400).json({ message: `Ride is not awaiting payment (status: ${ride.status})` });
    }
    if (ride.paymentStatus === "PAID") {
      return res.status(409).json({ message: "Ride already paid" });
    }

    let payment = await Payment.findOne({ rideId: ride._id });

    if (method === "wallet") {
      if (req.user.walletBalance < ride.fare) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }
      req.user.walletBalance -= ride.fare;
      await req.user.save();
    }

    if (!payment) {
      payment = await Payment.create({
        rideId: ride._id,
        passengerId: req.user._id,
        driverId: ride.driverId,
        amount: ride.fare,
        commission: ride.commission,
        netToDriver: ride.netToDriver,
        method: ["cash", "card", "wallet"].includes(method) ? method : "cash",
        status: "PAID",
        cardBrand: card?.brand || "",
        cardLast4: card?.last4 || "", // only last4 stored — never raw numbers
        transactionRef: randomRef(),
        paidAt: new Date(),
      });
    } else {
      payment.method = ["cash", "card", "wallet"].includes(method) ? method : "cash";
      payment.status = "PAID";
      payment.cardBrand = card?.brand || payment.cardBrand;
      payment.cardLast4 = card?.last4 || payment.cardLast4;
      payment.transactionRef = payment.transactionRef || randomRef();
      payment.paidAt = new Date();
      await payment.save();
    }

    ride.paymentStatus = "PAID";
    ride.status = "PAYMENT_COMPLETED";
    ride.statusHistory.push({ status: "PAYMENT_COMPLETED" });
    await ride.save();

    // credit driver net earnings
    if (ride.driverId) {
      const driver = await Driver.findById(ride.driverId);
      if (driver) {
        driver.totalEarnings += ride.netToDriver;
        await driver.save();
        emitToUser(driver.userId.toString(), "payment:received", { rideId: ride._id, amount: ride.netToDriver });
      }
    }

    emitToUser(ride.passengerId.toString(), "payment:completed", { rideId: ride._id, amount: ride.fare });
    emitToAdmins("payment:completed", { rideId: ride._id, amount: ride.fare });

    res.json({ payment, ride });
  } catch (err) {
    res.status(500).json({ message: "Payment failed", error: err.message });
  }
}

// POST /api/payments/wallet/topup  { amount }
export async function topUpWallet(req, res) {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0 || amount > 10000) {
      return res.status(400).json({ message: "amount must be between 1 and 10000" });
    }
    req.user.walletBalance += Math.round(amount * 100) / 100;
    await req.user.save();
    res.json({ walletBalance: req.user.walletBalance });
  } catch (err) {
    res.status(500).json({ message: "Top-up failed", error: err.message });
  }
}

// GET /api/payments
export async function getPayments(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const filter = { passengerId: req.user._id };

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("rideId", "rideNumber pickup destination")
      .lean(),
    Payment.countDocuments(filter),
  ]);

  res.json({ payments, total, page, pages: Math.ceil(total / limit) });
}
