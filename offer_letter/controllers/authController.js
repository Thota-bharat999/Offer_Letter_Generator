const HrAdmin=require('../models/Admin')
const mongoose=require("mongoose")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const sendEmail=require("../services/emailService")


const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};


// Admin Register
exports.registerAdmin=async(req,res)=>{
    try{
        const {name,email,password}=req.body;
         if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
        const existing= await HrAdmin.findOne({email});
        if(existing){
            return res.status(400).json({message:"Email already exists"})
        }
        const admin=await HrAdmin.create({name,email,password});
        const token =jwt.sign({id:admin._id},process.env.JWT_SECRET,{
             expiresIn: "1h",
        });
        res.status(201).json({
            message:"HR Created Successfully",
             id: admin._id,
            token
       
        })

    } catch(err){
    console.error("❌ Register Error:", err.message);
    return res.status(500).json({ message: "Server error", error: err.message });

    }
}
exports.loginOffer = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // 2️⃣ Find admin (include password explicitly)
    const admin = await HrAdmin.findOne({ email }).select("+password");
    if (!admin) {
      return res.status(404).json({ message: "Invalid email or password" });
    }

    // 3️⃣ Check password
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 4️⃣ Generate JWT
    const token = generateToken(admin._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error" });
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
