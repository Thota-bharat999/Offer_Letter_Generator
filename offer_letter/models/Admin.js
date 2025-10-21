const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const adminSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "fistName is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "lastName is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "superAdmin"],
      default: "admin",
    },
    otpCode: String,
    otpExpire: Date,
  },
  { timestamps: true }
);



// 🔹 Compare entered password with hashed password
adminSchema.methods.matchPassword = async function (enteredPassword) {
  // Try direct compare for single-hashed passwords
  if (await bcrypt.compare(enteredPassword, this.password)) {
    return true;
  }
  // For backward compatibility with double-hashed passwords
  const singleHashed = await bcrypt.hash(enteredPassword, 10);
  return await bcrypt.compare(singleHashed, this.password);
};

// 🔹 Generate reset password token
adminSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins
  return resetToken;
};

module.exports = mongoose.model("HrAdmin", adminSchema);
