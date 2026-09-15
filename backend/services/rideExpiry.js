import Ride from "../models/Ride.js";
import Notification from "../models/Notification.js";
import { cancelAutonomousDispatch } from "./aiDispatchEngine.js";
import { emitToUser, emitToAdmins } from "../socket/rideSocket.js";

// Statuses that count as a "live" ride for the passenger. A passenger may only
// have ONE ride in these states; a second booking attempt gets 409 while one exists.
export const ACTIVE_RIDE_STATUSES = [
  "REQUESTED",
  "SEARCHING_DRIVER",
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "DRIVER_ARRIVED",
  "TRIP_STARTED",
];

// Auto-expiry timeouts (ms) per status. A ride stuck in a live status for longer
// than its limit is treated as abandoned (server restarted and lost in-memory
// dispatch timers, no driver matched, driver "ghosted", ...) and is auto-cancelled
// so the passenger is never permanently blocked from booking again (409 lockout).
const STALE_AFTER_MS = {
  REQUESTED: 2 * 60_000, // 2 min — no driver dispatched yet
  SEARCHING_DRIVER: 90_000, // 90s — no driver matched
  DRIVER_ASSIGNED: 5 * 60_000, // 5 min — driver accepted but never moved
  DRIVER_ARRIVING: 5 * 60_000, // 5 min
  DRIVER_ARRIVED: 10 * 60_000, // 10 min — driver arrived, pickup never started
  TRIP_STARTED: 30 * 60_000, // 30 min — trip started but never completed
};

/**
 * True when a live ride has been idle in its current status past the auto-expiry
 * limit. Uses `updatedAt` (mongoose timestamps) so any save resets the clock.
 */
export function isStaleRide(ride) {
  const limit = STALE_AFTER_MS[ride.status];
  if (!limit) return false;
  const updatedAt = ride.updatedAt ? new Date(ride.updatedAt) : new Date(ride.createdAt || Date.now());
  return Date.now() - updatedAt.getTime() > limit;
}

/**
 * Force-cancels a single live ride (used by the sweeper and by bookRide when the
 * blocking ride has gone stale). Free's the Autonomous Dispatch timers and notifies
 * the passenger + admins, mirroring cancelRide's behaviour.
 */
export async function cancelStaleRide(ride, opts = {}) {
  ride.status = "CANCELLED";
  ride.cancelledBy = "system";
  ride.cancelReason = opts.reason || "Ride expired automatically (no driver progress detected)";
  ride.statusHistory.push({ status: "CANCELLED", by: ride.passengerId });
  await ride.save();

  cancelAutonomousDispatch(ride._id);

  await Notification.create({
    userId: ride.passengerId,
    type: "RIDE_CANCELLED",
    title: "Ride timed out",
    body: `Ride #${ride.rideNumber || 0} was cancelled because no driver progress was detected. You can book a new ride anytime.`,
    data: { rideId: ride._id, auto: true },
  });

  emitToUser(ride.passengerId.toString(), "ride:cancelled", { rideId: ride._id, by: "system", auto: true });
  emitToAdmins("ride:cancelled", { rideId: ride._id, rideNumber: ride.rideNumber, by: "system", auto: true });

  console.log(`[ride-expiry] Auto-cancelled stale ride #${ride.rideNumber} (status ${ride.status})`);
}

/**
 * Sweep: find every ride stuck in a live status past its expiry limit and cancel
 * it. Started as a periodic job from server.js so abandoned rides (e.g. after a
 * server restart wiped the in-memory dispatch timers) never block a re-booking.
 */
export async function expireStaleRides() {
  let expired = 0;
  try {
    const candidates = await Ride.find({ status: { $in: ACTIVE_RIDE_STATUSES } });
    for (const ride of candidates) {
      try {
        if (isStaleRide(ride)) {
          await cancelStaleRide(ride);
          expired += 1;
        }
      } catch (err) {
        console.error(`[ride-expiry] Error expiring ride ${ride._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[ride-expiry] Sweep failed:", err.message);
  }
  return expired;
}