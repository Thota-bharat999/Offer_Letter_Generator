const express=require("express");
const router=express.Router();
const {createAppointmentLetter, updateAppointmentLetter}=require('../controllers/appointmentController');
const{verifyToken}=require('../middleware/authMiddleware');

router.post('/create',verifyToken,createAppointmentLetter);
router.put('/:id',verifyToken,updateAppointmentLetter)
module.exports=router;