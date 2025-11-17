const mongoose = require("mongoose");

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

    // ✔ UNLIMITED certificate uploads for each qualification
    certificateAttachments: { type: [String], default: [] },
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

    // ✔ Unlimited payslips allowed
    payslipAttachments: { type: [String], default: [] },

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

    // ✔ UNLIMITED training certificates
    trainingCertificates: { type: [String], default: [] },

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

    // ✔ SINGLE offer letter PDF
    offerLetterAttachment: { type: String, default: null },

    // ✔ MULTIPLE OFFER-RELATED DOCUMENTS (optional)
    additionalOfferDocs: { type: [String], default: [] },
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

    // ✔ SINGLE bank proof upload
    bankAttachment: { type: String, default: null },

    // ✔ UNLIMITED supporting bank documents
    bankAdditionalDocs: { type: [String], default: [] },
  },
  { _id: false }
);

//
// ======================= MAIN ONBOARDING SCHEMA =======================
//
const OnboardingSchema = new mongoose.Schema(
  {
    // ================== 1️⃣ Basic Candidate Info ==================
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    guardianName: { type: String, default: null },

    email: { type: String, required: true },
    phoneNumber: { type: String, default: null },

    panNumber: { type: String },
    aadharNumber: { type: String },

    // ✔ Single uploads
    panAttachment: { type: String, default: null },
    aadharAttachment: { type: String, default: null },

    // ================== 2️⃣ Unlimited Qualifications ==================
    qualifications: { type: [qualificationSchema], default: [] },

    // ================== 3️⃣ Offer Details ==================
    offerDetails: offerDetailsSchema,

    // ================== 4️⃣ Bank Details ==================
    bankDetails: bankDetailsSchema,

    // ================== 5️⃣ Experience (Unlimited) ==================
    experienceType: {
      type: String,
      enum: ["Fresher", "Experienced"],
      default: "Fresher",
    },

    experiences: { type: [experienceSchema], default: [] },

    // ================== 6️⃣ Fresher Details ==================
    fresherDetails: fresherDetailsSchema,

    // ================== 7️⃣ Onboarding Status & Meta ==================
    status: {
      type: String,
      enum: ["Draft", "Submitted", "OfferGenerated", "Completed"],
      default: "Draft",
    },

    createdBy: String,
    updatedBy: String,

    // ================== 8️⃣ GLOBAL ATTACHMENT BUCKET (optional) ==================
    // For files not belonging to any category
    otherAttachments: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CandidateOnboarding", OnboardingSchema);
