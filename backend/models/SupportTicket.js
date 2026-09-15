import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    category: {
      type: String,
      enum: ["GENERAL", "RIDE_ISSUE", "PAYMENT", "SAFETY", "LOST_ITEM"],
      default: "GENERAL",
    },
    status: {
      type: String,
      enum: ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"],
      default: "OPEN",
    },
    response: { type: String, default: "" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("SupportTicket", supportTicketSchema);
