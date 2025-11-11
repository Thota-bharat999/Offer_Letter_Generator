const CandidateOnboarding=require('../models/Onboarding');
const mongoose=require('mongoose');

// Create a new onboarding record
exports.createOnboaringdingRecord=async(req,res)=>{
  try{
     if (!req.admin || !req.admin.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Admin credentials missing.",
      });
    }
    const {firstName,lastName,guadianName,email,phoneNumber,panNumber,aadharNumber,experienceType,fresherDetails,experiences,qualifications}=req.body;
    // Convert object fields to strings if necessary
    const convertToString = (value) => typeof value === 'object' ? Object.values(value).join('') : value;
    const newCandidate=new CandidateOnboarding({
      firstName: convertToString(firstName),
      lastName: convertToString(lastName),
      fatherName: convertToString(guadianName),
      email: convertToString(email),
      phoneNumber: convertToString(phoneNumber),
      panNumber: convertToString(panNumber),
      aadharNumber: convertToString(aadharNumber),
      qualifications: qualifications || [],
      experienceType: convertToString(experienceType) || "Fresher",
      fresherDetails: convertToString(experienceType) === "Fresher" ? fresherDetails : undefined,
      experiences: convertToString(experienceType) === "Experienced" ? experiences : [],
      status: "Draft",
    })
    await newCandidate.save();
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
// update Any Section Dynamically;
exports.updateCandidateSection=async(req,res)=>{
  try{
    const {id}=req.params;
    const updateData=req.body;
    if(!id){
      return res.status(400).json({
        success:false,
        message:"Candidate Id is Required",
      })
    }
    if(!updateData || Object.keys(updateData).length===0){
      return res.status(400).json({
        success:false,
        message:"No Data Provided for Update",
      })
    }
    const candidate=await CandidateOnboarding.findById(id);
    if(!candidate){
      return res.status(404).json({
        success:false,
        message:"candidate Not Found"
      })
    }
    Object.keys(updateData).forEach((key)=>{
      if(typeof updateData[key] !== "object" && !Array.isArray(updateData[key])){
        candidate[key]={...candidate[key], ...updateData[key]};
      }else{
        candidate[key]=updateData[key];
      }
    })
    await candidate.save();
    return res.status(200).json({
      success:true,
      message:"Candidate Section Updated Successfully",
      data:candidate
    })

  }catch(error){
    console.error("❌ Error updating candidate section:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
 });
  }
}
