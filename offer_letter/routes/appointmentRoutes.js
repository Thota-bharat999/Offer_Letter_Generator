const express=require("express");
const router=express.Router();
const {createAppointmentLetter}=require('../controllers/appointmentController');
const{verifyToken}=require('../middleware/authMiddleware');

router.post('/create',verifyToken,createAppointmentLetter);
module.exports=router;