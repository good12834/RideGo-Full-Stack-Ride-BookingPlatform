import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },

    amount: { type: Number, required: true },
    commission: { type: Number, default: 0 },
    netToDriver: { type: Number, default: 0 },

    method: { type: String, enum: ["cash", "card", "wallet"], default: "cash" },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
    },

    cardBrand: { type: String, default: "" }, // e.g. "Visa" — never store raw numbers
    cardLast4: { type: String, default: "" },
    transactionRef: { type: String, default: "" },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

paymentSchema.index({ rideId: 1 });
paymentSchema.index({ passengerId: 1, createdAt: -1 });

export default mongoose.model("Payment", paymentSchema);
