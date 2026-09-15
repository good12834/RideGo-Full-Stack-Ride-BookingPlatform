import Driver from "../models/Driver.js";
import Vehicle from "../models/Vehicle.js";
import Rating from "../models/Rating.js";
import Ride from "../models/Ride.js";
import User from "../models/User.js";
import { uploadImage, cloudinaryEnabled } from "../utils/cloudinary.js";
import { emitToAdmins } from "../socket/rideSocket.js";

// GET /api/driver/profile
export async function getProfile(req, res) {
  const driver = await Driver.findOne({ userId: req.user._id });
  if (!driver) return res.status(404).json({ message: "Driver profile not found" });
  const vehicles = await Vehicle.find({ driverId: driver._id });
  const user = await User.findById(req.user._id).select("-password");
  res.json({ driver, vehicles, user });
}

// PUT /api/driver/profile
export async function updateProfile(req, res) {
  const driver = await Driver.findOne({ userId: req.user._id });
  if (!driver) return res.status(404).json({ message: "Driver profile not found" });

  const allowed = ["licenseNumber"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) driver[key] = req.body[key];
  }
  await driver.save();
  res.json({ driver });
}

// PUT /api/driver/status  { isOnline: true|false }
export async function setStatus(req, res) {
  const driver = await Driver.findOne({ userId: req.user._id });
  if (!driver) return res.status(404).json({ message: "Driver profile not found" });

  if (typeof req.body.isOnline === "boolean") {
    if (req.body.isOnline && driver.status !== "APPROVED") {
      return res.status(403).json({ message: "Your account must be approved before going online" });
    }
    driver.isOnline = req.body.isOnline;
    await driver.save();
  }
  res.json({ driver });
}

// PUT /api/driver/location  { latitude, longitude }
export async function updateLocation(req, res) {
  const { latitude, longitude } = req.body;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ message: "latitude and longitude are required numbers" });
  }
  const driver = await Driver.findOneAndUpdate(
    { userId: req.user._id },
    { currentLocation: { latitude, longitude, updatedAt: new Date() } },
    { new: true }
  );
  if (!driver) return res.status(404).json({ message: "Driver profile not found" });
  res.json({ location: driver.currentLocation });
}

// POST /api/driver/vehicles  (multipart: image optional)
export async function addVehicle(req, res) {
  const driver = await Driver.findOne({ userId: req.user._id });
  if (!driver) return res.status(404).json({ message: "Driver profile not found" });

  const { make, model, year, color, plateNumber, vehicleType } = req.body;
  if (!make || !model || !year || !color || !plateNumber) {
    return res.status(400).json({ message: "make, model, year, color and plateNumber are required" });
  }

  let image = "";
  if (req.file) {
    if (cloudinaryEnabled) {
      const result = await uploadImage(req.file.buffer, "ridego/vehicles");
      if (result) image = result.secure_url;
    } else {
      console.log("[cloudinary] Not configured — skipping vehicle image upload");
    }
  }

  const existingCount = await Vehicle.countDocuments({ driverId: driver._id });
  const vehicle = await Vehicle.create({
    driverId: driver._id,
    make,
    model,
    year: Number(year),
    color,
    plateNumber: plateNumber.toUpperCase(),
    vehicleType: ["economy", "comfort", "xl"].includes(vehicleType) ? vehicleType : "economy",
    image,
    isDefault: existingCount === 0,
  });

  res.status(201).json({ vehicle });
}

// DELETE /api/driver/vehicles/:id
export async function removeVehicle(req, res) {
  const driver = await Driver.findOne({ userId: req.user._id });
  if (!driver) return res.status(404).json({ message: "Driver profile not found" });

  const vehicle = await Vehicle.findOne({ _id: req.params.id, driverId: driver._id });
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

  await vehicle.deleteOne();
  res.json({ message: "Vehicle removed" });
}

// GET /api/driver/earnings?range=week|month
export async function getEarnings(req, res) {
  const driver = await Driver.findOne({ userId: req.user._id });
  if (!driver) return res.status(404).json({ message: "Driver profile not found" });

  const range = req.query.range === "month" ? "month" : "week";
  const now = new Date();
  const start = new Date(now);
  if (range === "week") {
    const day = (now.getDay() + 6) % 7; // Monday first
    start.setDate(now.getDate() - day);
  } else {
    start.setDate(1);
  }
  start.setHours(0, 0, 0, 0);

  const rides = await Ride.find({
    driverId: driver._id,
    status: { $in: ["TRIP_COMPLETED", "PAYMENT_COMPLETED"] },
    completedAt: { $gte: start },
  })
    .select("fare netToDriver completedAt rideType")
    .sort({ completedAt: 1 })
    .lean();

  const gross = rides.reduce((s, r) => s + (r.fare || 0), 0);
  const net = rides.reduce((s, r) => s + (r.netToDriver || 0), 0);
  const byDay = {};
  for (let i = 0; i < (range === "week" ? 7 : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()); i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    byDay[d.toISOString().slice(0, 10)] = 0;
  }
  for (const r of rides) {
    const key = r.completedAt ? new Date(r.completedAt).toISOString().slice(0, 10) : null;
    if (key && key in byDay) byDay[key] += r.netToDriver || 0;
  }

  res.json({
    range,
    gross: Math.round(gross * 100) / 100,
    net: Math.round(net * 100) / 100,
    trips: rides.length,
    byDay: Object.entries(byDay).map(([date, amount]) => ({
      date,
      label: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      amount: Math.round(amount * 100) / 100,
    })),
    lifetime: { totalTrips: driver.totalTrips, totalEarnings: driver.totalEarnings, rating: driver.rating },
  });
}

// GET /api/driver/ratings
export async function getRatings(req, res) {
  const driver = await Driver.findOne({ userId: req.user._id });
  if (!driver) return res.status(404).json({ message: "Driver profile not found" });

  const ratings = await Rating.find({ driverId: driver._id })
    .populate("passengerId", "name avatar")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({ ratings, average: driver.rating, count: driver.ratingCount });
}

// PUT /api/driver/location-broadcast — called after Ride status changes
export async function broadcastDriverStatus(driverId) {
  const driver = await Driver.findById(driverId).select("isOnline userId currentLocation");
  if (driver) {
    emitToAdmins("driver:status", {
      driverId: driver.userId?.toString(),
      isOnline: driver.isOnline,
      location: driver.currentLocation,
    });
  }
}
