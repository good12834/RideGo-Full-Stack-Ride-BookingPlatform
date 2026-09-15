import SupportTicket from "../models/SupportTicket.js";

// POST /api/support  { subject, message, category, rideId }
export async function createTicket(req, res) {
  try {
    const { subject, message, category, rideId } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: "subject and message are required" });
    }

    const ticket = await SupportTicket.create({
      userId: req.user._id,
      rideId: rideId || null,
      subject,
      message,
      category: ["GENERAL", "RIDE_ISSUE", "PAYMENT", "SAFETY", "LOST_ITEM"].includes(category)
        ? category
        : "GENERAL",
    });

    res.status(201).json({ ticket });
  } catch (err) {
    res.status(500).json({ message: "Could not create ticket", error: err.message });
  }
}

// GET /api/support/mine
export async function myTickets(req, res) {
  const tickets = await SupportTicket.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ tickets });
}

// GET /api/support/notifications
export async function myNotifications(req, res) {
  const Notification = (await import("../models/Notification.js")).default;
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  res.json({ notifications });
}

// PUT /api/support/notifications/read
export async function markNotificationsRead(req, res) {
  const Notification = (await import("../models/Notification.js")).default;
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ message: "All notifications marked read" });
}
