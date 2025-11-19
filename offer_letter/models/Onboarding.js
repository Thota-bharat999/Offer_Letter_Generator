const mongoose = require("mongoose");

//
// ======================= FILE OBJECT SUBSCHEMA =======================
//
const fileObjectSchema = new mongoose.Schema(
  {
    fileName: String,
    filePath: String,
    mimeType: String,
    fileSize: Number,
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

//
// ======================= QUALIFICATION SUBSCHEMA =======================
//
const qualificationSchema = new mongoose.Schema(
  {
    educationType: {
      type: String,
      enum: [
        "SSC",
        "Intermediate",
        "Diploma",
        "Graduation",
        "Post-Graduation",
        "Doctorate",
        "B.Tech",
        "B.E",
        "B.Sc",
        "BCA",
        "B.Com",
        "M.Tech",
        "M.E",
        "M.Sc",
        "MCA",
        "MBA",
        "PhD",
        "Other",
      ],
      required: true,
    },

    institutionName: { type: String, required: true },
    universityOrBoard: { type: String },
    subCourse: { type: String },
    specialization: { type: String },
    yearOfPassing: { type: String },
    percentageOrGPA: { type: String },

    // 🔥 Unlimited certificate uploads as file objects
    certificateAttachments: { type: [fileObjectSchema], default: [] }
  },
  { _id: false }
);

//
// ======================= EXPERIENCE SUB-SCHEMA =======================
//
const experienceSchema = new mongoose.Schema(
  {
    companyName: String,
    exEmployeeId: String,
    durationFrom: Date,
    durationTo: Date,
    joinedCTC: Number,
    finalCTC: Number,

    // 🔥 Unlimited payslips (file objects)
    payslipAttachments: { type: [fileObjectSchema], default: [] },

    consentForBackgroundCheck: { type: Boolean, default: false },
    generalRemarks: String,
  },
  { _id: false }
);

//
// ======================= FRESHER DETAILS =======================
//
const fresherDetailsSchema = new mongoose.Schema(
  {
    internshipCompleted: { type: Boolean, default: false },
    internshipCompany: { type: String },
    internshipDuration: { type: String },

    // 🔥 unlimited training certificates (file objects)
    trainingCertificates: { type: [fileObjectSchema], default: [] },

    collegeName: { type: String },
    projectTitle: { type: String },
  },
  { _id: false }
);

//
// ======================= OFFER DETAILS =======================
//
const offerDetailsSchema = new mongoose.Schema(
  {
    offerDate: Date,
    joiningDate: Date,
    employeeId: String,
    designation: String,
    ctcAnnual: Number,
    ctcWords: String,
    interviewRemarks: String,

    // 🔥 Single offer letter (file object)
    offerLetterAttachment: { type: fileObjectSchema, default: null },

    // 🔥 Unlimited extra documents (file objects)
    additionalOfferDocs: { type: [fileObjectSchema], default: [] },
  },
  { _id: false }
);

//
// ======================= BANK DETAILS =======================
//
const bankDetailsSchema = new mongoose.Schema(
  {
    accountNumber: String,
    ifscCode: String,
    branchName: String,

    // 🔥 Single file object
    bankAttachment: { type: fileObjectSchema, default: null },

    // 🔥 Unlimited additional bank documents
    bankAdditionalDocs: { type: [fileObjectSchema], default: [] },
  },
  { _id: false }
);

//
// ======================= MAIN ONBOARDING SCHEMA =======================
//
const OnboardingSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    guardianName: { type: String, default: null },

    email: { type: String, required: true },
    phoneNumber: { type: String, default: null },

    panNumber: String,
    aadharNumber: String,

    // 🌟 These two now store file objects, not strings
    panAttachment: { type: fileObjectSchema, default: null },
    aadharAttachment: { type: fileObjectSchema, default: null },

    // Qualifications
    qualifications: { type: [qualificationSchema], default: [] },

    // Offer & Bank details
    offerDetails: offerDetailsSchema,
    bankDetails: bankDetailsSchema,

    // Experience
    experienceType: {
      type: String,
      enum: ["Fresher", "Experienced"],
      default: "Fresher",
    },

    experiences: { type: [experienceSchema], default: [] },

    fresherDetails: fresherDetailsSchema,

    status: {
      type: String,
      enum: ["Draft", "Submitted", "OfferGenerated", "Completed"],
      default: "Draft",
    },

    createdBy: String,
    updatedBy: String,

    // 🔥 Global bucket for unidentified uploads (file objects)
    otherAttachments: { type: [fileObjectSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CandidateOnboarding", OnboardingSchema);
