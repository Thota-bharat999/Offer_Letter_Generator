const express=require("express");
const router=express.Router();
const {createAppointmentLetter, updateAppointmentLetter, deleteAppointmentLetter, getAllAppointmentLetters, getAppointmentLetterById, generateAppointmentPDF, downloadAppointmentPDF}=require('../controllers/appointmentController');
const{verifyToken}=require('../middleware/authMiddleware');

router.post('/create',verifyToken,createAppointmentLetter);
router.put('/:id',verifyToken,updateAppointmentLetter)
router.delete('/:id',verifyToken,deleteAppointmentLetter)
router.get('/all',verifyToken,getAllAppointmentLetters);
router.get('/:id',verifyToken,getAppointmentLetterById);
router.post('/generate-pdf',verifyToken,generateAppointmentPDF);
router.get('/download/:id',verifyToken, downloadAppointmentPDF)
module.exports=router;