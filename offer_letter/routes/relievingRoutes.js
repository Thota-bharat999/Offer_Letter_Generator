const express=require("express");
const router=express.Router();
const { createRelivingLetter }=require('../controllers/relievingController');
const{verifyToken}=require('../middleware/authMiddleware');

router.post('/create',verifyToken,createRelivingLetter);
module.exports=router;