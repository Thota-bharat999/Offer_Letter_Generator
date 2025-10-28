const express=require("express");
const router=express.Router();
const { createRelivingLetter, getAllRelievingLetters, getRelievingLetterById, updateRelievingLetter, deleteRelievingLetter,generateRelievingPDF, downloadRelievingLetter, sendRelievingEmail }=require('../controllers/relievingController');
const{verifyToken}=require('../middleware/authMiddleware');
const { updateOne } = require("../models/Company");

router.post('/create',verifyToken,createRelivingLetter);
router.get('/all',verifyToken,getAllRelievingLetters);
router.get('/:id',verifyToken,getRelievingLetterById);
router.put('/:id',verifyToken,updateRelievingLetter);
router.delete('/:id',verifyToken,deleteRelievingLetter);
router.post('/generate-pdf',verifyToken,generateRelievingPDF);
router.get('/download/:id',verifyToken,downloadRelievingLetter);
router.post("/send-email", verifyToken,sendRelievingEmail)
module.exports=router;