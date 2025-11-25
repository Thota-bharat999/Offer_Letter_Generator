const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = require("../middleware/upload");
const { verifyToken } = require("../middleware/authMiddleware");
const { saveBasicInfo,saveQulification,saveOfferDetails,saveBankDetails,fetchDraft,finalSubmit,getCandidatesWithSearch,saveEmployeeDetials,getCandidateById,deleteCandidate,updateSection,uploadAnySectionFiles,downloadCandidatePDF,downloadSingleFile,viewCandidateDetails} = require("../controllers/onboardingController");


router.post(
  "/basic-info",
  upload.any(),   // accepts pan, aadhar attachments
  verifyToken,saveBasicInfo
);

router.post(
  "/qualification",
  upload.any(), // marksheet + od
  verifyToken,saveQulification
);
router.post(
  "/offer-details",
  upload.any(), // offer letter upload
  verifyToken,saveOfferDetails
);
router.post(
  "/bank-details",
  upload.any(), // bank proof image/pdf
  verifyToken,saveBankDetails
);
router.post(
  "/employment-details",
  upload.any(), // payslips or offer letter
  verifyToken,saveEmployeeDetials
);
router.get(
  "/fetch-draft",
  verifyToken,fetchDraft
);
router.post(
  "/final-submit",
  verifyToken,finalSubmit
);

router.get(
  "/all/search",
  verifyToken,getCandidatesWithSearch
);

router.get("/:id",verifyToken,getCandidateById);

router.delete("/:id", verifyToken,deleteCandidate);

// UPDATE any section (basic, qualification, offer, bank, employment)
router.post(
  "/update-section",
  upload.any(),
  verifyToken,updateSection
);
router.post(
  "/upload-section",
  upload.any(),             // all file types
  verifyToken,uploadAnySectionFiles
);

router.get("/:id/:section/:fileName",downloadSingleFile);


router.get("/:id/pdf", verifyToken, downloadCandidatePDF);
router.get("/view/:id", verifyToken, viewCandidateDetails);



module.exports = router;
