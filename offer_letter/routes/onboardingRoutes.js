const express = require("express");
const router = express.Router();
const multer = require("multer");
const { verifyToken } = require("../middleware/authMiddleware");
const { createOnboaringdingRecord, updateCandidateSection, uploadAllDocuments, getCandidateById,getAllCandidates, deleteCandidateById,getOnboardingDashboardSummary} = require("../controllers/onboardingController");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// POST /api/onboarding - Create new candidate
router.post("/create", verifyToken, createOnboaringdingRecord);

// PATCH /api/onboarding/:id - Update any section dynamically
router.patch("/:id", verifyToken, updateCandidateSection);

// GET /api/onboarding - List all candidates (filter by status/search)
router.get("/all", verifyToken, getAllCandidates);


// GET /api/onboarding/:id - Get single candidate details
router.get("/:id", verifyToken, getCandidateById);


// DELETE /api/onboarding/:id - Delete candidate
router.delete("/:id", verifyToken, deleteCandidateById);

// POST /api/onboarding/:id/upload - Upload document
router.post(
  "/upload/:id",
  upload.fields([
    { name: "pan", maxCount: 1 },
    { name: "aadhar", maxCount: 1 },
    { name: "marksheet", maxCount: 3 },
    { name: "od", maxCount: 1 },
    { name: "offer_letter", maxCount: 1 },
    { name: "bank_proof", maxCount: 1 },
  ]),
  uploadAllDocuments
);
// // POST /api/onboarding/:id/generate-offer - Generate Offer Letter PDF
// router.post("/:id/generate-offer", verifyToken, generateOfferPDF);

// // PATCH /api/onboarding/:id/status - Update candidate status
// router.patch("/:id/status", verifyToken, updateStatus);

// GET /api/onboarding/dashboard/summary - Get counts by status
router.get("/dashboard/summary", verifyToken, getOnboardingDashboardSummary);

// // POST /api/onboarding/:id/generate-full-packet - Generate Full Packet PDF
// router.post("/:id/generate-full-packet", verifyToken, generateFullPacket);

module.exports = router;
