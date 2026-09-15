import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
      unique: true,
    },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: "" },

    tags: [String],
  },
  { timestamps: true }
);

ratingSchema.index({ driverId: 1, createdAt: -1 });

export default mongoose.model("Rating", ratingSchema);
