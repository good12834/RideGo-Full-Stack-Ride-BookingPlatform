import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    address: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    rideNumber: { type: Number },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },

    pickup: { type: pointSchema, required: true },
    destination: { type: pointSchema, required: true },

    distance: { type: Number, required: true }, // km
    duration: { type: Number, required: true }, // minutes
    fare: { type: Number, required: true }, // total charged to passenger
    netToDriver: { type: Number, default: 0 },

    rideType: {
      type: String,
      enum: ["economy", "comfort", "xl"],
      default: "economy",
    },

    status: {
      type: String,
      enum: [
        "REQUESTED",
        "SEARCHING_DRIVER",
        "DRIVER_ASSIGNED",
        "DRIVER_ARRIVING",
        "DRIVER_ARRIVED",
        "TRIP_STARTED",
        "TRIP_COMPLETED",
        "PAYMENT_COMPLETED",
        "CANCELLED",
      ],
      default: "REQUESTED",
    },
    statusHistory: [statusHistorySchema],

    paymentMethod: {
      type: String,
      enum: ["cash", "card", "wallet"],
      default: "cash",
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
    },

    promoCode: { type: String, default: "" },
    discount: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },

    ridePin: { type: String, default: "" },
    emergencyTriggered: { type: Boolean, default: false },

    cancelReason: { type: String, default: "" },
    cancelledBy: {
      type: String,
      enum: ["", "passenger", "driver", "admin", "system"],
      default: "",
    },

    requestedAt: { type: Date, default: Date.now },
    assignedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

rideSchema.index({ passengerId: 1, createdAt: -1 });
rideSchema.index({ driverId: 1, createdAt: -1 });
rideSchema.index({ status: 1, requestedAt: -1 });

export default mongoose.model("Ride", rideSchema);
