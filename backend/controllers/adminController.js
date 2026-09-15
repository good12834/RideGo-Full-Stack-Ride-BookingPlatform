import Ride from "../models/Ride.js";
import Driver from "../models/Driver.js";
import Vehicle from "../models/Vehicle.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import PromoCode from "../models/PromoCode.js";
import SupportTicket from "../models/SupportTicket.js";
import AdminLog from "../models/AdminLog.js";
import Notification from "../models/Notification.js";
import { emitToUser } from "../socket/rideSocket.js";

async function log(adminId, action, targetType = "", targetId = null, meta = {}) {
  try {
    await AdminLog.create({ adminId, action, targetType, targetId, meta });
  } catch (err) {
    console.error("[adminlog]", err.message);
  }
}

// GET /api/admin/stats
export async function getStats(req, res) {
  const [users, drivers, rides, revenueAgg, openTickets, pendingDrivers] = await Promise.all([
    User.countDocuments({ role: { $ne: "admin" } }),
    Driver.countDocuments(),
    Ride.countDocuments(),
    Payment.aggregate([
      { $match: { status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" }, commission: { $sum: "$commission" } } },
    ]),
    SupportTicket.countDocuments({ status: { $in: ["OPEN", "IN_REVIEW"] } }),
    Driver.countDocuments({ status: "PENDING" }),
  ]);

  res.json({
    users,
    drivers,
    rides,
    revenue: revenueAgg[0]?.total || 0,
    commission: revenueAgg[0]?.commission || 0,
    openTickets,
    pendingDrivers,
  });
}

// GET /api/admin/users?search=&role=&page=
export async function listUsers(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const filter = {};

  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).select("-password").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ users, total, page, pages: Math.ceil(total / limit) });
}

// PUT /api/admin/users/:id/block
export async function blockUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.role === "admin") return res.status(403).json({ message: "Cannot block an admin" });

  user.isBlocked = !user.isBlocked;
  await user.save();
  await log(req.user._id, user.isBlocked ? "BLOCK_USER" : "UNBLOCK_USER", "User", user._id);
  res.json({ user: { id: user._id, isBlocked: user.isBlocked } });
}

// GET /api/admin/drivers?status=
export async function listDrivers(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const drivers = await Driver.find(filter)
    .populate("userId", "name email phone avatar isBlocked createdAt")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const vehicleDocs = await Vehicle.find({
    driverId: { $in: drivers.map((d) => d._id) },
  }).lean();
  const byDriver = {};
  for (const v of vehicleDocs) {
    (byDriver[v.driverId] ||= []).push(v);
  }
  for (const d of drivers) d.vehicles = byDriver[d._id] || [];

  res.json({ drivers });
}

// PUT /api/admin/drivers/:id/approve
export async function approveDriver(req, res) {
  const driver = await Driver.findById(req.params.id);
  if (!driver) return res.status(404).json({ message: "Driver not found" });

  driver.status = "APPROVED";
  driver.isApproved = true;
  driver.approvedAt = new Date();
  driver.rejectionReason = "";
  await driver.save();

  await log(req.user._id, "APPROVE_DRIVER", "Driver", driver._id);
  await notifyUser(driver.userId, "DRIVER_APPROVED", "You're approved!", "Your driver account has been approved. You can now go online.");
  res.json({ driver });
}

// PUT /api/admin/drivers/:id/reject
export async function rejectDriver(req, res) {
  const driver = await Driver.findById(req.params.id);
  if (!driver) return res.status(404).json({ message: "Driver not found" });

  driver.status = "REJECTED";
  driver.isApproved = false;
  driver.isOnline = false;
  driver.rejectionReason = req.body.reason || "Does not meet requirements";
  await driver.save();

  await log(req.user._id, "REJECT_DRIVER", "Driver", driver._id, { reason: driver.rejectionReason });
  await notifyUser(driver.userId, "SYSTEM", "Driver application rejected", driver.rejectionReason);
  res.json({ driver });
}

// PUT /api/admin/drivers/:id/suspend
export async function suspendDriver(req, res) {
  const driver = await Driver.findById(req.params.id);
  if (!driver) return res.status(404).json({ message: "Driver not found" });

  driver.status = "SUSPENDED";
  driver.isOnline = false;
  await driver.save();

  await log(req.user._id, "SUSPEND_DRIVER", "Driver", driver._id);
  res.json({ driver });
}

async function notifyUser(userId, type, title, body) {
  try {
    emitToUser(userId, "notification", { type, title, body });
    await Notification.create({ userId, type, title, body });
  } catch (err) {
    console.error("[notify]", err.message);
  }
}

// GET /api/admin/rides?status=&page=
export async function listRides(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [rides, total] = await Promise.all([
    Ride.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("passengerId", "name")
      .populate({ path: "driverId", populate: { path: "userId", select: "name" } })
      .lean(),
    Ride.countDocuments(filter),
  ]);
  res.json({ rides, total, page, pages: Math.ceil(total / limit) });
}

// PUT /api/admin/rides/:id/cancel — force cancel
export async function adminCancelRide(req, res) {
  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ message: "Ride not found" });
  if (["CANCELLED", "PAYMENT_COMPLETED"].includes(ride.status)) {
    return res.status(400).json({ message: `Ride already ${ride.status}` });
  }

  ride.status = "CANCELLED";
  ride.cancelledBy = "admin";
  ride.cancelReason = req.body.reason || "Cancelled by administrator";
  ride.statusHistory.push({ status: "CANCELLED", by: req.user._id });
  await ride.save();

  await log(req.user._id, "CANCEL_RIDE", "Ride", ride._id, { reason: ride.cancelReason });
  res.json({ ride });
}

// GET /api/admin/payments
export async function listPayments(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);

  const [payments, total] = await Promise.all([
    Payment.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("passengerId", "name")
      .populate("rideId", "rideNumber")
      .lean(),
    Payment.countDocuments({}),
  ]);
  res.json({ payments, total, page, pages: Math.ceil(total / limit) });
}

// GET /api/admin/promos
export async function listPromos(req, res) {
  const promos = await PromoCode.find({}).sort({ createdAt: -1 }).lean();
  res.json({ promos });
}

// POST /api/admin/promos
export async function createPromo(req, res) {
  try {
    const { code, discountType, discountValue, maxUses, expiresAt } = req.body;
    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ message: "code, discountType and discountValue are required" });
    }
    const promo = await PromoCode.create({
      code: String(code).toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      maxUses: Number(maxUses) || 1000,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy: req.user._id,
    });
    await log(req.user._id, "CREATE_PROMO", "PromoCode", promo._id, { code: promo.code });
    res.status(201).json({ promo });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Promo code already exists" });
    res.status(500).json({ message: "Create failed", error: err.message });
  }
}

// PUT /api/admin/promos/:id
export async function updatePromo(req, res) {
  const promo = await PromoCode.findById(req.params.id);
  if (!promo) return res.status(404).json({ message: "Promo not found" });

  const allowed = ["active", "discountType", "discountValue", "maxUses", "expiresAt"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) promo[key] = req.body[key];
  }
  await promo.save();
  await log(req.user._id, "UPDATE_PROMO", "PromoCode", promo._id);
  res.json({ promo });
}

// DELETE /api/admin/promos/:id
export async function deletePromo(req, res) {
  const promo = await PromoCode.findById(req.params.id);
  if (!promo) return res.status(404).json({ message: "Promo not found" });
  await promo.deleteOne();
  await log(req.user._id, "DELETE_PROMO", "PromoCode", promo._id);
  res.json({ message: "Promo deleted" });
}

// GET /api/admin/tickets
export async function listTickets(req, res) {
  const tickets = await SupportTicket.find({})
    .populate("userId", "name email")
    .populate("rideId", "rideNumber")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({ tickets });
}

// PUT /api/admin/tickets/:id
export async function updateTicket(req, res) {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  const { status, response } = req.body;
  if (status) ticket.status = status;
  if (response !== undefined) {
    ticket.response = response;
    ticket.resolvedBy = req.user._id;
  }
  await ticket.save();

  await emitToUser(ticket.userId.toString(), "notification", {
    type: "SYSTEM",
    title: `Ticket ${ticket.status}`,
    body: response || "Your ticket has been updated.",
  });
  await log(req.user._id, "UPDATE_TICKET", "SupportTicket", ticket._id, { status: ticket.status });
  res.json({ ticket });
}

// GET /api/admin/analytics
export async function getAnalytics(req, res) {
  const days = Math.min(90, parseInt(req.query.days) || 14);
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const ridesByDay = await Ride.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
        revenue: { $sum: "$fare" },
        completed: { $sum: { $cond: [{ $in: ["$status", ["TRIP_COMPLETED", "PAYMENT_COMPLETED"]] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const byRideType = await Ride.aggregate([
    { $group: { _id: "$rideType", count: { $sum: 1 }, revenue: { $sum: "$fare" } } },
  ]);

  const topDrivers = await Driver.find({ totalTrips: { $gt: 0 } })
    .sort({ totalEarnings: -1 })
    .limit(5)
    .populate("userId", "name")
    .select("rating totalTrips totalEarnings userId")
    .lean();

  const statusCounts = await Ride.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);

  res.json({ ridesByDay, byRideType, topDrivers, statusCounts, days });
}
