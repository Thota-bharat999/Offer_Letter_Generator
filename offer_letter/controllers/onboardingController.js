const logger = require('../logger/logger');
const Messages = require('../MsgConstants/messages');
const PDFDocument = require("pdfkit");
const { encryptText, decryptText } = require('../utils/cryptoUtil');

const BasicInfo = require("../models/BasicInfo");
const OfferDetails = require("../models/OfferDetails");
const Qualification=require("../models/Qualification")
const BankDetails=require('../models/BankDetails')
const EmploymentDetails=require('../models/EmploymentDetails')
const OnboardedCandidate = require("../models/OnboardedCandidate");

exports.saveBasicInfo = async (req, res) => {
  try {
    const {
      draftId: existingDraftId,
      salutation,
      firstName,
      lastName,
      fatherName,
      email,
      countryCode,
      phoneNumber,
      gender,
      aadharNumber,
      panNumber
    } = req.body;

    // Validation for required fields
    if (!fatherName || fatherName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "fatherName is required"
      });
    }

    if (!phoneNumber || phoneNumber.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "phoneNumber is required"
      });
    }

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

    // Check for required attachments AFTER record is fetched
    if (!attachments.aadhar && !record.aadharAttachment) {
      return res.status(400).json({
        success: false,
        message: "aadharAttachment is required"
      });
    }

    if (!attachments.pan && !record.panAttachment) {
      return res.status(400).json({
        success: false,
        message: "panAttachment is required"
      });
    }

    // Update fields
    record.firstName = firstName;
    record.lastName = lastName;
    record.fatherName = fatherName;
    record.email = email;
    record.countryCode = countryCode;
    record.phoneNumber = phoneNumber;
    record.salutation = salutation;
    record.gender = gender;

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

// Qulification Controller

exports.saveQulification = async (req, res) => {
  try {
    const { draftId, education } = req.body;

    if (!draftId) {
      return res.status(400).json({
        success: false,
        message: "draftId required for qualification page"
      });
    }

    // Normalize education to an array (accept both array and JSON string)
    let educationArray;
    if (Array.isArray(education)) {
      educationArray = education;
    } else if (typeof education === "string") {
      try {
        const parsed = JSON.parse(education);
        if (!Array.isArray(parsed)) {
          return res.status(400).json({
            success: false,
            message: "Education must be a valid JSON array"
          });
        }
        educationArray = parsed;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Education must be a valid JSON array"
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Education must be a valid JSON array"
      });
    }

    if (!Array.isArray(educationArray) || educationArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Education array is required"
      });
    }

    // Convert uploaded files → Base64
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

    // QUALIFICATIONS that DO NOT require subbranch
    const NO_SUBBRANCH = ["10th", "SSLC", "HSC"];

    // Validate fields
    for (let i = 0; i < educationArray.length; i++) {
      const item = educationArray[i];

      // Check subbranch ONLY IF qualification requires subbranch
      if (!NO_SUBBRANCH.includes(item.qualification)) {
        if (!item.subbranch || item.subbranch.trim() === "") {
          return res.status(400).json({
            success: false,
            message: `subbranch is required for ${item.qualification} at index ${i}`
          });
        }
      }

      // yearPassing is required ALWAYS
      if (!item.yearPassing || item.yearPassing.trim() === "") {
        return res.status(400).json({
          success: false,
          message: `yearPassing is required in education item at index ${i}`
        });
      }
    }

    let record = await Qualification.findOne({ draftId });
    if (!record) record = new Qualification({ draftId });

    // ❌ REMOVED — ODAttachment is NO LONGER required for B.Tech
    // (no validation here, fully optional)

    // Attach certificates
    educationArray.forEach((item) => {
      if (attachments[item.qualification]) {
        item.certificateAttachment = attachments[item.qualification];
      }
    });

    record.education = educationArray;

    await record.save();

    return res.status(200).json({
      success: true,
      message: "Qualification details saved successfully",
      draftId,
      data: record
    });

  } catch (error) {
    console.error("Qualification Save Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save qualification details",
      error: error.message
    });
  }
};





// Offer or InterView Controller
exports.saveOfferDetails=async(req,res)=>{
  try{
    const {draftId, offerDetails}=req.body;
    if(!draftId){
      return res.status(400).json({
        success:false,
        message:"draftId required for OfferDetails page"
      })
    }
    const {offerDate,dateOfJoining,employeeId,interviewRemarks}=offerDetails;
     let attachment = null;

    // Convert uploaded offer letter → Base64
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      attachment = {
        fileName: file.originalname,
        base64: file.buffer.toString("base64"),
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedAt: new Date()
      };
    }
    let record=await OfferDetails.findOne({draftId})
    if(!record) record =new OfferDetails({draftId})
    record.offerDate=offerDate;
    record.dateOfJoining=dateOfJoining;
    record.employeeId=employeeId;
    record.interviewRemarks=interviewRemarks

    if(attachment) record.offerLetterAttachment=attachment
    await record.save()
    return res.status(200).json({
      success:true,
      message:"Offer details saved successfully",
      draftId,
      data:record
    })
  }catch(error){
    console.error("Offer Save Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save offer details",
      error: error.message
    });

  }

}
// Bank Details
exports.saveBankDetails = async (req, res) => {
  try {
    const { draftId, bankDetails } = req.body;

    if (!draftId) {
      return res.status(400).json({ success: false, message: "draftId is required" });
    }

    const { bankName, branchName, accountNumber, confirmAccountNumber, ifscCode } = bankDetails || {};

    if (accountNumber !== confirmAccountNumber) {
      return res.status(400).json({ success: false, message: "Account Number and Confirm Account Number do not match" });
    }

    // Convert uploaded file -> Base64
    const attachments = {};
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments[file.fieldname] = {
          fileName: file.originalname,
          base64: file.buffer.toString('base64'),
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date()
        };
      });
    }

    let record = await BankDetails.findOne({ draftId });
    if (!record) record = new BankDetails({ draftId });

    record.bankName = bankName;
    record.branchName = branchName;

    // Use model method to encrypt
    record.setBankData(accountNumber, ifscCode);

    if (attachments.bankAttachment) {
      record.bankAttachment = attachments.bankAttachment;
    }

    await record.save();

    return res.status(200).json({ success: true, message: "Bank details saved successfully", draftId, data: record });

  } catch (error) {
    console.error("Bank Save Error:", error);
    return res.status(500).json({ success: false, message: "Failed to save bank details", error: error.message });
  }
};


// employmentController
exports.saveEmployeeDetials=async(req,res)=>{
  try{
    const {draftId, employmentDetails}=req.body;
    if(!draftId){
      return res.status(400).json({
        success:false,
        message:"draftId is required for employment details"
      })
    }
    const {employmentType,
      fresherCtc,
      hiredRole,

      // Experience fields
      companyName,
      durationFrom,
      durationTo,
      joinedCtc,
      offeredCtc,
      reasonForLeaving}=employmentDetails;
  const attachmentList = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        attachmentList.push({
          fileName: file.originalname,
          base64: file.buffer.toString("base64"),
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date()
        });
      });
    }
    let record = await EmploymentDetails.findOne({ draftId });
    if (!record) record = new EmploymentDetails({ draftId });
    record.employmentType = employmentType;
    // fresher logic
    if (employmentType === "Fresher") {
      record.fresherCtc = fresherCtc;
      record.hiredRole = hiredRole;

      // Single attachment → Offer letter
      if (attachmentList.length > 0) {
        record.offerLetterAttachment = attachmentList[0];
      }
    }
    // experience logic
    if (employmentType === "Experience") {
      const experienceData = {
        companyName,
        durationFrom,
        durationTo,
        joinedCtc,
        offeredCtc,
        reasonForLeaving,
        payslipAttachments: attachmentList   // all payslips stored
      };

      record.experiences = [experienceData];
    }
    await record.save()
    return res.status(200).json({
      success: true,
      message: "Employment details saved successfully",
      draftId,
      data: record
    })

  }catch(error){
    console.error("Employment Save Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save employment details",
      error: error.message
    });

  }

}
exports.fetchDraft = async (req, res) => {
  try {
    const { draftId } = req.query;

    if (!draftId) {
      return res.status(400).json({
        success: false,
        message: "draftId is required"
      });
    }

    // Fetch all pages using the same draftId
    const basic = await BasicInfo.findOne({ draftId });
    const qualification = await Qualification.findOne({ draftId });
    const offer = await OfferDetails.findOne({ draftId });
    const bank = await BankDetails.findOne({ draftId });
    const employment = await EmploymentDetails.findOne({ draftId });

    return res.status(200).json({
      success: true,
      draftId,
      data: {
        basicInfo: basic,
        qualification,
        offerDetails: offer,
        bankDetails: bank,
        employmentDetails: employment
      }
    });

  } catch (error) {
    console.error("Fetch Draft Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch draft data",
      error: error.message
    });
  }
};
exports.finalSubmit = async (req, res) => {
  try {
    const { draftId } = req.body;

    if (!draftId) {
      return res.status(400).json({
        success: false,
        message: "draftId is required for final submit"
      });
    }

    // Avoid duplicate submissions
    const already = await OnboardedCandidate.findOne({ draftId });
    if (already) {
      return res.status(400).json({
        success: false,
        message: "This draft is already submitted"
      });
    }

    // Fetch all draft pages
    const basic = await BasicInfo.findOne({ draftId });
    const qualification = await Qualification.findOne({ draftId });
    const offer = await OfferDetails.findOne({ draftId });
    const bank = await BankDetails.findOne({ draftId });
    const employment = await EmploymentDetails.findOne({ draftId });

    // Validate required pages
    if (!basic)
      return res.status(400).json({ success: false, message: "Basic Info missing" });

    if (!qualification)
      return res.status(400).json({ success: false, message: "Qualification missing" });

    if (!offer)
      return res.status(400).json({ success: false, message: "Offer Details missing" });

    if (!bank)
      return res.status(400).json({ success: false, message: "Bank Details missing" });

    if (!employment)
      return res.status(400).json({ success: false, message: "Employment Details missing" });

    // Merge all pages into final record
    const finalRecord = await OnboardedCandidate.create({
      draftId,
      basicInfo: basic,
      qualification,
      offerDetails: offer,
      bankDetails: bank,
      employmentDetails: employment
    });

    // Update draft pages to submitted
    await BasicInfo.updateOne({ draftId }, { status: "submitted" });
    await Qualification.updateOne({ draftId }, { status: "submitted" });
    await OfferDetails.updateOne({ draftId }, { status: "submitted" });
    await BankDetails.updateOne({ draftId }, { status: "submitted" });
    await EmploymentDetails.updateOne({ draftId }, { status: "submitted" });

    return res.status(200).json({
      success: true,
      message: "Onboarding completed successfully!",
      data: finalRecord
    });

  } catch (error) {
    console.error("Final Submit Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit onboarding",
      error: error.message
    });
  }
};

// GET CANDIDATES + PAGINATION + SEARCH
exports.getCandidatesWithSearch = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = Number(page);
    limit = Number(limit);

    // Build search filter
    let searchFilter = {};

    if (search && search.trim() !== "") {
      const regex = new RegExp(search, "i"); // case-insensitive search

      // Search inside basicInfo for name/email/phone
      searchFilter = {
        $or: [
          { "basicInfo.firstName": regex },
          { "basicInfo.lastName": regex },
          { "basicInfo.email": regex },
          { "basicInfo.phoneNumber": regex }
        ]
      };
    }

    const total = await OnboardedCandidate.countDocuments(searchFilter);

    const candidates = await OnboardedCandidate.find(searchFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: candidates
    });

  } catch (error) {
    console.error("Pagination Search Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch candidates",
      error: error.message
    });
  }
};

// Get specific onboarded candidate by draftId OR _id
exports.getCandidateById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Candidate ID or draftId is required"
      });
    }

    // Try to find by draftId first
    let candidate = await OnboardedCandidate.findOne({ draftId: id });

    // If not found → try MongoDB _id
    if (!candidate) {
      try {
        candidate = await OnboardedCandidate.findById(id);
      } catch (err) {
        // Ignore invalid _id format — do not break
      }
    }

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: candidate
    });
  } catch (error) {
    console.error("Get Candidate Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch candidate information",
      error: error.message
    });
  }
};

// DELETE Candidate by draftId or _id
exports.deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    // Find candidate by draftId or _id
    let candidate = await OnboardedCandidate.findOne({ draftId: id });
    if (!candidate) {
      try { candidate = await OnboardedCandidate.findById(id); }
      catch (_) {}
    }

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found"
      });
    }

    const draftId = candidate.draftId;

    // Delete from all collections
    await OnboardedCandidate.deleteOne({ draftId });
    await BasicInfo.deleteOne({ draftId });
    await Qualification.deleteOne({ draftId });
    await OfferDetails.deleteOne({ draftId });
    await BankDetails.deleteOne({ draftId });
    await EmploymentDetails.deleteOne({ draftId });

    return res.status(200).json({
      success: true,
      message: "Candidate deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete candidate",
      error: error.message
    });
  }
};

// Mapping sections → Mongoose Models
const SECTION_MAP = {
  basic: BasicInfo,
  qualification: Qualification,
  offer: OfferDetails,
  bank: BankDetails,
  employment: EmploymentDetails
};

exports.updateSection = async (req, res) => {
  try {
    const { draftId, section } = req.body;

    if (!draftId || !section) {
      return res.status(400).json({
        success: false,
        message: "draftId and section are required"
      });
    }

    const Model = SECTION_MAP[section];

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid section. Allowed: basic, qualification, offer, bank, employment"
      });
    }

    // Prepare Base64 files
    const attachments = {};
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments[file.fieldname] = {
          fileName: file.originalname,
          base64: file.buffer.toString("base64"),
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date()
        };
      });
    }

    // Find section record
    let record = await Model.findOne({ draftId });
    if (!record) record = new Model({ draftId });

    // Update text fields automatically
    Object.keys(req.body).forEach(k => {
      if (k !== "section" && k !== "draftId") {
        record[k] = req.body[k];
      }
    });

    // Add attachments automatically
    Object.keys(attachments).forEach(key => {
      record[key] = attachments[key];
    });

    await record.save();

    return res.status(200).json({
      success: true,
      message: `${section.toUpperCase()} section updated successfully`,
      data: record
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update section",
      error: error.message
    });
  }
};
// Map sections → Mongoose Models
const MODEL_MAP = {
  basic: BasicInfo,
  qualification: Qualification,
  offer: OfferDetails,
  bank: BankDetails,
  employment: EmploymentDetails
};

// 🔥 Base64 Conversion Directly Here (INSTEAD of fileHandler.js)
function prepareBase64Files(files = []) {
  const attachments = {};

  files.forEach((file) => {
    attachments[file.fieldname] = {
      fileName: file.originalname,
      base64: file.buffer.toString("base64"),
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date()
    };
  });

  return attachments;
}

exports.uploadAnySectionFiles = async (req, res) => {
  try {
    const { draftId, section } = req.body;

    if (!draftId || !section) {
      return res.status(400).json({
        success: false,
        message: "draftId and section are required"
      });
    }

    // Validate section
    const Model = MODEL_MAP[section];
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid section. Allowed: basic, qualification, offer, bank, employment"
      });
    }

    // Convert uploaded files → Base64 map (NOW using inline function)
    const attachments = prepareBase64Files(req.files);

    let record = await Model.findOne({ draftId });
    if (!record) record = new Model({ draftId });

    // -----------------------
    // PAGE 1 — BASIC INFO
    // -----------------------
    if (section === "basic") {
      if (attachments.aadhar) record.aadharAttachment = attachments.aadhar;
      if (attachments.pan) record.panAttachment = attachments.pan;
    }

    // -----------------------
    // PAGE 2 — QUALIFICATION
    // -----------------------
    if (section === "qualification") {
      // Keep qualification uploads optional; do not enforce or store root-level OD/marksheet
      // Qualification certificates are handled per education item in saveQulification
    }

    // -----------------------
    // PAGE 3 — OFFER DETAILS
    // -----------------------
    if (section === "offer") {
      if (attachments.offerLetter) record.offerLetterAttachment = attachments.offerLetter;
    }

    // -----------------------
    // PAGE 4 — BANK DETAILS
    // -----------------------
    if (section === "bank") {
      if (attachments.bankAttachment) record.bankAttachment = attachments.bankAttachment;
    }

    // -----------------------
    // PAGE 5 — EMPLOYMENT
    // -----------------------
    if (section === "employment") {
      if (!record.experiences || record.experiences.length === 0) {
        record.experiences = [{ payslipAttachments: [] }];
      }

      Object.keys(attachments).forEach((key) => {
        record.experiences[0].payslipAttachments.push(attachments[key]);
      });
    }

    await record.save();

    return res.status(200).json({
      success: true,
      message: `${section.toUpperCase()} file(s) uploaded successfully`,
      data: record
    });

  } catch (error) {
    console.error("Combined Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: "File upload failed",
      error: error.message
    });
  }
};

exports.downloadSingleFile = async (req, res) => {
  try {
    const { id, section, fileName } = req.params;

    // Step 1: Find candidate by draftId or _id
    let candidate = await OnboardedCandidate.findOne({ draftId: id });
    if (!candidate) {
      try { candidate = await OnboardedCandidate.findById(id); } catch (_) {}
    }

    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }

    // Step 2: get correct section object
    let sectionData = candidate[section];
    if (!sectionData) {
      return res.status(400).json({ success: false, message: "Invalid section name" });
    }

    // Step 3: find the actual attachment
    let file;

    if (section === "basicInfo") {
      file = sectionData.aadharAttachment?.fileName === fileName ? sectionData.aadharAttachment :
             sectionData.panAttachment?.fileName === fileName ? sectionData.panAttachment : null;
    }

    if (section === "qualification") {
      for (const edu of (Array.isArray(sectionData.education) ? sectionData.education : [])) {
        if (edu.certificateAttachment?.fileName === fileName) {
          file = edu.certificateAttachment;
          break;
        }
      }
      // Root-level OD was removed from qualification; nothing to fetch here.
    }

    if (section === "offerDetails") {
      if (sectionData.offerLetterAttachment?.fileName === fileName) {
        file = sectionData.offerLetterAttachment;
      }
    }

    if (section === "bankDetails") {
      if (sectionData.bankAttachment?.fileName === fileName) {
        file = sectionData.bankAttachment;
      }
    }

    if (section === "employmentDetails") {
      const exps = Array.isArray(sectionData.experiences) ? sectionData.experiences : [];
      for (const exp of exps) {
        if (exp?.offerLetterAttachment?.fileName === fileName) {
          file = exp.offerLetterAttachment;
          break;
        }
        if (!file && Array.isArray(exp?.payslipAttachments)) {
          const found = exp.payslipAttachments.find(f => f.fileName === fileName);
          if (found) { file = found; break; }
        }
      }
    }

    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    // Step 4: Convert BASE64 → binary
    const fileBuffer = Buffer.from(file.base64, "base64");

    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.fileName}"`
    });

    return res.send(fileBuffer);

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to download file",
      error: err.message
    });
  }
};
// Convert base64 → buffer
function bufferFromBase64(b64) {
  return Buffer.from(b64, "base64");
}

// Detect if file is image
function isImageAttachment(att) {
  if (!att) return false;
  const name = (att.fileName || "").toLowerCase();
  const mime = (att.mimeType || "").toLowerCase();

  return (
    mime.startsWith("image/") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".gif") ||
    name.endsWith(".bmp") ||
    name.endsWith(".webp")
  );
}

// Render either embedded image OR download link
function renderAttachmentBlock(doc, label, attachment, candidate, sectionKey) {
  doc.fontSize(12).text(label);

  if (!attachment || !attachment.base64) {
    doc.text("None");
    doc.moveDown(0.5);
    return;
  }

  // Try embedding image if applicable
  if (isImageAttachment(attachment)) {
    try {
      const buf = bufferFromBase64(attachment.base64);
      doc.image(buf, { fit: [250, 150] });
      doc.moveDown(0.5);
      return;
    } catch (e) {
      // If fails → fallback to download link
    }
  }

  // Otherwise show download link
  const fileName = attachment.fileName || "Attachment";
  doc.text(`File: ${fileName}`);

  const baseUrl =
    process.env.PUBLIC_WEB_URL ||
    "https://offerlettergenerator-production.up.railway.app";

  const id = candidate.draftId || candidate._id;

  const downloadUrl = `${baseUrl}/api/candidate/${id}/${sectionKey}/${encodeURIComponent(
    fileName
  )}`;

  doc
    .fillColor("blue")
    .text("Click here to download", { link: downloadUrl, underline: true })
    .fillColor("black");

  doc.moveDown(0.5);
}

exports.downloadCandidatePDF = async (req, res) => {
  try {
    const { id } = req.params;

    let candidate = await OnboardedCandidate.findOne({ draftId: id });
    if (!candidate) {
      try {
        candidate = await OnboardedCandidate.findById(id);
      } catch (_) {}
    }

    if (!candidate)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found" });

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Candidate_${id}.pdf"`
    );

    doc.pipe(res);

    //
    // ---------------- BASIC INFO ----------------
    //
    doc.fontSize(18).text("Basic Information", { underline: true });
    doc.moveDown(0.3);
    const b = candidate.basicInfo || {};
    doc.fontSize(11).text(`Salutation: ${b.salutation || ""}`);
    doc.text(`Name: ${b.firstName || ""} ${b.lastName || ""}`);
    doc.text(`Email: ${b.email || ""}`);
    doc.text(`Phone: ${b.countryCode || ""} ${b.phoneNumber || ""}`);
    doc.text(`Father Name: ${b.fatherName || ""}`);
    doc.text(`Gender: ${b.gender || ""}`);

    const aadharNum = b.aadharEncrypted
      ? decryptText(b.aadharEncrypted)
      : b.aadhar_number || "";
    const panNum = b.panEncrypted
      ? decryptText(b.panEncrypted)
      : b.panNumber || b.pan_number || "";

    if (aadharNum) doc.text(`Aadhar Number: ${aadharNum}`);
    if (panNum) doc.text(`PAN Number: ${panNum}`);

    doc.moveDown(0.5);

    // Aadhar + PAN
    renderAttachmentBlock(
      doc,
      "Aadhar Attachment:",
      b.aadharAttachment,
      candidate,
      "basicInfo"
    );
    renderAttachmentBlock(
      doc,
      "PAN Attachment:",
      b.panAttachment,
      candidate,
      "basicInfo"
    );

    doc.moveDown(1);

    //
    // ---------------- QUALIFICATIONS ----------------
    //
    doc.fontSize(18).text("Qualification Details", { underline: true });
    doc.moveDown(0.3);

    const qualification = candidate.qualification || {};
    const eduArray = qualification.education || [];

    eduArray.forEach((edu, index) => {
      doc.fontSize(14).text(`Qualification ${index + 1}`);
      doc.fontSize(11).text(`Degree: ${edu.qualification || ""}`);
      doc.text(`Specialization: ${edu.specialization || ""}`);
      doc.text(`Percentage: ${edu.percentage || ""}`);
      doc.text(`Passing Year: ${edu.passingYear || ""}`);

      renderAttachmentBlock(
        doc,
        "Certificate:",
        edu.certificateAttachment,
        candidate,
        "qualification"
      );

      doc.moveDown(0.5);
    });

    //
    // ---------------- OFFER DETAILS ----------------
    //
    doc.addPage();
    doc.fontSize(18).text("Offer Details", { underline: true });
    doc.moveDown(0.3);

    const offer = candidate.offerDetails || {};
    doc.fontSize(12).text(`Offer Date: ${offer.offerDate || ""}`);
    doc.text(`Date of Joining: ${offer.dateOfJoining || ""}`);
    doc.text(`Employee ID: ${offer.employeeId || ""}`);
    if (offer.interviewRemarks)
      doc.text(`Interview Remarks: ${offer.interviewRemarks}`);

    renderAttachmentBlock(
      doc,
      "Offer Letter:",
      offer.offerLetterAttachment,
      candidate,
      "offerDetails"
    );

    doc.moveDown(1);

    //
    // ---------------- BANK DETAILS ----------------
    //
    doc.fontSize(18).text("Bank Details", { underline: true });
    doc.moveDown(0.3);

    const bank = candidate.bankDetails || {};
    const accountNumber = bank.accountEncrypted
      ? decryptText(bank.accountEncrypted)
      : null;
    const ifsc = bank.ifscEncrypted ? decryptText(bank.ifscEncrypted) : null;

    doc.fontSize(12).text(`Bank Name: ${bank.bankName || ""}`);
    doc.text(`Branch: ${bank.branchName || ""}`);
    doc.text(`Account Number: ${accountNumber || "Not Available"}`);
    doc.text(`IFSC Code: ${ifsc || "Not Available"}`);

    renderAttachmentBlock(
      doc,
      "Bank Proof:",
      bank.bankAttachment,
      candidate,
      "bankDetails"
    );

    doc.moveDown(1);

    //
    // ---------------- EMPLOYMENT DETAILS ----------------
    //
    doc.addPage();
    doc.fontSize(18).text("Employment Details", { underline: true });
    doc.moveDown(0.3);

    const emp = candidate.employmentDetails || {};
    doc.fontSize(12).text(
      `Employment Type: ${emp.employmentType || emp.experienceType || ""}`
    );

    if ((emp.employmentType || emp.experienceType) === "Fresher") {
      doc.text(`Role Hired: ${emp.hiredRole || ""}`);
      doc.text(`Offered CTC: ${emp.fresherCtc || ""}`);

      renderAttachmentBlock(
        doc,
        "Offer Letter:",
        emp.offerLetterAttachment,
        candidate,
        "employmentDetails"
      );
    } else {
      const exp = emp.experiences?.[0];

      if (exp) {
        doc.text(`Company: ${exp.companyName || ""}`);
        doc.text(`Duration: ${exp.durationFrom || ""} → ${exp.durationTo || ""}`);
        doc.text(`Joined CTC: ${exp.joinedCtc || ""}`);
        doc.text(`Offered CTC: ${exp.offeredCtc || ""}`);
        doc.text(`Reason for Leaving: ${exp.reasonForLeaving || ""}`);

        // Experience offer letter
        renderAttachmentBlock(
          doc,
          "Offer Letter:",
          exp.offerLetterAttachment,
          candidate,
          "employmentDetails"
        );

        // Payslips
        if (exp.payslipAttachments?.length > 0) {
          exp.payslipAttachments.forEach((p, i) => {
            renderAttachmentBlock(
              doc,
              `Payslip ${i + 1}:`,
              p,
              candidate,
              "employmentDetails"
            );
          });
        } else {
          doc.text("Payslips: None");
        }
      }
    }

    // Finalize PDF
    doc.end();
  } catch (err) {
    console.error("PDF generation error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate candidate PDF",
      error: err.message,
    });
  }
};


exports.viewCandidateDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Candidate ID or draftId is required",
      });
    }

    // Try finding by draftId first
    let candidate = await OnboardedCandidate.findOne({ draftId: id });

    // If not found → try MongoDB _id
    if (!candidate) {
      try {
        candidate = await OnboardedCandidate.findById(id);
      } catch (err) {}
    }

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    // Augment with UI fields without changing storage
    const data = candidate.toObject ? candidate.toObject() : JSON.parse(JSON.stringify(candidate));
    const b = data.basicInfo || {};
    const bank = data.bankDetails || {};

    const aadharDecrypted = b.aadharEncrypted ? decryptText(b.aadharEncrypted) : null;
    const panDecrypted = b.panEncrypted ? decryptText(b.panEncrypted) : null;
    const accountDecrypted = bank.accountEncrypted ? decryptText(bank.accountEncrypted) : null;
    const ifscDecrypted = bank.ifscEncrypted ? decryptText(bank.ifscEncrypted) : null;

    if (!data.basicInfo) data.basicInfo = {};
    data.basicInfo.aadhar_number = aadharDecrypted || null;
    data.basicInfo.pan_number = panDecrypted || null;

    if (!data.bankDetails) data.bankDetails = {};
    data.bankDetails.account_number = accountDecrypted || null;
    data.bankDetails.ifsc_number = ifscDecrypted || null;

    return res.status(200).json({
      success: true,
      message: "Candidate details fetched successfully",
      data,
    });
  } catch (error) {
    console.error("View Candidate Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch candidate details",
      error: error.message,
    });
  }
};
