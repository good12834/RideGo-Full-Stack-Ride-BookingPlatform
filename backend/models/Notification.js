import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, default: "SYSTEM" },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
