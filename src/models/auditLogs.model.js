// models/auditLog.model.js
import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: false, // null for failed login / unknown user
    },
    action: {
      type: String,
      required: true, // e.g. LOGIN_SUCCESS, PASSWORD_RESET_REQUEST
      index: true,
    },
    success: {
      type: Boolean,
      required: true,
    },
    reason: {
      type: String, // optional failure reason
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true, // createdAt is your event time
  }
);

//to prevent accidental delete
auditLogSchema.pre("deleteOne", function () {
  throw new Error("Audit logs are immutable");
});

export const auditLog = mongoose.model("auditLog", auditLogSchema);
