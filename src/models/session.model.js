import mongoose from "mongoose";

const sessionSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  userAgent: {
    type: String,
  },
  valid: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

sessionSchema.pre("save",function(next){
    this.updatedAt = Date.now()
    // next()
})

export const session = mongoose.model("session",sessionSchema)