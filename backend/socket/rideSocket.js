import { Server } from "socket.io";
import { verifyToken } from "../utils/generateToken.js";
import Driver from "../models/Driver.js";
import Ride from "../models/Ride.js";

let io;

// userId -> Set<socketId>
const userSockets = new Map();

export function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Not authenticated"));
      const decoded = verifyToken(token);
      socket.data.userId = decoded.id;
      socket.data.role = decoded.role;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);
    socket.join(`user:${userId}`);

    console.log(`[socket] ${socket.data.role} ${userId} connected (${socket.id})`);

    // Admins can join the live-ops room to watch driver positions
    if (socket.data.role === "admin") {
      socket.join("admins:live");
    }

    socket.on("driver:location", async (payload) => {
      if (socket.data.role !== "driver") return;
      const { latitude, longitude } = payload || {};
      if (typeof latitude !== "number" || typeof longitude !== "number") return;

      const driver = await Driver.findOneAndUpdate(
        { userId },
        { currentLocation: { latitude, longitude, updatedAt: new Date() } },
        { new: true }
      ).select("_id isOnline");
      if (!driver?.isOnline) return;

      // Broadcast to live ops (admin map)
      io.to("admins:live").emit("driver:location", { driverId: userId, latitude, longitude });

      // Push to the passenger of any active ride with this driver
      const ride = await Ride.findOne({
        driverId: driver._id,
        status: { $in: ["DRIVER_ASSIGNED", "DRIVER_ARRIVING"] },
      })
        .select("_id passengerId")
        .lean();
      if (ride?.passengerId) {
        io.to(`user:${ride.passengerId}`).emit("ride:driverLocation", {
          rideId: ride._id,
          latitude,
          longitude,
        });
      }
    });

    socket.on("disconnect", () => {
      const set = userSockets.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(userId);
      }
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function isUserOnline(userId) {
  return userSockets.has(String(userId));
}

export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitToAdmins(event, payload) {
  if (!io) return;
  io.to("admins:live").emit(event, payload);
}

// Fan out a new ride request to nearby online drivers
export async function emitNewRideToNearbyDrivers(ride, passengerName = "") {
  if (!io) return 0;
  const MAX_KM = 6;
  const center = ride.pickup;

  const candidates = await Driver.find({
    isOnline: true,
    isApproved: true,
    status: "APPROVED",
  })
    .populate({ path: "userId", select: "name isBlocked", match: { isBlocked: { $ne: true } } })
    .lean();

  const toRad = (x) => (x * Math.PI) / 180;
  const nearby = candidates.filter((d) => {
    if (!d.userId) return false;
    const loc = d.currentLocation || {};
    if (!loc.latitude && !loc.longitude) return true; // unknown location: still eligible
    const R = 6371;
    const dLat = toRad(center.latitude - loc.latitude);
    const dLng = toRad(center.longitude - loc.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(loc.latitude)) * Math.cos(toRad(center.latitude)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a)) <= MAX_KM;
  });

  for (const driver of nearby) {
    emitToUser(driver.userId._id.toString(), "ride:newRequest", {
      rideId: ride._id,
      rideNumber: ride.rideNumber,
      passengerName,
      pickup: ride.pickup,
      destination: ride.destination,
      distance: ride.distance,
      duration: ride.duration,
      rideType: ride.rideType,
      estimatedFare: ride.fare,
      netToDriver: ride.netToDriver,
    });
  }
  return nearby.length;
}
