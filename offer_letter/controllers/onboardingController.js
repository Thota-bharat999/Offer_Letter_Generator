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

  const fileName = attachment.fileName || "Attachment";

  const baseUrl =
    process.env.PUBLIC_WEB_URL ||
    "https://offerlettergenerator-production.up.railway.app";

  const id = candidate.draftId || candidate._id;

  const downloadUrl = `${baseUrl}/api/candidate/${id}/${sectionKey}/${encodeURIComponent(
    fileName
  )}`;

  // Always show file name and clickable link
  doc.text(`File: ${fileName}`);
  doc
    .fillColor("blue")
    .text("Click here to download", { link: downloadUrl, underline: true })
    .fillColor("black");

  // Optionally embed a small image preview if the attachment is an image
  if (isImageAttachment(attachment)) {
    try {
      const buf = bufferFromBase64(attachment.base64);
      doc.image(buf, { fit: [250, 150] });
    } catch (e) {
      // Ignore preview errors; link above is sufficient
    }
  }

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

    // Helper functions for well-formatted tables
    const pageWidth = doc.page.width;
    const left = doc.page.margins.left;
    const right = doc.page.margins.right;
    const usableWidth = pageWidth - left - right;
    const bottomY = doc.page.height - doc.page.margins.bottom;

    function ensureSpace(h) {
      if (doc.y + h > bottomY) {
        doc.addPage();
      }
    }

    function drawSectionHeader(title) {
      const headerHeight = 24;
      ensureSpace(headerHeight + 6);
      const x = left;
      const y = doc.y;
      doc.save();
      doc.rect(x, y, usableWidth, headerHeight).fill("#eaeef5");
      doc.restore();
      doc.fillColor("#000").font("Helvetica-Bold").fontSize(14);
      doc.text(title, x + 8, y + 6);
      doc.moveTo(x, y + headerHeight).lineTo(x + usableWidth, y + headerHeight).strokeColor("#d0d7e2").lineWidth(0.8).stroke();
      doc.y = y + headerHeight + 6;
      doc.fillColor("#000").font("Helvetica");
    }

    function buildDownloadUrl(sectionKey, fileName) {
      const baseUrl =
        process.env.PUBLIC_WEB_URL ||
        "https://offerlettergenerator-production.up.railway.app";
      const cid = candidate.draftId || candidate._id;
      return `${baseUrl}/api/candidate/${cid}/${sectionKey}/${encodeURIComponent(
        fileName
      )}`;
    }

    function drawKeyValueTable(rows, opts = {}) {
      const col1Width = Math.min(Math.floor(usableWidth * 0.38), 220);
      const col2Width = usableWidth - col1Width;
      const pad = 6;

      rows.forEach((row) => {
        const label = row.label || "";
        const valueObj = row.value;
        const valueText =
          typeof valueObj === "object" && valueObj !== null
            ? valueObj.text || ""
            : valueObj ?? "";
        const valueLink =
          typeof valueObj === "object" && valueObj !== null
            ? valueObj.link
            : undefined;

        const labelHeight = doc.heightOfString(String(label), {
          width: col1Width - pad * 2,
        });
        const valueHeight = doc.heightOfString(String(valueText), {
          width: col2Width - pad * 2,
        });
        const rowH = Math.max(labelHeight, valueHeight) + pad * 2;

        ensureSpace(rowH + 2);

        const x = left;
        const y = doc.y;

        // Draw cell borders
        doc
          .save()
          .lineWidth(0.5)
          .strokeColor("#C7CDD6")
          .rect(x, y, col1Width, rowH)
          .stroke()
          .rect(x + col1Width, y, col2Width, rowH)
          .stroke()
          .restore();

        // Draw texts
        doc.font("Helvetica-Bold").fillColor("#111");
        doc.text(String(label), x + pad, y + pad, {
          width: col1Width - pad * 2,
        });

        doc.font("Helvetica").fillColor("#000");
        if (valueLink) {
          doc
            .fillColor("blue")
            .text(String(valueText), x + col1Width + pad, y + pad, {
              width: col2Width - pad * 2,
              link: valueLink,
              underline: true,
            })
            .fillColor("#000");
        } else {
          doc.text(String(valueText), x + col1Width + pad, y + pad, {
            width: col2Width - pad * 2,
          });
        }

        doc.y = y + rowH;
      });

      doc.moveDown(0.5);
    }

    function attachmentValue(att, sectionKey) {
      if (!att || !att.base64) return "None";
      const fileName = att.fileName || "Attachment";
      return { text: fileName, link: buildDownloadUrl(sectionKey, fileName) };
    }

    // ---------------- BASIC INFORMATION (TABLE) ----------------
    // ---------------- BASIC INFORMATION (TABLE) ----------------
drawSectionHeader("Basic Information");

const b = candidate.basicInfo || {};

// Correctly map field names from DB
const aadharNum = b.aadharEncrypted
  ? decryptText(b.aadharEncrypted)
  : b.aadharNumber || b.aadhar_number || "";

const panNum = b.panEncrypted
  ? decryptText(b.panEncrypted)
  : b.panNumber || b.pan_number || "";

drawKeyValueTable([
  { label: "Salutation", value: b.salutation || "" },
  { label: "Name", value: `${b.firstName || ""} ${b.lastName || ""}`.trim() },
  { label: "Email", value: b.email || "" },
  { label: "Phone", value: `${b.countryCode || ""} ${b.phoneNumber || ""}`.trim() },
  { label: "Father Name", value: b.fatherName || "" },
  { label: "Gender", value: b.gender || "" },
  { label: "Aadhar Number", value: aadharNum || "Not Provided" },
  { label: "PAN Number", value: panNum || "Not Provided" },
  { label: "Aadhar Attachment", value: attachmentValue(b.aadharAttachment, "basicInfo") },
  { label: "PAN Attachment", value: attachmentValue(b.panAttachment, "basicInfo") },
]);



    // ---------------- QUALIFICATION DETAILS (TABLES) ----------------
    drawSectionHeader("Qualification Details");
    const qualification = candidate.qualification || {};
    const eduArray = Array.isArray(qualification.education)
      ? qualification.education
      : [];

    if (eduArray.length === 0) {
      drawKeyValueTable([{ label: "Details", value: "No qualification records" }]);
    } else {
      eduArray.forEach((edu, index) => {
        ensureSpace(26);
        doc.font("Helvetica-Bold").fontSize(12).text(`Education ${index + 1}`);
        doc.moveDown(0.2);
        const degree = edu.qualification || "";
        const specialization = edu.specialization || edu.subbranch || "";
        const percentage = edu.percentage || "";
        const passingYear = edu.passingYear || edu.yearPassing || "";
        drawKeyValueTable([
          { label: "Degree", value: degree },
          { label: "Specialization", value: specialization },
          { label: "Percentage", value: String(percentage) },
          { label: "Passing Year", value: String(passingYear) },
          {
            label: "Certificate",
            value: attachmentValue(edu.certificateAttachment, "qualification"),
          },
        ]);
      });
    }

    // ---------------- OFFER DETAILS (TABLE) ----------------
    drawSectionHeader("Offer Details");
    const offer = candidate.offerDetails || {};
    drawKeyValueTable([
      { label: "Offer Date", value: offer.offerDate || "" },
      { label: "Date of Joining", value: offer.dateOfJoining || "" },
      { label: "Employee ID", value: offer.employeeId || "" },
      { label: "Interview Remarks", value: offer.interviewRemarks || "" },
      {
        label: "Offer Letter",
        value: attachmentValue(offer.offerLetterAttachment, "offerDetails"),
      },
    ]);

    // ---------------- BANK DETAILS (TABLE) ----------------
    drawSectionHeader("Bank Details");
    const bank = candidate.bankDetails || {};
    const accountNumber = bank.accountEncrypted
      ? decryptText(bank.accountEncrypted)
      : null;
    const ifsc = bank.ifscEncrypted ? decryptText(bank.ifscEncrypted) : null;

    drawKeyValueTable([
      { label: "Bank Name", value: bank.bankName || "" },
      { label: "Branch", value: bank.branchName || "" },
      { label: "Account Number", value: accountNumber || "Not Available" },
      { label: "IFSC Code", value: ifsc || "Not Available" },
      {
        label: "Bank Proof",
        value: attachmentValue(bank.bankAttachment, "bankDetails"),
      },
    ]);

    // ---------------- EMPLOYMENT DETAILS (TABLES) ----------------
   // ---------------- EMPLOYMENT DETAILS (TABLES) ----------------
drawSectionHeader("Employment Details");
const emp = candidate.employmentDetails || {};
const empType = emp.employmentType || emp.experienceType || "";

if (empType === "Fresher") {
  drawKeyValueTable([
    { label: "Employment Type", value: empType },
    { label: "Role Hired", value: emp.hiredRole || "" },
    { label: "Offered CTC", value: emp.fresherCtc || "" },
    { label: "General Remarks", value: emp.generalRemarks || "" },
    {
      label: "Offer Letter",
      value: attachmentValue(emp.offerLetterAttachment, "employmentDetails"),
    },
  ]);
} else {
  const exp = Array.isArray(emp.experiences) ? emp.experiences[0] : undefined;

  if (exp) {
    drawKeyValueTable([
      { label: "Employment Type", value: empType || "Experience" },
      { label: "Company", value: exp.companyName || "" },
      {
        label: "Duration",
        value: `${exp.durationFrom || ""} → ${exp.durationTo || ""}`,
      },
      { label: "Joined CTC", value: exp.joinedCtc || "" },
      { label: "Offered CTC", value: exp.offeredCtc || "" },
      { label: "Reason for Leaving", value: exp.reasonForLeaving || "" },
      { label: "General Remarks", value: exp.generalRemarks || "" },
      {
        label: "Offer Letter",
        value: attachmentValue(exp.offerLetterAttachment, "employmentDetails"),
      },
    ]);

    const pays = Array.isArray(exp.payslipAttachments)
      ? exp.payslipAttachments
      : [];

    if (pays.length > 0) {
      pays.forEach((p, i) => {
        drawKeyValueTable([
          {
            label: `Payslip ${i + 1}`,
            value: attachmentValue(p, "employmentDetails"),
          },
        ]);
      });
    } else {
      drawKeyValueTable([{ label: "Payslips", value: "None" }]);
    }
  } else {
    drawKeyValueTable([{ label: "Employment Type", value: empType || "Experience" }]);
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
