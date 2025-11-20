// const logger = require('../logger/logger');
// const Messages = require('../MsgConstants/messages');
// controllers/onboardingController.js

const BasicInfo = require("../models/BasicInfo");

exports.saveBasicInfo = async (req, res) => {
  try {
    const {
      draftId: existingDraftId,
      firstName,
      lastName,
      fatherName,
      email,
      countryCode,
      phoneNumber,
      aadharNumber,
      panNumber
    } = req.body;

    // Generate draftId if not provided
    let draftId = existingDraftId;
    if (!draftId) {
      draftId = BasicInfo.generateDraftId(aadharNumber, panNumber);
    }

    // Prepare Base64 attachments
    const attachments = {};
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        attachments[file.fieldname] = {
          fileName: file.originalname,
          base64: file.buffer.toString("base64"),
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date()
        };
      });
    }

    // Check existing draft
    let record = await BasicInfo.findOne({ draftId });

    if (!record) record = new BasicInfo({ draftId });

    // Update fields
    record.firstName = firstName;
    record.lastName = lastName;
    record.fatherName = fatherName;
    record.email = email;
    record.countryCode = countryCode;
    record.phoneNumber = phoneNumber;

    // Encrypt Aadhaar & PAN only if they exist
    if (aadharNumber) record.setAadhar(aadharNumber);
    if (panNumber) record.setPan(panNumber);

    // Attachments
    if (attachments.aadhar) record.aadharAttachment = attachments.aadhar;
    if (attachments.pan) record.panAttachment = attachments.pan;

    await record.save();

    return res.status(200).json({
      success: true,
      message: "Basic info saved successfully",
      draftId,
      data: record
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to save basic info",
      error: err.message
    });
  }
};







// ✅ UPDATE ANY SECTION DYNAMICALLY
// exports.updateCandidateSection = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updateData = req.body;

//     if (!id) {
//       return res.status(400).json({ success: false, message:Messages.ONBOARDING.CANDIDATE_ID });
//     }
//     if (!updateData || Object.keys(updateData).length === 0) {
//       return res.status(400).json({ success: false, message:Messages.ONBOARDING.NO_DATA });
//     }

//     const normalizeObject = (obj) => {
//       if (typeof obj === "string") return obj.trim();
//       if (Array.isArray(obj)) return obj.map(normalizeObject);
//       if (obj && typeof obj === "object") {
//         const normalized = {};
//         for (const key in obj) normalized[key] = normalizeObject(obj[key]);
//         return normalized;
//       }
//       return obj;
//     };

//     const normalizedUpdateData = normalizeObject(updateData || {});

//     // ✅ Use same normalizeEducationType here
//     const normalizeEducationType = (value) => {
//       if (!value) return "Other";
//       const v = String(value).trim();
//       const lowered = v.toLowerCase();

//       const canonical = {
//         "btech": "B.Tech",
//         "b.tech": "B.Tech",
//         "be": "B.E",
//         "b.e": "B.E",
//         "bsc": "B.Sc",
//         "b.sc": "B.Sc",
//         "bca": "BCA",
//         "bcom": "B.Com",
//         "b.com": "B.Com",
//         "mtech": "M.Tech",
//         "m.tech": "M.Tech",
//         "me": "M.E",
//         "m.e": "M.E",
//         "msc": "M.Sc",
//         "m.sc": "M.Sc",
//         "mca": "MCA",
//         "mba": "MBA",
//         "phd": "PhD",
//         "p.hd": "PhD",
//         "ssc": "SSC",
//         "intermediate": "Intermediate",
//         "diploma": "Diploma",
//         "graduation": "Graduation",
//         "post-graduation": "Post-Graduation",
//         "doctorate": "Doctorate",
//         "other": "Other",
//       };

//       return canonical[lowered] || v;
//     };

//     // ✅ Normalize qualifications (array or object)
//     if (normalizedUpdateData.qualifications) {
//       let quals = normalizedUpdateData.qualifications;
//       if (!Array.isArray(quals) && typeof quals === "object") {
//         quals = Object.values(quals);
//       }

//       normalizedUpdateData.qualifications = quals.map((qual) => {
//         const q = normalizeObject(qual);
//         const eduValue = q.educationType || q.qualificationName;
//         q.educationType = normalizeEducationType(eduValue);
//         delete q.qualificationName;

//         q.institutionName =
//           q.institutionName && q.institutionName.trim() !== ""
//             ? q.institutionName.trim()
//             : "Not Provided";
//         q.subCourse = q.subCourse?.trim() || "Not Provided";
//         q.yearOfPassing = q.yearOfPassing?.trim() || "Not Provided";
//         q.percentageOrGPA = q.percentageOrGPA?.trim() || "Not Provided";
//         return q;
//       });
//     }

//     if (normalizedUpdateData.experienceType === "Experience") {
//       normalizedUpdateData.experienceType = "Experienced";
//     }

//     const candidate = await CandidateOnboarding.findById(id);
//     if (!candidate) {
//       return res.status(404).json({ success: false, message:Messages.ONBOARDING.CANDIDATE_NOT_FOUND });
//     }

//     for (const key in normalizedUpdateData) {
//       const value = normalizedUpdateData[key];
//       if (
//         typeof value === "object" &&
//         !Array.isArray(value) &&
//         Object.keys(value).length > 0
//       ) {
//         candidate[key] = { ...(candidate[key]?._doc || candidate[key] || {}), ...value };
//       } else if (value !== undefined && value !== null && value !== "") {
//         candidate[key] = value;
//       }
//     }

//     await candidate.save();

//     return res.status(200).json({
//       success: true,
//       message: Messages.ONBOARDING.UPDATE_SUCCESS,
//       data: candidate,
//     });
//   } catch (error) {
//     logger.error("Error updating candidate section:", error);
//     res.status(500).json({
//       success: false,
//       message: Messages.ERROR.SERVER,
//       error: error.message,
//     });
//   }
// };

// // UNLIMITED FILE UPLOAD CONTROLLER
// exports.uploadAllDocuments = async (req, res) => {
//   try {
//     const userId = req.params.id;
//     const files = req.files;

//     if (!userId)
//       return res.status(400).json({ success: false, message: Messages.ONBOARDING.CANDIDATE_ID });

//     if (!files || files.length === 0)
//       return res.status(400).json({ success: false, message: Messages.ONBOARDING.NO_FILE });

//     const uploadDir = path.join(__dirname, "../uploads/onboarding");
//     if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

//     const candidate = await CandidateOnboarding.findById(userId);
//     if (!candidate)
//       return res.status(404).json({ success: false, message: Messages.ONBOARDING.CANDIDATE_NOT_FOUND });

//     const uploadedFiles = [];

//     for (const file of files) {
//       const ext = path.extname(file.originalname) || ".jpg";
//       const fileName = `${userId}_${file.fieldname}_${Date.now()}${ext}`;
//       const filePath = path.join(uploadDir, fileName);

//       fs.writeFileSync(filePath, file.buffer);

//       // ❌ Removed filePath/dbPath
//       const fileObject = {
//         fileName,
//         mimeType: file.mimetype,
//         fileSize: file.size,
//         uploadedAt: new Date(),
//       };

//       uploadedFiles.push({ field: file.fieldname, ...fileObject });

//       // 🎯 Map to DB field
//       switch (file.fieldname) {
//         case "pan":
//           candidate.panAttachment = fileObject;
//           break;

//         case "aadhar":
//           candidate.aadharAttachment = fileObject;
//           break;

//         case "offer_letter":
//           candidate.offerDetails.offerLetterAttachment = fileObject;
//           break;

//         case "bank_proof":
//           candidate.bankDetails.bankAttachment = fileObject;
//           break;

//         case "marksheet":
//           if (candidate.qualifications?.length > 0) {
//             candidate.qualifications[0].certificateAttachment = fileObject;
//           }
//           break;

//         case "od":
//           if (!candidate.experiences[0].payslipAttachment) {
//             candidate.experiences[0].payslipAttachment = [];
//           }
//           candidate.experiences[0].payslipAttachment.push(fileObject);
//           break;

//         default:
//           logger.warn(`Unmapped field: ${file.fieldname}`);
//       }
//     }

//     await candidate.save();

//     res.status(200).json({
//       success: true,
//       message: Messages.ONBOARDING.FILE_UPLOAD_SUCCESS,
//       uploaded: uploadedFiles,
//       candidate,
//     });

//   } catch (err) {
//     logger.error("Upload Error: " + err.message);
//     res.status(500).json({
//       success: false,
//       message: Messages.ONBOARDING.FILE_UPLOAD_FAILED,
//       error: err.message,
//     });
//   }
// };



// // get Candidate Details By Id
// exports.getCandidateById=async(req,res)=>{
//   try{
//     const {id}=req.params;
//     if(!id){
//       return res.status(400).json({
//         success:false,
//         message:Messages.ONBOARDING.CANDIDATE_ID,
//       })
//     }
//     if(!mongoose.Types.ObjectId.isValid(id)){
//       return res.status(400).json({
//         success:false,
//         message:Messages.ONBOARDING.CANDIDATE_VALID_ID,
//       })
//     }
//     const candidate=await CandidateOnboarding.findById(id).lean();
//     if(!candidate){
//       return res.status(404).json({
//         success:false,
//         message:Messages.ONBOARDING.CANDIDATE_NOT_FOUND,
//       })
//     }
//     return res.status(200).json({
//       success:true,
//       message:Messages.ONBOARDING.FETCHED_DETAILS,
//       data:candidate,
//     })
//   }catch(error){
//     logger.error("Error fetching candidate:", error);
//     res.status(500).json({
//       success: false,
//       message: Messages.ERROR.SERVER,
//       error: error.message,
//     });

//   }
// }
// // Get All Candidates With Pagination and Filtering

// exports.getAllCandidates=async(req,res)=>{
//   try{
//     const {status,search,page=1,limit=20}=req.query;
//     const filter={};
//     if(status){
//       filter.status=status;
//     }
//     if(search){
//       const searchRegex=new RegExp(search,'i');
//       filter.$or=[
//         {firstName:searchRegex},
//         {lastName:searchRegex},
//         {email:searchRegex},
//         {phoneNumber:searchRegex},
//     ]
//     }
//     const skip=(parseInt(page)-1)*parseInt(limit);
//     const [candidates,total]=await Promise.all([
//       CandidateOnboarding.find(filter)
//       .sort({createdAt:-1})
//       .skip(skip)
//       .limit(parseInt(limit))
//       .lean(),
//       CandidateOnboarding.countDocuments(filter),
//     ]);
//     return res.status(200).json({
//       success:true,
//       message:Messages.ONBOARDING.FETCHED_DETAILS,
//       total,
//       currentPage: parseInt(page),
//       pageSize: parseInt(limit),
//       data: candidates,

//     })

//   }catch(error){
//     logger.error("Error fetching candidate list:", error);
//     res.status(500).json({
//       success: false,
//       message: Messages.ERROR.SERVER,
//       error: error.message,
//     });

//   }
// }

// // Delete Candidate By Id 
// exports.deleteCandidateById=async(req,res)=>{
//   try{
//     const {id}=req.params;
//     if(!id || !mongoose.Types.ObjectId.isValid(id)){
//       return res.status(400).json({
//         success:false,
//         message:Messages.ONBOARDING.CANDIDATE_ID,
//       })
//     }
//     const deleteCandidate=await CandidateOnboarding.findByIdAndDelete(id);
//     if(!deleteCandidate){
//       return res.status(404).json({
//         success:false,
//         message:Messages.ONBOARDING.CANDIDATE_NOT_FOUND,
//       })
//     }
//     return res.status(200).json({
//       success:true,
//       message:Messages.ONBOARDING.DELETE_SUCCESS,
//     })

//   }catch(error){
//     logger.error("Error deleting candidate:", error);
//     res.status(500).json({
//       success: false,
//       message: Messages.ERROR.SERVER,
//       error: error.message,
//     });


//   }
// }

// // DashBoard Summary
// exports.getOnboardingDashboardSummary = async (req, res) => {
//   try {
//     // 1️ Aggregate counts by status
//     const summary = await CandidateOnboarding.aggregate([
//       {
//         $group: {
//           _id: "$status",
//           count: { $sum: 1 },
//         },
//       },
//     ]);

//     // 2️Transform into readable object
//     const result = {
//       Draft: 0,
//       Submitted: 0,
//       OfferGenerated: 0,
//       Completed: 0,
//     };

//     summary.forEach((item) => {
//       result[item._id] = item.count;
//     });

//     // 3️ Total candidates
//     const total = Object.values(result).reduce((a, b) => a + b, 0);

//     // 4️ Success response
//     return res.status(200).json({
//       success: true,
//       totalCandidates: total,
//       summary: result,
//     });
//   } catch (error) {
//     logger.error("Error fetching dashboard summary:", error);
//     res.status(500).json({
//       success: false,
//       message: Messages.ERROR.SERVER,
//       error: error.message,
//     });
//   }
// };
