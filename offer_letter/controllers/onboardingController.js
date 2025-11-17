const path=require('path');
const fs=require('fs');
const CandidateOnboarding=require('../models/Onboarding');
const mongoose=require('mongoose');

// Create a new onboarding record
// ✅ CREATE ONBOARDING CONTROLLER
exports.createOnboaringdingRecord = async (req, res) => {
  try {
    // 🔐 Validate admin
    if (!req.admin || !req.admin.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Admin credentials missing.",
      });
    }

    // ✅ Universal normalization
    const normalizeObject = (obj) => {
      if (typeof obj === "string") return obj.trim();
      if (Array.isArray(obj)) return obj.map(normalizeObject);
      if (obj && typeof obj === "object") {
        const result = {};
        for (const key in obj) result[key] = normalizeObject(obj[key]);
        return result;
      }
      return obj;
    };

    const normalizedBody = normalizeObject(req.body || {});

    // ✅ Fix typo key if exists
    if (normalizedBody.guadianName && !normalizedBody.guardianName) {
      normalizedBody.guardianName = normalizedBody.guadianName;
      delete normalizedBody.guadianName;
    }

    // ✅ Fallback for missing optional fields
    const fieldsToCheck = ["guardianName", "phoneNumber", "panAttachment", "aadharAttachment"];
    fieldsToCheck.forEach((field) => {
      if (!normalizedBody[field] || normalizedBody[field].trim() === "") {
        normalizedBody[field] = "Not Provided";
      } else {
        normalizedBody[field] = String(normalizedBody[field]).trim();
      }
    });

    // ✅ Normalize educationType — keep exact input like "B.Tech"
    const normalizeEducationType = (value) => {
      if (!value) return "Other";
      const v = String(value).trim();
      const lowered = v.toLowerCase();

      // canonical forms
      const canonical = {
        "btech": "B.Tech",
        "b.tech": "B.Tech",
        "be": "B.E",
        "b.e": "B.E",
        "bsc": "B.Sc",
        "b.sc": "B.Sc",
        "bca": "BCA",
        "bcom": "B.Com",
        "b.com": "B.Com",
        "mtech": "M.Tech",
        "m.tech": "M.Tech",
        "me": "M.E",
        "m.e": "M.E",
        "msc": "M.Sc",
        "m.sc": "M.Sc",
        "mca": "MCA",
        "mba": "MBA",
        "phd": "PhD",
        "p.hd": "PhD",
        "ssc": "SSC",
        "intermediate": "Intermediate",
        "diploma": "Diploma",
        "graduation": "Graduation",
        "post-graduation": "Post-Graduation",
        "doctorate": "Doctorate",
        "other": "Other",
      };

      return canonical[lowered] || v;
    };

    // ✅ Normalize qualifications array
    const { qualifications, ...otherFields } = normalizedBody;
    let qualificationsArray = [];
    if (Array.isArray(qualifications)) {
      qualificationsArray = qualifications;
    } else if (qualifications && typeof qualifications === "object") {
      qualificationsArray = Object.values(qualifications);
    }

    const normalizedQualifications = qualificationsArray.map((qual) => {
      const q = normalizeObject(qual);
      const eduValue = q.educationType || q.qualificationName;
      q.educationType = normalizeEducationType(eduValue);
      delete q.qualificationName;

      q.institutionName =
        q.institutionName && q.institutionName.trim() !== ""
          ? q.institutionName.trim()
          : "Not Provided";
      q.universityOrBoard =
        q.universityOrBoard && q.universityOrBoard.trim() !== ""
          ? q.universityOrBoard.trim()
          : "Not Provided";
      q.subCourse = q.subCourse?.trim() || "Not Provided";
      q.specialization = q.specialization?.trim() || "Not Provided";
      q.yearOfPassing = q.yearOfPassing?.trim() || "Not Provided";
      q.percentageOrGPA = q.percentageOrGPA?.trim() || "Not Provided";
      q.certificateAttachment = q.certificateAttachment?.trim() || "Not Provided";

      return q;
    });

    const newCandidate = new CandidateOnboarding({
      ...otherFields,
      qualifications: normalizedQualifications,
      status: "Draft",
    });

    await newCandidate.save();

    return res.status(201).json({
      success: true,
      message: "Onboarding Record Created Successfully",
      data: {
        _id: newCandidate._id,
        firstName: newCandidate.firstName,
        lastName: newCandidate.lastName,
        guardianName: newCandidate.guardianName,
        email: newCandidate.email,
        phoneNumber: newCandidate.phoneNumber,
        panNumber: newCandidate.panNumber,
        aadharNumber: newCandidate.aadharNumber,
      },
    });
  } catch (error) {
    console.error("❌ Error creating candidate:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// ✅ UPDATE ANY SECTION DYNAMICALLY
exports.updateCandidateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "Candidate ID is required." });
    }
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No data provided for update." });
    }

    const normalizeObject = (obj) => {
      if (typeof obj === "string") return obj.trim();
      if (Array.isArray(obj)) return obj.map(normalizeObject);
      if (obj && typeof obj === "object") {
        const normalized = {};
        for (const key in obj) normalized[key] = normalizeObject(obj[key]);
        return normalized;
      }
      return obj;
    };

    const normalizedUpdateData = normalizeObject(updateData || {});

    // ✅ Use same normalizeEducationType here
    const normalizeEducationType = (value) => {
      if (!value) return "Other";
      const v = String(value).trim();
      const lowered = v.toLowerCase();

      const canonical = {
        "btech": "B.Tech",
        "b.tech": "B.Tech",
        "be": "B.E",
        "b.e": "B.E",
        "bsc": "B.Sc",
        "b.sc": "B.Sc",
        "bca": "BCA",
        "bcom": "B.Com",
        "b.com": "B.Com",
        "mtech": "M.Tech",
        "m.tech": "M.Tech",
        "me": "M.E",
        "m.e": "M.E",
        "msc": "M.Sc",
        "m.sc": "M.Sc",
        "mca": "MCA",
        "mba": "MBA",
        "phd": "PhD",
        "p.hd": "PhD",
        "ssc": "SSC",
        "intermediate": "Intermediate",
        "diploma": "Diploma",
        "graduation": "Graduation",
        "post-graduation": "Post-Graduation",
        "doctorate": "Doctorate",
        "other": "Other",
      };

      return canonical[lowered] || v;
    };

    // ✅ Normalize qualifications (array or object)
    if (normalizedUpdateData.qualifications) {
      let quals = normalizedUpdateData.qualifications;
      if (!Array.isArray(quals) && typeof quals === "object") {
        quals = Object.values(quals);
      }

      normalizedUpdateData.qualifications = quals.map((qual) => {
        const q = normalizeObject(qual);
        const eduValue = q.educationType || q.qualificationName;
        q.educationType = normalizeEducationType(eduValue);
        delete q.qualificationName;

        q.institutionName =
          q.institutionName && q.institutionName.trim() !== ""
            ? q.institutionName.trim()
            : "Not Provided";
        q.subCourse = q.subCourse?.trim() || "Not Provided";
        q.yearOfPassing = q.yearOfPassing?.trim() || "Not Provided";
        q.percentageOrGPA = q.percentageOrGPA?.trim() || "Not Provided";
        return q;
      });
    }

    if (normalizedUpdateData.experienceType === "Experience") {
      normalizedUpdateData.experienceType = "Experienced";
    }

    const candidate = await CandidateOnboarding.findById(id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found." });
    }

    for (const key in normalizedUpdateData) {
      const value = normalizedUpdateData[key];
      if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).length > 0
      ) {
        candidate[key] = { ...(candidate[key]?._doc || candidate[key] || {}), ...value };
      } else if (value !== undefined && value !== null && value !== "") {
        candidate[key] = value;
      }
    }

    await candidate.save();

    return res.status(200).json({
      success: true,
      message: "Candidate section updated successfully",
      data: candidate,
    });
  } catch (error) {
    console.error("❌ Error updating candidate section:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// UNLIMITED FILE UPLOAD CONTROLLER
exports.uploadAllDocuments = async (req, res) => {
  try {
    const userId = req.params.id;
    const files = req.files;

    if (!userId) return res.status(400).json({ success: false, message: "Candidate ID required" });
    if (!files || files.length === 0)
      return res.status(400).json({ success: false, message: "No files uploaded" });

    const uploadDir = path.join(__dirname, "../uploads/onboarding");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const candidate = await CandidateOnboarding.findById(userId);
    if (!candidate) return res.status(404).json({ success: false, message: "Candidate not found" });

    const uploadedFiles = [];

    for (const file of files) {
      const ext = path.extname(file.originalname) || ".jpg";
      const fileName = `${userId}_${file.fieldname}_${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, fileName);
      const dbPath = `uploads/onboarding/${fileName}`;

      fs.writeFileSync(filePath, file.buffer);

      uploadedFiles.push({ field: file.fieldname, path: dbPath });

      // 🎯 MAP FILE TO CORRECT DB FIELD
      switch (file.fieldname) {
        case "pan":
          candidate.panAttachment = dbPath;
          break;

        case "aadhar":
          candidate.aadharAttachment = dbPath;
          break;

        case "offer_letter":
          candidate.offerDetails.offerLetterAttachment = dbPath;
          break;

        case "bank_proof":
          candidate.bankDetails.bankAttachment = dbPath;
          break;

        case "marksheet":
          // store a single latest certificate in qualification[0]
          if (candidate.qualifications?.length > 0) {
            candidate.qualifications[0].certificateAttachment = dbPath;
          }
          break;

        case "od":
          // OD = experience payslips
          if (!candidate.experiences[0].payslipAttachment) {
            candidate.experiences[0].payslipAttachment = [];
          }
          candidate.experiences[0].payslipAttachment.push(dbPath);
          break;

        default:
          console.log(`⚠️ Unmapped field: ${file.fieldname}`);
      }
    }

    await candidate.save();

    res.status(200).json({
      success: true,
      message: "Files uploaded & saved to database successfully.",
      uploaded: uploadedFiles,
      candidate
    });

  } catch (err) {
    console.error("❌ Upload Error:", err);
    res.status(500).json({ success: false, message: "File upload failed.", error: err.message });
  }
};

// get Candidate Details By Id
exports.getCandidateById=async(req,res)=>{
  try{
    const {id}=req.params;
    if(!id){
      return res.status(400).json({
        success:false,
        message:"Candidate Id is Required",
      })
    }
    if(!mongoose.Types.ObjectId.isValid(id)){
      return res.status(400).json({
        success:false,
        message:"Valid Candidate Id Is Required",
      })
    }
    const candidate=await CandidateOnboarding.findById(id).lean();
    if(!candidate){
      return res.status(404).json({
        success:false,
        message:"Candidate Not Found",
      })
    }
    return res.status(200).json({
      success:true,
      message:"Candidate Details Fetched Successfully",
      data:candidate,
    })
  }catch(error){
    console.error("❌ Error fetching candidate:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });

  }
}
// Get All Candidates With Pagination and Filtering

exports.getAllCandidates=async(req,res)=>{
  try{
    const {status,search,page=1,limit=20}=req.query;
    const filter={};
    if(status){
      filter.status=status;
    }
    if(search){
      const searchRegex=new RegExp(search,'i');
      filter.$or=[
        {firstName:searchRegex},
        {lastName:searchRegex},
        {email:searchRegex},
        {phoneNumber:searchRegex},
    ]
    }
    const skip=(parseInt(page)-1)*parseInt(limit);
    const [candidates,total]=await Promise.all([
      CandidateOnboarding.find(filter)
      .sort({createdAt:-1})
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
      CandidateOnboarding.countDocuments(filter),
    ]);
    return res.status(200).json({
      success:true,
      message:"Candidates fetched Successfully",
      total,
      currentPage: parseInt(page),
      pageSize: parseInt(limit),
      data: candidates,

    })

  }catch(error){
    console.error("❌ Error fetching candidate list:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });

  }
}

// Delete Candidate By Id 
exports.deleteCandidateById=async(req,res)=>{
  try{
    const {id}=req.params;
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
      return res.status(400).json({
        success:false,
        message:"Invalid or missing Candidate ID",
      })
    }
    const deleteCandidate=await CandidateOnboarding.findByIdAndDelete(id);
    if(!deleteCandidate){
      return res.status(404).json({
        success:false,
        message:"Candidate not found",
      })
    }
    return res.status(200).json({
      success:true,
      message:"Candidate deleted successfully"
    })

  }catch(error){
    console.error("❌ Error deleting candidate:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });


  }
}

// DashBoard Summary
exports.getOnboardingDashboardSummary = async (req, res) => {
  try {
    // 1️ Aggregate counts by status
    const summary = await CandidateOnboarding.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // 2️Transform into readable object
    const result = {
      Draft: 0,
      Submitted: 0,
      OfferGenerated: 0,
      Completed: 0,
    };

    summary.forEach((item) => {
      result[item._id] = item.count;
    });

    // 3️ Total candidates
    const total = Object.values(result).reduce((a, b) => a + b, 0);

    // 4️ Success response
    return res.status(200).json({
      success: true,
      totalCandidates: total,
      summary: result,
    });
  } catch (error) {
    console.error("❌ Error fetching dashboard summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
