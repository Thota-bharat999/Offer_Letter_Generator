const CandidateOnboarding=require('../models/Onboarding');
const mongoose=require('mongoose');

// Create a new onboarding record
exports.createOnboaringdingRecord=(req,res)=>{
  try{
     if (!req.admin || !req.admin.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Admin credentials missing.",
      });
    }
    const {firstName,lastName,guadianName,email,phoneNumber,panNumber,aadharNumber,experienceType,fresherDetails,experiences}=req.bdoy;
    if(!firstName || !lastName || !email || !phoneNumber || !panNumber || !aadharNumber){
      return res.status(400).json({
        success:false,
        message:"Missing Required Fields (firstName, lastName, email, phoneNumber,panNumber,aadharNumber)"
      })
    }
    const newCandidate=new CandidateOnboarding.create({
      firstName,
      lastName,
      guadianName,
      email,
      phoneNumber,
      panNumber,
      aadharNumber,
      experienceType:experienceType || "Fresher",
      fresherDetails:experienceType==="Fresher" ? fresherDetails:undefined,
      experiences:experienceType==="Experienced" ? experiences:[],
      status:"Draft",
    })
    return res.status(201).json({
      success:true,
      message:"Onboarding Record Created Successfully",
      data:{
        _id:newCandidate._id,
        firstName:newCandidate.firstName,
        lastName:newCandidate.lastName,
        guadianName:newCandidate.guadianName,
        email:newCandidate.email,
        phoneNumber:newCandidate.phoneNumber,
        panNumber:newCandidate.panNumber,
        aadharNumber:newCandidate.aadharNumber
      }
    })
  }catch(error){
    console.error("❌ Error creating candidate:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });

  }
}