import mongoose from "mongoose";

const promoCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxUses: { type: Number, default: 1000 },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

promoCodeSchema.methods.isValid = function () {
  return this.active && new Date() < (this.expiresAt || Infinity) && this.usedCount < this.maxUses;
};

export default mongoose.model("PromoCode", promoCodeSchema);
