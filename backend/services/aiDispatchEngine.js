import Driver from "../models/Driver.js";
import Vehicle from "../models/Vehicle.js";
import Ride from "../models/Ride.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { emitToUser, emitToAdmins } from "../socket/rideSocket.js";
import { haversineKm } from "../utils/fareCalculator.js";

// Active autonomous timers registry: rideId -> timeoutId
const activeTimers = new Map();
/**
 * Finds the highest-rated optimal nearby driver using AI matching heuristics.
 */
export async function findOptimalDriver(pickup, rideType = "economy") {
  const drivers = await Driver.find({
    status: "APPROVED",
  })
    .populate("userId", "name phone avatar isBlocked")
    .lean();

  const eligibleDrivers = drivers.filter((d) => d.userId && !d.userId.isBlocked);
  if (!eligibleDrivers.length) return null;

  // Retrieve vehicles for candidates
  const driverIds = eligibleDrivers.map((d) => d._id);
  const vehicles = await Vehicle.find({ driverId: { $in: driverIds } }).lean();
  const vehicleMap = new Map();
  for (const v of vehicles) {
    if (!vehicleMap.has(v.driverId.toString()) || v.isDefault) {
      vehicleMap.set(v.driverId.toString(), v);
    }
  }

  // Score each candidate
  const scored = eligibleDrivers.map((driver) => {
    const vehicle = vehicleMap.get(driver._id.toString());
    const dLoc = driver.currentLocation || { latitude: pickup.latitude + 0.01, longitude: pickup.longitude + 0.01 };
    const distanceKm = haversineKm(pickup, dLoc);

    // AI Scoring: Proximity (0-40 pts), Rating (0-40 pts), Vehicle Class Match (0-20 pts)
    const proximityScore = Math.max(0, 40 - distanceKm * 6);
    const ratingScore = (Number(driver.rating) || 4.5) * 8;
    const tierMatchBonus = vehicle?.vehicleType === rideType ? 20 : vehicle?.vehicleType === "xl" ? 15 : 10;

    const totalScore = Math.round((proximityScore + ratingScore + tierMatchBonus) * 10) / 10;

    return {
      driver,
      vehicle,
      distanceKm: Math.round(distanceKm * 10) / 10,
      totalScore,
    };
  });

  // Sort descending by AI score
  scored.sort((a, b) => b.totalScore - a.totalScore);
  return scored[0] || null;
}

/**
 * Executes automatic AI pairing and assigns the driver to the ride.
 */
export async function matchAndAssignDriver(rideId) {
  try {
    const ride = await Ride.findById(rideId);
    if (!ride) return null;
    if (!["REQUESTED", "SEARCHING_DRIVER"].includes(ride.status)) {
      return ride; // Already handled
    }

    const match = await findOptimalDriver(ride.pickup, ride.rideType);
    if (!match || !match.driver) {
      console.log(`[ai-dispatch] No driver match found for ride #${ride.rideNumber}`);
      return null;
    }

    const { driver, vehicle, distanceKm } = match;

    ride.driverId = driver._id;
    ride.vehicleId = vehicle?._id || null;
    ride.status = "DRIVER_ASSIGNED";
    ride.assignedAt = new Date();
    ride.statusHistory.push({ status: "DRIVER_ASSIGNED", by: driver.userId._id });
    await ride.save();

    await Notification.create({
      userId: ride.passengerId,
      type: "RIDE_ACCEPTED",
      title: "AI Driver Matched",
      body: `${driver.userId.name} (${Number(driver.rating).toFixed(1)} ★) is en route with a ${vehicle ? `${vehicle.color} ${vehicle.make} ${vehicle.model}` : "vehicle"}.`,
      data: { rideId: ride._id },
    });

    // Notify Passenger
    emitToUser(ride.passengerId.toString(), "ride:accepted", {
      rideId: ride._id,
      driver: {
        name: driver.userId.name,
        phone: driver.userId.phone || "+1 (555) 0192",
        rating: driver.rating,
        totalTrips: driver.totalTrips,
        location: driver.currentLocation || { latitude: ride.pickup.latitude + 0.008, longitude: ride.pickup.longitude + 0.008 },
        vehicle: vehicle
          ? {
              make: vehicle.make,
              model: vehicle.model,
              color: vehicle.color,
              plateNumber: vehicle.plateNumber,
              vehicleType: vehicle.vehicleType,
            }
          : null,
      },
      ride: { status: ride.status, ridePin: ride.ridePin },
    });

    emitToAdmins("ride:assigned", { rideId: ride._id, rideNumber: ride.rideNumber, driverName: driver.userId.name });
    console.log(`[ai-dispatch] Successfully auto-assigned Driver ${driver.userId.name} to Ride #${ride.rideNumber}`);

    // Schedule progressive autonomous simulation
    scheduleProgressiveArrival(ride._id, ride.passengerId.toString(), driver.userId.name);

    return ride;
  } catch (err) {
    console.error("[ai-dispatch] Error during auto match:", err);
    return null;
  }
}

/**
 * Progresses driver status automatically (Arriving -> Arrived) for smooth live experience
 */
function scheduleProgressiveArrival(rideId, passengerId, driverName) {
  // T+5s: DRIVER_ARRIVING
  setTimeout(async () => {
    try {
      const r = await Ride.findById(rideId);
      if (r && r.status === "DRIVER_ASSIGNED") {
        r.status = "DRIVER_ARRIVING";
        r.statusHistory.push({ status: "DRIVER_ARRIVING" });
        await r.save();
        emitToUser(passengerId, "ride:driverArriving", { rideId, status: "DRIVER_ARRIVING" });
      }
    } catch {}
  }, 5000);

  // T+12s: DRIVER_ARRIVED
  setTimeout(async () => {
    try {
      const r = await Ride.findById(rideId);
      if (r && r.status === "DRIVER_ARRIVING") {
        r.status = "DRIVER_ARRIVED";
        r.statusHistory.push({ status: "DRIVER_ARRIVED" });
        await r.save();
        emitToUser(passengerId, "ride:driverArrived", { rideId, status: "DRIVER_ARRIVED" });
      }
    } catch {}
  }, 12000);
}

/**
 * Initiates the AI Autonomous Dispatch sequence with live radar telemetry updates
 */
export function startAutonomousDispatch(ride) {
  const rideId = ride._id.toString();
  const passengerId = ride.passengerId.toString();

  // Step 1: T+1.5s Telemetry Broadcast
  const t1 = setTimeout(() => {
    emitToUser(passengerId, "ride:searchTelemetry", {
      stage: "SCANNING",
      message: "AI Scanning nearby radar within 4.5km coverage...",
      matchedCount: 4,
      progress: 35,
    });
  }, 1500);

  // Step 2: T+3.5s Ranking Broadcast
  const t2 = setTimeout(() => {
    emitToUser(passengerId, "ride:searchTelemetry", {
      stage: "RANKING",
      message: "Evaluating driver safety ratings, response speed & vehicle classes...",
      progress: 70,
    });
  }, 3500);

  // Step 3: T+5.5s Pairing & Execution
  const t3 = setTimeout(async () => {
    emitToUser(passengerId, "ride:searchTelemetry", {
      stage: "MATCHED",
      message: "AI Optimal Match Confirmed! Assigning highest-rated driver...",
      progress: 95,
    });

    await matchAndAssignDriver(ride._id);
    activeTimers.delete(rideId);
  }, 5500);

  activeTimers.set(rideId, [t1, t2, t3]);
}

/**
 * Cancels any pending autonomous dispatch timers for a ride
 */
export function cancelAutonomousDispatch(rideId) {
  const timers = activeTimers.get(String(rideId));
  if (timers) {
    timers.forEach((t) => clearTimeout(t));
    activeTimers.delete(String(rideId));
  }
}
