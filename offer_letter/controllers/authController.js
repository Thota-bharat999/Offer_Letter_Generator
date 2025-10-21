const HrAdmin=require('../models/Admin')
const mongoose=require("mongoose")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const sendEmail=require("../services/emailService")


const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// ✅ Register Admin Controller
exports.registerAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // 1️⃣ Validate inputs
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2️⃣ Check if admin already exists
    const existingAdmin = await HrAdmin.findOne({ email: email.toLowerCase().trim() });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists with this email" });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Create new admin
    const newAdmin = new HrAdmin({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "admin"
    });

    await newAdmin.save();

    // 5️⃣ Generate JWT Token
    const token = jwt.sign(
      { id: newAdmin._id },
      process.env.JWT_SECRET ||
        "6d9c9a4f5e8a3d2b8f1e0c9a7b3e6f4a9d1b0c7f2a8e5d6c3b4f9e1a7c2d5f8",
      { expiresIn: "1d" }
    );

    // 6️⃣ Send response
    return res.status(201).json({
      message: "Admin registered successfully",
      token,
      admin: {
        id: newAdmin._id,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        email: newAdmin.email,
        role: newAdmin.role
      }
    });
  } catch (err) {
    console.error("❌ Register error:", err.message);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.loginOffer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const admin = await HrAdmin.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!admin) {
      return res.status(401).json({ message: "Admin HR not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET ||
        "6d9c9a4f5e8a3d2b8f1e0c9a7b3e6f4a9d1b0c7f2a8e5d6c3b4f9e1a7c2d5f8",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful - Welcome to Blogs Admin Panel",
      token,
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Please provide your email" });
    }

    const admin = await HrAdmin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // ✅ Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ✅ Hash and save OTP
    admin.otpCode = crypto.createHash("sha256").update(otp).digest("hex");
    admin.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await admin.save({ validateBeforeSave: false });

    // ✅ Email content
    const message = `
      <h3>Hi ${admin.name || "HR Admin"},</h3>
      <p>You requested a password reset.</p>
      <p>Your OTP code is:</p>
      <h2 style="color:#007bff">${otp}</h2>
      <p>This OTP will expire in <strong>10 minutes</strong>.</p>
    `;

    await sendEmail({
      to: admin.email,
      subject: "Your Password Reset OTP",
      html: message,
    });

    res.status(200).json({ success: true, message: "OTP sent to email successfully" });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ message: "Server error during forgot password" });
  }
};

// ✅ Reset Password
exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const { otp, newPassword, confirmPassword } = req.body;

    // ✅ Check required fields
    if (!otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Confirm passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // ✅ Hash the entered OTP to match stored one
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    // ✅ Find admin by OTP
    const admin = await HrAdmin.findOne({
      otpCode: hashedOtp,
      otpExpire: { $gt: Date.now() }, // valid OTP only
    }).select("+password");

    if (!admin) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // ✅ Hash new password before saving
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // ✅ Update password and clear OTP
    admin.password = hashedPassword;
    admin.otpCode = undefined;
    admin.otpExpire = undefined;

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ message: "Server error during password reset" });
  }
};
