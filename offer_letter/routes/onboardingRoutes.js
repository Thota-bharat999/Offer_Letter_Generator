const express = require("express");
const router = express.Router();
const multer = require("multer");
const { verifyToken } = require("../middleware/authMiddleware");
const { createOnboaringdingRecord, updateCandidateSection,uploadDocument, getCandidateById,getAllCandidates, deleteCandidateById,getOnboardingDashboardSummary} = require("../controllers/onboardingController");

const upload = multer({ storage: multer.memoryStorage() });
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
router.post("/upload/:id/:type", upload.fields([{ name: "file" }]), uploadDocument);

// // POST /api/onboarding/:id/generate-offer - Generate Offer Letter PDF
// router.post("/:id/generate-offer", verifyToken, generateOfferPDF);

// // PATCH /api/onboarding/:id/status - Update candidate status
// router.patch("/:id/status", verifyToken, updateStatus);

// GET /api/onboarding/dashboard/summary - Get counts by status
router.get("/dashboard/summary", verifyToken, getOnboardingDashboardSummary);

// // POST /api/onboarding/:id/generate-full-packet - Generate Full Packet PDF
// router.post("/:id/generate-full-packet", verifyToken, generateFullPacket);

module.exports = router;
