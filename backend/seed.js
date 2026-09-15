import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import User from "./models/User.js";
import Driver from "./models/Driver.js";
import Vehicle from "./models/Vehicle.js";
import Ride from "./models/Ride.js";
import Payment from "./models/Payment.js";
import Rating from "./models/Rating.js";
import PromoCode from "./models/PromoCode.js";
import SupportTicket from "./models/SupportTicket.js";
import { estimateFare, routeDistanceKm, estimateDurationMin } from "./utils/fareCalculator.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ridego";

const LOCATIONS = {
  downtown: { address: "Downtown Central Station", latitude: 40.758, longitude: -73.9855 },
  airport: { address: "International Airport Terminal 3", latitude: 40.6413, longitude: -73.7781 },
  mall: { address: "Grandview Shopping Mall", latitude: 40.7411, longitude: -73.9897 },
  university: { address: "Riverside University Campus", latitude: 40.809, longitude: -73.9605 },
  stadium: { address: "City Stadium North Gate", latitude: 40.7736, longitude: -73.9566 },
  techpark: { address: "Innovation Tech Park", latitude: 40.7081, longitude: -73.9571 },
  hospital: { address: "St. Mary General Hospital", latitude: 40.7691, longitude: -73.9712 },
  harbor: { address: "Old Harbor Waterfront", latitude: 40.7005, longitude: -74.0149 },
};

const DRIVER_SEEDS = [
  { name: "Michael Torres", email: "michael@ridego.dev", make: "Toyota", model: "Camry", color: "White", plate: "ABC-123", type: "comfort", rating: 4.9, trips: 1240, lat: 40.752, lng: -73.9775 },
  { name: "David Chen", email: "david@ridego.dev", make: "Honda", model: "Civic", color: "Black", plate: "XYZ-789", type: "economy", rating: 4.7, trips: 860, lat: 40.745, lng: -73.995 },
  { name: "Daniel Okafor", email: "daniel@ridego.dev", make: "Chevrolet", model: "Suburban", color: "Silver", plate: "XLV-456", type: "xl", rating: 4.8, trips: 512, lat: 40.761, lng: -73.9675 },
  { name: "Sofia Petrova", email: "sofia@ridego.dev", make: "Tesla", model: "Model 3", color: "Red", plate: "VLT-001", type: "comfort", rating: 5.0, trips: 331, lat: 40.738, lng: -73.982 },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("[seed] connected");

  await Promise.all([
    User.deleteMany({}),
    Driver.deleteMany({}),
    Vehicle.deleteMany({}),
    Ride.deleteMany({}),
    Payment.deleteMany({}),
    Rating.deleteMany({}),
    PromoCode.deleteMany({}),
    SupportTicket.deleteMany({}),
  ]);

  // Admin
  await User.create({
    name: "Admin Riley",
    email: "admin@ridego.dev",
    password: "admin123",
    phone: "+1 555 0100",
    role: "admin",
    walletBalance: 0,
  });

  // Passenger
  const passenger = await User.create({
    name: "Alex Morgan",
    email: "alex@ridego.dev",
    password: "alex123",
    phone: "+1 555 0101",
    role: "passenger",
    walletBalance: 60,
    trustedContacts: [{ name: "Sam Morgan", phone: "+1 555 0199" }],
  });

  // Drivers
  const driverIds = [];
  for (const seedDef of DRIVER_SEEDS) {
    const user = await User.create({
      name: seedDef.name,
      email: seedDef.email,
      password: "driver123",
      phone: "+1 555 02" + String(driverIds.length).padStart(2, "0"),
      role: "driver",
    });

    const driver = await Driver.create({
      userId: user._id,
      licenseNumber: `DL-${100000 + driverIds.length * 111}`,
      status: "APPROVED",
      isApproved: true,
      isOnline: true,
      rating: seedDef.rating,
      ratingCount: Math.round(seedDef.trips * 0.62),
      totalTrips: seedDef.trips,
      totalEarnings: seedDef.trips * 11.4,
      currentLocation: { latitude: seedDef.lat, longitude: seedDef.lng, updatedAt: new Date() },
      approvedAt: new Date(),
    });

    await Vehicle.create({
      driverId: driver._id,
      make: seedDef.make,
      model: seedDef.model,
      year: 2022 + (driverIds.length % 3),
      color: seedDef.color,
      plateNumber: seedDef.plate,
      vehicleType: seedDef.type,
      isDefault: true,
    });

    driverIds.push({ driver, user });
  }

  // One pending driver for the admin approval flow
  const pendingUser = await User.create({
    name: "Noah Pending",
    email: "noah@ridego.dev",
    password: "driver123",
    phone: "+1 555 0299",
    role: "driver",
  });
  const pendingDriver = await Driver.create({
    userId: pendingUser._id,
    licenseNumber: "DL-999888",
    status: "PENDING",
    currentLocation: { latitude: 40.75, longitude: -73.98, updatedAt: new Date() },
  });
  await Vehicle.create({
    driverId: pendingDriver._id,
    make: "Kia",
    model: "Optima",
    year: 2021,
    color: "Blue",
    plateNumber: "PND-777",
    vehicleType: "economy",
    isDefault: true,
  });

  // Promo codes
  await PromoCode.create([
    {
      code: "RIDE20",
      discountType: "percentage",
      discountValue: 20,
      maxUses: 1000,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      active: true,
    },
    {
      code: "WELCOME5",
      discountType: "fixed",
      discountValue: 5,
      maxUses: 500,
      expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000),
      active: true,
    },
  ]);

  // Historical rides for passenger + driver dashboards
  const routes = [
    [LOCATIONS.downtown, LOCATIONS.airport, "economy", 3],
    [LOCATIONS.mall, LOCATIONS.university, "economy", 2],
    [LOCATIONS.downtown, LOCATIONS.harbor, "comfort", 6],
    [LOCATIONS.hospital, LOCATIONS.stadium, "economy", 9],
    [LOCATIONS.airport, LOCATIONS.mall, "comfort", 13],
    [LOCATIONS.techpark, LOCATIONS.downtown, "economy", 20],
  ];

  let rideIdx = 0;
  for (const [pickup, dest, rideType, daysAgo] of routes) {
    const driverEntry = driverIds[rideIdx % driverIds.length];
    const quote = estimateFare({ pickup, destination: dest, rideType });
    const completedAt = new Date();
    completedAt.setDate(completedAt.getDate() - daysAgo);
    completedAt.setHours(9 + rideIdx, 15, 0, 0);

    const ride = await Ride.create({
      rideNumber: 1001 + rideIdx,
      passengerId: passenger._id,
      driverId: driverEntry.driver._id,
      pickup,
      destination: dest,
      distance: quote.distanceKm,
      duration: quote.durationMin,
      fare: quote.subtotal,
      netToDriver: quote.netToDriver,
      commission: quote.commission,
      rideType,
      status: "PAYMENT_COMPLETED",
      paymentMethod: rideIdx % 2 === 0 ? "card" : "cash",
      paymentStatus: "PAID",
      requestedAt: completedAt,
      startedAt: completedAt,
      completedAt,
      ridePin: "1234",
      statusHistory: [
        { status: "REQUESTED" },
        { status: "SEARCHING_DRIVER" },
        { status: "DRIVER_ASSIGNED" },
        { status: "TRIP_STARTED" },
        { status: "TRIP_COMPLETED" },
        { status: "PAYMENT_COMPLETED" },
      ],
    });

    await Payment.create({
      rideId: ride._id,
      passengerId: passenger._id,
      driverId: driverEntry.driver._id,
      amount: ride.fare,
      commission: ride.commission,
      netToDriver: ride.netToDriver,
      method: ride.paymentMethod,
      status: "PAID",
      cardBrand: ride.paymentMethod === "card" ? "Visa" : "",
      cardLast4: ride.paymentMethod === "card" ? "4242" : "",
      transactionRef: `TXN-SEED-${ride._id}`,
      paidAt: completedAt,
    });

    await Rating.create({
      rideId: ride._id,
      passengerId: passenger._id,
      driverId: driverEntry.driver._id,
      rating: rideIdx % 2 === 0 ? 5 : 4,
      comment: ["Smooth ride, thanks!", "Great driver", "Very professional", "Fast and friendly"][rideIdx % 4],
      tags: rideIdx % 2 === 0 ? ["Great driver"] : [],
    });

    rideIdx += 1;
  }

  // Support ticket
  await SupportTicket.create({
    userId: passenger._id,
    rideId: null,
    subject: "Left my umbrella in the car",
    message: "Ride from Downtown to Airport yesterday. Black umbrella in back seat.",
    category: "LOST_ITEM",
    status: "OPEN",
  });

  const counts = {
    users: await User.countDocuments(),
    drivers: await Driver.countDocuments(),
    vehicles: await Vehicle.countDocuments(),
    rides: await Ride.countDocuments(),
    payments: await Payment.countDocuments(),
    ratings: await Rating.countDocuments(),
    promos: await PromoCode.countDocuments(),
  };

  console.log("[seed] done:", counts);
  console.log(`
Demo accounts:
  Admin      admin@ridego.dev   / admin123
  Passenger  alex@ridego.dev    / alex123
  Driver     michael@ridego.dev / driver123
  Driver     david@ridego.dev   / driver123

Promo codes: RIDE20 (20% off), WELCOME5 ($5 off)
`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
