import mongoose from "mongoose";

const refreshTokenSchema =  mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  valid: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

export const refreshToken = mongoose.model("refreshToken", refreshTokenSchema);

