import { VEHICLE_TYPES } from "../utils/fareCalculator.js";

export const RIDE_STATUSES = [
  "REQUESTED",
  "SEARCHING_DRIVER",
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "DRIVER_ARRIVED",
  "TRIP_STARTED",
  "TRIP_COMPLETED",
  "PAYMENT_COMPLETED",
  "CANCELLED",
];

export const PAYMENT_METHODS = ["cash", "card", "wallet"];
export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"];
export const RIDE_TYPES = Object.keys(VEHICLE_TYPES);
export const USER_ROLES = ["passenger", "driver", "admin"];
export const PROMO_DISCOUNT_TYPES = ["percentage", "fixed"];
export const COMPLAINT_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];
export const NOTIFICATION_TYPES = [
  "RIDE_REQUESTED",
  "RIDE_ACCEPTED",
  "DRIVER_ARRIVED",
  "TRIP_STARTED",
  "TRIP_COMPLETED",
  "PAYMENT_RECEIVED",
  "RIDE_CANCELLED",
  "DRIVER_APPROVED",
  "PROMO",
  "SYSTEM",
];
