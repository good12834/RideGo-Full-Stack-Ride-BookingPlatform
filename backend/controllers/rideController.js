import Ride from "../models/Ride.js";
import Driver from "../models/Driver.js";
import Vehicle from "../models/Vehicle.js";
import Payment from "../models/Payment.js";
import Rating from "../models/Rating.js";
import PromoCode from "../models/PromoCode.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { estimateFare, applyPromo, routeDistanceKm, estimateDurationMin } from "../utils/fareCalculator.js";
import { emitToUser, emitNewRideToNearbyDrivers, emitToAdmins } from "../socket/rideSocket.js";
import { startAutonomousDispatch, matchAndAssignDriver, cancelAutonomousDispatch } from "../services/aiDispatchEngine.js";
import { ACTIVE_RIDE_STATUSES, isStaleRide, cancelStaleRide } from "../services/rideExpiry.js";

async function nextRideNumber() {
  const last = await Ride.findOne({}).sort({ rideNumber: -1 }).select("rideNumber").lean();
  return (last?.rideNumber || 1000) + 1;
}

function notify(userId, type, title, body, data = {}) {
  return Notification.create({ userId, type, title, body, data });
}

// POST /api/rides/estimate
export async function estimate(req, res) {
  try {
    const { pickup, destination, rideType } = req.body;
    if (!pickup?.latitude || !destination?.latitude) {
      return res.status(400).json({ message: "pickup and destination coordinates are required" });
    }

    const types = rideType ? [rideType] : ["economy", "comfort", "xl"];
    const quotes = types.map((t) => ({
      rideType: t,
      ...estimateFare({ pickup, destination, rideType: t }),
    }));

    res.json({
      distance: quotes[0].distanceKm,
      duration: quotes[0].durationMin,
      quotes,
    });
  } catch (err) {
    res.status(500).json({ message: "Estimate failed", error: err.message });
  }
}

// POST /api/rides
export async function bookRide(req, res) {
  try {
    const { pickup, destination, rideType, paymentMethod, promoCode } = req.body;
    if (!pickup?.address || !destination?.address || !pickup?.latitude || !destination?.latitude) {
      return res.status(400).json({ message: "pickup and destination with addresses are required" });
    }

    // prevent stacking rides — but auto-expire a stale/abandoned ride first so a
    // passenger is never permanently locked out (409) by an old ride that never
    // progressed (no driver matched, server restart wiped dispatch timers, etc.)
    let active = await Ride.findOne({
      passengerId: req.user._id,
      status: { $in: ACTIVE_RIDE_STATUSES },
    });
    if (active) {
      if (isStaleRide(active)) {
        await cancelStaleRide(active, { reason: "Previous ride expired while waiting; booking a new one" });
        active = null;
      } else {
        return res.status(409).json({ message: "You already have an active ride", rideId: active._id });
      }
    }

    const quote = estimateFare({ pickup, destination, rideType: rideType || "economy" });
    let subtotal = quote.subtotal;
    let discount = 0;
    let promo = null;

    if (promoCode) {
      promo = await PromoCode.findOne({ code: String(promoCode).toUpperCase() });
      if (!promo || !promo.isValid()) {
        return res.status(400).json({ message: "Promo code is invalid or expired" });
      }
      ({ total: subtotal, discount } = applyPromo(subtotal, promo));
    }

    const ride = await Ride.create({
      rideNumber: await nextRideNumber(),
      passengerId: req.user._id,
      pickup,
      destination,
      distance: quote.distanceKm,
      duration: quote.durationMin,
      fare: subtotal,
      netToDriver: Math.round((subtotal - quote.commission) * 100) / 100,
      rideType: quote.vehicleType,
      status: "SEARCHING_DRIVER",
      statusHistory: [{ status: "REQUESTED" }, { status: "SEARCHING_DRIVER" }],
      paymentMethod: ["cash", "card", "wallet"].includes(paymentMethod) ? paymentMethod : "cash",
      promoCode: promo ? promo.code : "",
      discount,
      commission: quote.commission,
      ridePin: String(Math.floor(1000 + Math.random() * 9000)),
    });

    if (promo) {
      promo.usedCount += 1;
      await promo.save();
    }

    const notified = await emitNewRideToNearbyDrivers(ride, req.user.name);
    await notify(req.user._id, "RIDE_REQUESTED", "Looking for your driver", `We've notified ${notified || "nearby"} drivers in your area.`, { rideId: ride._id });
    emitToAdmins("ride:created", { rideId: ride._id, rideNumber: ride.rideNumber, fare: ride.fare });

    // Initiate AI Autonomous Dispatching Engine
    startAutonomousDispatch(ride);

    res.status(201).json({ ride });
  } catch (err) {
    res.status(500).json({ message: "Booking failed", error: err.message });
  }
}

// POST /api/rides/:id/accept   (driver)
export async function acceptRide(req, res) {
  try {
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) return res.status(404).json({ message: "Driver profile not found" });
    if (driver.status !== "APPROVED") return res.status(403).json({ message: "Driver not approved" });

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    if (!["REQUESTED", "SEARCHING_DRIVER"].includes(ride.status)) {
      return res.status(409).json({ message: "Ride is no longer available" });
    }

    const vehicle = await Vehicle.findOne({ driverId: driver._id, isDefault: true }) ||
      (await Vehicle.findOne({ driverId: driver._id }));

    ride.driverId = driver._id;
    ride.vehicleId = vehicle?._id || null;
    ride.status = "DRIVER_ASSIGNED";
    ride.assignedAt = new Date();
    ride.statusHistory.push({ status: "DRIVER_ASSIGNED", by: req.user._id });
    await ride.save();

    driver.isOnline = true; // driver is committed to this ride
    await driver.save();

    const populated = await Ride.findById(ride._id)
      .populate("driverId")
      .populate("vehicleId")
      .populate("passengerId", "name phone avatar");

    const driverUser = await User.findById(req.user._id).select("name phone");
    await notify(
      ride.passengerId,
      "RIDE_ACCEPTED",
      "Driver found",
      `${driverUser.name} is on the way. Vehicle: ${vehicle ? `${vehicle.color} ${vehicle.make} ${vehicle.model}` : "on the way"}.`,
      { rideId: ride._id }
    );

    emitToUser(ride.passengerId.toString(), "ride:accepted", {
      rideId: ride._id,
      driver: {
        name: driverUser.name,
        phone: driverUser.phone,
        rating: driver.rating,
        totalTrips: driver.totalTrips,
        location: driver.currentLocation,
        vehicle: vehicle
          ? { make: vehicle.make, model: vehicle.model, color: vehicle.color, plateNumber: vehicle.plateNumber, vehicleType: vehicle.vehicleType }
          : null,
      },
      ride: { status: ride.status, ridePin: ride.ridePin },
    });
    emitToAdmins("ride:assigned", { rideId: ride._id, rideNumber: ride.rideNumber });

    res.json({ ride: populated });
  } catch (err) {
    console.error("[accept]", err);
    res.status(500).json({ message: "Accept failed", error: err.message });
  }
}

// POST /api/rides/:id/reject   (driver)
export async function rejectRide(req, res) {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    // Soft reject: ride stays in SEARCHING_DRIVER for other drivers
    res.json({ message: "Ride rejected", rideId: ride._id });
  } catch (err) {
    res.status(500).json({ message: "Reject failed", error: err.message });
  }
}

// POST /api/rides/:id/status   { status }   (driver transitions)
export async function updateStatus(req, res) {
  try {
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) return res.status(404).json({ message: "Driver profile not found" });

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    if (!ride.driverId || ride.driverId.toString() !== driver._id.toString()) {
      return res.status(403).json({ message: "Not your ride" });
    }

    const { status } = req.body;
    const allowed = {
      DRIVER_ARRIVING: ["DRIVER_ASSIGNED"],
      DRIVER_ARRIVED: ["DRIVER_ARRIVING", "DRIVER_ASSIGNED"],
      TRIP_STARTED: ["DRIVER_ARRIVED", "DRIVER_ARRIVING", "DRIVER_ASSIGNED"],
      TRIP_COMPLETED: ["TRIP_STARTED"],
    };

    if (!allowed[status] || !allowed[status].includes(ride.status)) {
      return res.status(400).json({ message: `Cannot move from ${ride.status} to ${status || "?"}` });
    }

    ride.status = status;
    ride.statusHistory.push({ status, by: req.user._id });

    if (status === "TRIP_STARTED") ride.startedAt = new Date();
    if (status === "TRIP_COMPLETED") {
      ride.completedAt = new Date();
      driver.totalTrips += 1;

      if (ride.paymentMethod === "cash") {
        ride.paymentStatus = "PAID";
        ride.status = "PAYMENT_COMPLETED";
        ride.statusHistory.push({ status: "PAYMENT_COMPLETED" });
        await Payment.findOneAndUpdate(
          { rideId: ride._id },
          { method: "cash", amount: ride.fare, status: "PAID", paidAt: new Date(), netToDriver: ride.netToDriver, commission: ride.commission },
          { upsert: true }
        );
      }
    }

    await Promise.all([ride.save(), driver.save()]);

    const events = {
      DRIVER_ARRIVING: "ride:driverArriving",
      DRIVER_ARRIVED: "ride:driverArrived",
      TRIP_STARTED: "ride:tripStarted",
      TRIP_COMPLETED: "ride:tripCompleted",
    };

    emitToUser(ride.passengerId.toString(), events[status], {
      rideId: ride._id,
      status: ride.status,
      fare: ride.fare,
      paymentMethod: ride.paymentMethod,
    });
    emitToAdmins("ride:status", { rideId: ride._id, status: ride.status });

    res.json({ ride });
  } catch (err) {
    res.status(500).json({ message: "Status update failed", error: err.message });
  }
}

// GET /api/rides/active — passenger's active ride or driver's assigned ride
export async function getActiveRide(req, res) {
  const statuses = ACTIVE_RIDE_STATUSES;

  let ride;
  if (req.user.role === "driver") {
    const driver = await Driver.findOne({ userId: req.user._id });
    ride = await Ride.findOne({
      driverId: driver?._id,
      status: { $in: [...statuses, "TRIP_COMPLETED"] },
    })
      .populate("passengerId", "name phone avatar")
      .populate("vehicleId");
  } else {
    ride = await Ride.findOne({ passengerId: req.user._id, status: { $in: statuses } })
      .populate({
        path: "driverId",
        populate: { path: "userId", select: "name phone" },
      })
      .populate("vehicleId");
  }

  res.json({ ride: ride || null });
}

// GET /api/rides/:id — full detail, passenger/driver/admin only
export async function getRide(req, res) {
  const ride = await Ride.findById(req.params.id)
    .populate({ path: "driverId", populate: { path: "userId", select: "name phone" } })
    .populate("vehicleId")
    .populate("passengerId", "name phone avatar");

  if (!ride) return res.status(404).json({ message: "Ride not found" });

  const isPassenger = ride.passengerId?._id?.toString() === req.user._id.toString();
  const isDriver = req.user.role === "driver" && ride.driverId?.userId?._id?.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isPassenger && !isDriver && !isAdmin) {
    return res.status(403).json({ message: "Not authorized to view this ride" });
  }

  res.json({ ride });
}

// GET /api/rides/history — paginated
export async function getHistory(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const filter = { status: { $in: ["TRIP_COMPLETED", "PAYMENT_COMPLETED", "CANCELLED"] } };

  if (req.user.role === "driver") {
    const driver = await Driver.findOne({ userId: req.user._id });
    filter.driverId = driver?._id;
  } else if (req.user.role === "passenger") {
    filter.passengerId = req.user._id;
  } else {
    return res.status(403).json({ message: "Use the admin endpoints" });
  }

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

// POST /api/rides/:id/cancel
export async function cancelRide(req, res) {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const { reason } = req.body;
    // DRIVER_ARRIVED is cancellable too — the passenger hasn't been picked up yet,
    // and letting them cancel prevents being hard-locked if the driver never starts.
    const cancellable = ["REQUESTED", "SEARCHING_DRIVER", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED"];
    if (!cancellable.includes(ride.status)) {
      return res.status(400).json({ message: `Cannot cancel a ride in ${ride.status}` });
    }

    let by = "system";
    if (req.user.role === "passenger" && ride.passengerId.toString() === req.user._id.toString()) by = "passenger";
    else if (req.user.role === "driver") by = "driver";
    else if (req.user.role === "admin") by = "admin";

    ride.status = "CANCELLED";
    ride.cancelledBy = by;
    ride.cancelReason = reason || "No reason given";
    ride.statusHistory.push({ status: "CANCELLED", by: req.user._id });
    await ride.save();

    // free the driver
    if (ride.driverId) {
      await Driver.findByIdAndUpdate(ride.driverId, { $set: {} }); // driver stays online; ride ref cleared below
    }

    cancelAutonomousDispatch(ride._id);

    await notify(ride.passengerId, "RIDE_CANCELLED", "Ride cancelled", `Your ride #${ride.rideNumber} was cancelled (${by}).`, { rideId: ride._id });
    if (ride.driverId) {
      const driverDoc = await Driver.findById(ride.driverId);
      if (driverDoc) emitToUser(driverDoc.userId.toString(), "ride:cancelled", { rideId: ride._id, by });
    }
    emitToAdmins("ride:cancelled", { rideId: ride._id, by });

    res.json({ ride });
  } catch (err) {
    res.status(500).json({ message: "Cancel failed", error: err.message });
  }
}

// POST /api/rides/:id/rate
export async function rateRide(req, res) {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    if (ride.passengerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the passenger can rate" });
    }
    if (!["TRIP_COMPLETED", "PAYMENT_COMPLETED"].includes(ride.status)) {
      return res.status(400).json({ message: "You can rate after the trip is completed" });
    }

    const existing = await Rating.findOne({ rideId: ride._id });
    if (existing) return res.status(409).json({ message: "You already rated this ride" });

    const { rating, comment } = req.body;
    const value = Number(rating);
    if (!value || value < 1 || value > 5) {
      return res.status(400).json({ message: "rating must be 1-5" });
    }

    const created = await Rating.create({
      rideId: ride._id,
      passengerId: req.user._id,
      driverId: ride.driverId,
      rating: value,
      comment: comment || "",
    });

    const driver = await Driver.findById(ride.driverId);
    if (driver) {
      const newCount = driver.ratingCount + 1;
      driver.rating = Math.round(((driver.rating * driver.ratingCount + value) / newCount) * 100) / 100;
      driver.ratingCount = newCount;
      await driver.save();
      emitToUser(driver.userId.toString(), "rating:new", { rideId: ride._id, rating: value, average: driver.rating });
    }

    res.status(201).json({ rating: created });
  } catch (err) {
    res.status(500).json({ message: "Rating failed", error: err.message });
  }
}

// POST /api/rides/:id/emergency — SOS
export async function triggerEmergency(req, res) {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    if (ride.passengerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the passenger can trigger SOS" });
    }

    ride.emergencyTriggered = true;
    await ride.save();

    emitToAdmins("ride:sos", { rideId: ride._id, rideNumber: ride.rideNumber, pickup: ride.pickup });
    if (ride.driverId) {
      const driver = await Driver.findById(ride.driverId);
      if (driver) emitToUser(driver.userId.toString(), "ride:sos", { rideId: ride._id });
    }

    res.json({ message: "Emergency alert sent", rideId: ride._id });
  } catch (err) {
    res.status(500).json({ message: "SOS failed", error: err.message });
  }
}

// POST /api/rides/:id/auto-dispatch — Immediate AI driver pairing
export async function autoDispatchRide(req, res) {
  try {
    const ride = await matchAndAssignDriver(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: "No eligible drivers available in radius" });
    }
    const populated = await Ride.findById(ride._id)
      .populate({ path: "driverId", populate: { path: "userId", select: "name phone" } })
      .populate("vehicleId");
    res.json({ ride: populated, message: "AI driver matched successfully" });
  } catch (err) {
    res.status(500).json({ message: "Auto-dispatch failed", error: err.message });
  }
}

// POST /api/rides/:id/simulate-step — Advance trip lifecycle for frictionless demo
export async function simulateRideStep(req, res) {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    if (!ride.passengerId || ride.passengerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not your ride" });
    }

    const stepOrder = ["REQUESTED", "SEARCHING_DRIVER", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "TRIP_STARTED", "TRIP_COMPLETED"];
    const currentIndex = stepOrder.indexOf(ride.status);

    // Idempotent end-of-line: TRIP_COMPLETED / PAYMENT_COMPLETED / CANCELLED and
    // unknown statuses respond 200 with the current ride instead of a 400, so
    // repeated demo-simulator clicks never surface network error noise.
    if (currentIndex === -1 || currentIndex >= stepOrder.length - 1) {
      const populated = await Ride.findById(ride._id)
        .populate({ path: "driverId", populate: { path: "userId", select: "name phone" } })
        .populate("vehicleId");
      return res.json({ ride: populated, nextStatus: ride.status, done: true });
    }

    const nextStatus = stepOrder[currentIndex + 1];
    ride.status = nextStatus;
    ride.statusHistory.push({ status: nextStatus, by: req.user._id });
    if (nextStatus === "TRIP_STARTED") ride.startedAt = new Date();
    if (nextStatus === "TRIP_COMPLETED") {
      ride.completedAt = new Date();
      if (ride.paymentMethod === "cash") {
        ride.paymentStatus = "PAID";
        ride.status = "PAYMENT_COMPLETED";
      }
    }
    await ride.save();

    const events = {
      DRIVER_ARRIVING: "ride:driverArriving",
      DRIVER_ARRIVED: "ride:driverArrived",
      TRIP_STARTED: "ride:tripStarted",
      TRIP_COMPLETED: "ride:tripCompleted",
    };
    if (events[nextStatus]) {
      emitToUser(ride.passengerId.toString(), events[nextStatus], {
        rideId: ride._id,
        status: ride.status,
        fare: ride.fare,
        paymentMethod: ride.paymentMethod,
      });
    }

    const populated = await Ride.findById(ride._id)
      .populate({ path: "driverId", populate: { path: "userId", select: "name phone" } })
      .populate("vehicleId");

    res.json({ ride: populated, nextStatus });
  } catch (err) {
    res.status(500).json({ message: "Simulation step failed", error: err.message });
  }
}
