const jwt = require("jsonwebtoken");
const HrAdmin = require("../models/Admin");
exports.verifyToken = async (req, res, next) => {
  let token;

  try {
    // ✅ 1. Extract token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // ✅ 2. If no token found
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // ✅ 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ 4. Find admin and attach to req.user
    const admin = await HrAdmin.findById(decoded.id).select("-password");

    if (!admin) {
      return res.status(401).json({ message: "Admin not found or unauthorized" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("❌ Token verification error:", error.message);
    res.status(401).json({ message: "Not authorized, invalid token" });
  }
};


// Optional: Middleware for role-based access (superadmin only)

exports.adminOnly = (req, res, next) => {
  if (req.admin && req.admin.role === "superadmin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied: Admin only" });
  }
};
