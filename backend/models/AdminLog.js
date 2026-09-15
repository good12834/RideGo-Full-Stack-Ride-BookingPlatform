import mongoose from "mongoose";

const adminLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    targetType: { type: String, default: "" },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("AdminLog", adminLogSchema);
