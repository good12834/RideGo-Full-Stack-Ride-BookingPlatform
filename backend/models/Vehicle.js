import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1980, max: 2100 },
    color: { type: String, required: true, trim: true },
    plateNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    vehicleType: {
      type: String,
      enum: ["economy", "comfort", "xl"],
      default: "economy",
    },
    image: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Vehicle", vehicleSchema);
