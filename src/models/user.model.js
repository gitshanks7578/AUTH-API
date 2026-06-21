import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    passwordResetOTP: {
      type: String,
    },
    passwordResetOTPExpires: {
      type: Date,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationOTP: {
      type: String,
    },
    emailVerificationOTPExpires: {
      type: Date,
    },
    twoFASecret: {
      type: String
    },
    twoFAEnabled:
    {
      type: Boolean,
      default: false  // since we auto-generate
    },
    googleId: {
      type: String,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    avatar: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
   if (!this.password) return;
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});
userSchema.methods.comparePassword = async function (userPassword) {
   if (!this.password) return false;
  return await bcrypt.compare(userPassword, this.password);
};

export const user = mongoose.model("user", userSchema);
