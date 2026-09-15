// RideGo fare calculator
// Base fare + per-km + per-minute, multipliers per vehicle type,
// night + surge pricing, promo codes and platform commission.

export const VEHICLE_TYPES = {
  economy: {
    label: "Economy",
    description: "Affordable everyday rides",
    capacity: 4,
    base: 2.5,
    perKm: 1.1,
    perMin: 0.15,
    multiplier: 1,
  },
  comfort: {
    label: "Comfort",
    description: "Newer vehicles with extra legroom",
    capacity: 4,
    base: 3.5,
    perKm: 1.45,
    perMin: 0.2,
    multiplier: 1.15,
  },
  xl: {
    label: "XL",
    description: "SUVs and vans, room for everyone",
    capacity: 6,
    base: 4.5,
    perKm: 1.8,
    perMin: 0.25,
    multiplier: 1.35,
  },
};

export const NIGHT_HOURS = [22, 23, 0, 1, 2, 3, 4, 5];
export const NIGHT_SURCHARGE = 0.15;

export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Rough road-distance factor (straight line underestimates real routes)
export function routeDistanceKm(a, b) {
  return haversineKm(a, b) * 1.35;
}

export function estimateDurationMin(km) {
  // city average speed ~26 km/h + traffic buffer
  return Math.max(5, Math.round(km * 2.6));
}

export function surgeMultiplier(date = new Date()) {
  const hour = date.getHours();
  const peak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  if (peak) return 1.25;
  return 1;
}

export function estimateFare({ pickup, destination, rideType = "economy", at = new Date() }) {
  const km = routeDistanceKm(pickup, destination);
  const min = estimateDurationMin(km);
  const vehicle = VEHICLE_TYPES[rideType] || VEHICLE_TYPES.economy;

  const raw = (vehicle.base + km * vehicle.perKm + min * vehicle.perMin) * vehicle.multiplier;
  const night = NIGHT_HOURS.includes(at.getHours()) ? 1 + NIGHT_SURCHARGE : 1;
  const surge = night * surgeMultiplier(at);

  const subtotal = round2(raw * surge);
  const commissionRate = Number(process.env.COMMISSION_RATE || 0.1);
  const commission = round2(subtotal * commissionRate);

  return {
    distanceKm: round1(km),
    durationMin: min,
    currency: process.env.FARE_CURRENCY_SYMBOL || "$",
    surge,
    vehicleType: rideType,
    subtotal,
    commission,
    netToDriver: round2(subtotal - commission),
  };
}

export function applyPromo(subtotal, promo) {
  if (!promo) return { total: subtotal, discount: 0 };
  const discount =
    promo.discountType === "percentage"
      ? round2((subtotal * promo.discountValue) / 100)
      : round2(Math.min(promo.discountValue, subtotal));
  return { discount, total: round2(Math.max(0, subtotal - discount)) };
}

export function driverEarningsFor(fare) {
  const commissionRate = Number(process.env.COMMISSION_RATE || 0.1);
  return round2(fare - round2(fare * commissionRate));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
function round1(n) {
  return Math.round(n * 10) / 10;
}
