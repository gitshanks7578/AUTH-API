import mongoose from "mongoose";

const loginChallengeSchema = new mongoose.Schema(
  {
    challengeId: {
      type: String,
      required: true,
      unique: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    used: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically remove expired documents
loginChallengeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export const LoginChallenge = mongoose.model(
  "LoginChallenge",
  loginChallengeSchema
);