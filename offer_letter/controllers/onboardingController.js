const logger = require('../logger/logger');
const Messages = require('../MsgConstants/messages');
// controllers/onboardingController.js

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

    if (!education || !Array.isArray(education) || education.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Education array is required"
      });
    }

    // Convert uploaded files -> Base64 (YOUR EXISTING LOGIC)
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

    // Check required fields in each education item
    for (let i = 0; i < education.length; i++) {
      const item = education[i];
      if (!item.subbranch || item.subbranch.trim() === "") {
        return res.status(400).json({
          success: false,
          message: `subbranch is required in education item at index ${i}`
        });
      }
      if (!item.yearPassing || item.yearPassing.trim() === "") {
        return res.status(400).json({
          success: false,
          message: `yearPassing is required in education item at index ${i}`
        });
      }
    }

    // Check if odAttachment provided either in new uploads or existing record
    let record = await Qualification.findOne({ draftId });
    if (!record) record = new Qualification({ draftId });

    if (!attachments.od && !record.odAttachment) {
      return res.status(400).json({
        success: false,
        message: "ODAttachment is required"
      });
    }

    // Attach files to the correct education level
    education.forEach((item) => {
      if (attachments[item.qualification]) {
        item.certificateAttachment = attachments[item.qualification];
      }
    });

    // Save multiple educations
    record.education = education;

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
    const {
      draftId,
      bankDetails
    } = req.body;

    if (!draftId) {
      return res.status(400).json({
        success: false,
        message: "draftId is required"
      });
    }

     const {
      bankName,
      branchName,
      accountNumber,
      confirmAccountNumber,
      ifscCode
    } = bankDetails;

    // 🔍 Check confirmAccountNumber
    if (accountNumber !== confirmAccountNumber) {
      return res.status(400).json({
        success: false,
        message: "Account Number and Confirm Account Number do not match"
      });
    }

    // Convert uploaded file → Base64
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

    // Find or create record
    let record = await BankDetails.findOne({ draftId });
    if (!record) record = new BankDetails({ draftId });

    // Assign UI fields
    record.bankName = bankName;
    record.branchName = branchName;

    // Hash sensitive fields using model method
    record.setBankData(accountNumber, ifscCode);

    // Add file attachment
    if (attachments.bankAttachment) {
      record.bankAttachment = attachments.bankAttachment;
    }

    await record.save();

    return res.status(200).json({
      success: true,
      message: "Bank details saved successfully",
      draftId,
      data: record
    });

  } catch (error) {
    console.error("Bank Save Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save bank details",
      error: error.message
    });
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
      if (attachments.marksheet) record.marksheetAttachment = attachments.marksheet;
      if (attachments.od) record.odAttachment = attachments.od;
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

