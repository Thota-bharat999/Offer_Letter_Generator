const express = require("express");
const router = express.Router();
const multer = require("multer");
const { updateCompany,getCompanyInfo } = require("../controllers/companyController");
const { verifyToken } = require("../middleware/authMiddleware");

// ✅ Configure Multer for logo uploads
const upload = multer({
  dest: "uploads/temp/",
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only .png, .jpg, and .jpeg files allowed!"));
    }
    cb(null, true);
  },
});

// ✅ PUT /api/company/update
router.put("/update", upload.single("logo"), updateCompany);
router.get('/info',verifyToken,getCompanyInfo)


module.exports = router;
