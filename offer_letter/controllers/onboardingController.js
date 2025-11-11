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
    // Normalize req.body to convert object values to strings recursively
    const normalizeObject = (obj) => {
      if (typeof obj === 'string') return obj;
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          return obj.map(normalizeObject);
        } else {
          const keys = Object.keys(obj);
          if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
            const numericKeys = keys.map(k => parseInt(k));
            const min = Math.min(...numericKeys);
            const max = Math.max(...numericKeys);
            const unique = new Set(numericKeys);
            if (min === 0 && max === keys.length - 1 && unique.size === keys.length) {
              const sorted = Array.from(unique).sort((a, b) => a - b);
              return sorted.map(k => obj[k.toString()]).join('');
            }
          }
          const normalized = {};
          for (const key in obj) {
            normalized[key] = normalizeObject(obj[key]);
          }
          return normalized;
        }
      }
      return obj;
    };
    const normalizedBody = normalizeObject(req.body);
    const {qualifications, ...otherFields} = normalizedBody;
    const normalizedQualifications = (qualifications || []).map(qual => {
      const normalizedQual = normalizeObject(qual);
      if (!normalizedQual.educationType) normalizedQual.educationType = 'Other';
      if (!normalizedQual.institutionName) normalizedQual.institutionName = 'Not Provided';
      return normalizedQual;
    });
    const newCandidate=new CandidateOnboarding({
      ...otherFields,
      qualifications: normalizedQualifications,
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
