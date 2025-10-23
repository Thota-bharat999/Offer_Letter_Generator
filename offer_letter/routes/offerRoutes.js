const express = require("express");
const router = express.Router();
const multer=require("multer")
const { registerAdmin, loginAdmin,forgotPassword,resetPasswordWithOtp } = require("../controllers/authController");
const {createOfferLetter,getAllOffers,getOfferById,updateOfferLetter,generatePDF,deleteOfferLetter,downloadOfferLetter,sendOfferLetterEmail}=require('../controllers/offerController');

const{verifyToken}=require('../middleware/authMiddleware');


// ✅ NO spaces after '/login'
router.get("/test", (req, res) => {
    res.status(200).send("Router is connected!");
});
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordWithOtp);
router.post("/create",verifyToken,createOfferLetter);
router.post('/geneate-pdf',verifyToken,generatePDF)
router.get("/all",verifyToken,getAllOffers)
router.get('/:id',verifyToken,getOfferById);
router.put('/:id',verifyToken,updateOfferLetter)
router.delete('/:id',verifyToken,deleteOfferLetter);

router.get("/download/:id", verifyToken, downloadOfferLetter);
router.post("/send-email",verifyToken,sendOfferLetterEmail)


module.exports = router;
