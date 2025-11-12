const path=require('path');
const fs=require('fs');
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
            const sortedKeys = keys.sort((a, b) => parseInt(a) - parseInt(b));
            return sortedKeys.map(k => obj[k]).join('');
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
    const normalizedBody = normalizeObject(req.body || {});
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
        guardianName:newCandidate.guardianName,
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
    // Normalize updateData to convert object values to strings recursively
    const normalizeObject = (obj) => {
      if (typeof obj === 'string') return obj;
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          return obj.map(normalizeObject);
        } else {
          const keys = Object.keys(obj);
          if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
            const sortedKeys = keys.sort((a, b) => parseInt(a) - parseInt(b));
            return sortedKeys.map(k => obj[k]).join('');
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
    const normalizedUpdateData = normalizeObject(updateData || {});
    // Normalize qualifications if present
    if (normalizedUpdateData.qualifications) {
      normalizedUpdateData.qualifications = normalizedUpdateData.qualifications.map(qual => {
        if (!qual.educationType) qual.educationType = 'Other';
        if (!qual.institutionName) qual.institutionName = 'Not Provided';
        return qual;
      });
    }
    // Fix experienceType if invalid
    if (normalizedUpdateData.experienceType === 'Experience') {
      normalizedUpdateData.experienceType = 'Experienced';
    }
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
    for (const key in normalizedUpdateData) {
      if (typeof normalizedUpdateData[key] === "object" && !Array.isArray(normalizedUpdateData[key])) {
        candidate[key] = { ...candidate[key], ...normalizedUpdateData[key] };
      } else {
        candidate[key] = normalizedUpdateData[key];
      }
    }

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

// upload Document Functionality 
exports.uploadDocument = async (req, res) => {
  try {
    const userId = req.params.id;
    const file = req.files?.file?.[0];
    const fileType = req.body.type?.toLowerCase();

    const allowedTypes = ["pan", "aadhar", "offer", "bank", "payslip", "certificate"];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid upload type. Must be one of: ${allowedTypes.join(", ")}.`,
      });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    // ✅ Ensure folder exists
    const uploadDir = path.join(__dirname, "../uploads/onboarding");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    // ✅ Construct safe file path
    const fileExt = path.extname(file.originalname) || ".jpg";
    const fileName = `${userId}_${fileType}_${Date.now()}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);

    // ✅ Save file to disk
    fs.writeFileSync(filePath, file.buffer);

    console.log("✅ File saved at:", filePath);

    // ✅ Store relative path (for DB or response)
    const relativePath = `uploads/onboarding/${fileName}`;

    // Example: save to DB if needed
    // await Candidate.findByIdAndUpdate(userId, { $set: { [`documents.${fileType}`]: relativePath } });

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully.",
      filePath: relativePath,
    });

  } catch (err) {
    console.error("❌ Upload Error:", err);
    return res.status(500).json({ success: false, message: "File upload failed.", error: err.message });
  }
};
