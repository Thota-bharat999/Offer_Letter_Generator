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

    // 3️⃣ Hash the password manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4️⃣ Create new admin
    const newAdmin = new HrAdmin({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "admin"
    });

    await newAdmin.save();

    // 5️⃣ Generate JWT token
    const token = jwt.sign(
      { id: newAdmin._id },
      process.env.JWT_SECRET ||
        "6d9c9a4f5e8a3d2b8f1e0c9a7b3e6f4a9d1b0c7f2a8e5d6c3b4f9e1a7c2d5f8",
      { expiresIn: "1d" }
    );

    // 6️⃣ Response
    return res.status(201).json({
      message: "Admin registered successfully",
      token,
      admin: {
        id: newAdmin._id,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (err) {
    console.error("❌ Register error:", err.message);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Find admin by email
    const admin = await HrAdmin.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // 2️⃣ Compare password using bcrypt
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // 3️⃣ Generate JWT token
    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET ||
        "6d9c9a4f5e8a3d2b8f1e0c9a7b3e6f4a9d1b0c7f2a8e5d6c3b4f9e1a7c2d5f8",
      { expiresIn: "1d" }
    );

    // 4️⃣ Response
    res.status(200).json({
      message: "Login successful",
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
    console.log("📧 Forgot password request:", email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const admin = await HrAdmin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // ✅ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    // ✅ Save OTP using the same field names used in resetPasswordWithOtp
    admin.otpCode = hashedOtp;
    admin.otpExpire = Date.now() + 10 * 60 * 1000; // 10 mins
    await admin.save();

    // ✅ Email content
    const subject = "Password Reset OTP - Offer Letter Generator";
    const html = `
      <div style="font-family:Arial, sans-serif; padding:10px;">
        <h3>Hello ${admin.firstName},</h3>
        <p>You requested to reset your password. Use the OTP below to proceed:</p>
        <h2 style="color:#1e6aa8;">${otp}</h2>
        <p>This OTP is valid for <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <br/>
        <p>Best regards,<br/>Offer Letter Generator Team</p>
      </div>
    `;
    const text = `Hello ${admin.firstName},\nYour OTP for password reset is: ${otp}\nIt expires in 10 minutes.`;

    await sendEmail({
      to: admin.email,
      subject,
      html,
      text,
    });

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Reset Password


exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const { otp, newPassword, confirmPassword } = req.body;

    // ✅ 1. Validate inputs
    if (!otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ 2. Confirm passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // ✅ 3. Hash entered OTP to compare with DB
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    // ✅ 4. Find admin by OTP and expiry
    const admin = await HrAdmin.findOne({
      otpCode: hashedOtp,
      otpExpire: { $gt: Date.now() }, // only valid OTPs
    }).select("+password");

    if (!admin) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // ✅ 5. Hash and save new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    admin.password = hashedPassword;
    admin.otpCode = undefined;
    admin.otpExpire = undefined;

    await admin.save();

    // ✅ 6. Respond success
    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ message: "Server error during password reset" });
  }
};

