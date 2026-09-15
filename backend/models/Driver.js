import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    licenseNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"],
      default: "PENDING",
    },
    isOnline: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    rating: { type: Number, default: 5, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    totalTrips: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    currentLocation: {
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
    },
    approvedAt: { type: Date },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

driverSchema.index({ "currentLocation.latitude": 1, "currentLocation.longitude": 1 });
driverSchema.index({ status: 1, isOnline: 1 });

export default mongoose.model("Driver", driverSchema);
