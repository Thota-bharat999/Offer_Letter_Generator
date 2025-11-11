const mongoose = require("mongoose");

// 🎓 Sub-schema for Qualification / Education
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
    certificateAttachment: { type: String }, // file path (PDF/JPG)
  },
  { _id: false }
);

const OnboardingSchema = new mongoose.Schema(
  {
    // ================== 1️ Candidate Info ==================
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    guardianName:{type:String,required:true},
    fatherName: { type: String },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    panNumber: { type: String },
    aadharNumber: { type: String },
    panAttachment: { type: String },
    aadharAttachment: { type: String },

    // ================== 2️ Multiple Qualifications ==================
    qualifications: [qualificationSchema],

    // ==================  3️ Offer Details ==================
    offerDetails: {
      offerDate: Date,
      joiningDate: Date,
      employeeId: String,
      designation: String,
      ctcAnnual: Number,
      ctcWords: String,
      interviewRemarks: String,
      offerLetterAttachment: String,
    },

    // ==================  4️ Bank Details ==================
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      branchName: String,
      bankAttachment: String,
    },

    // ==================  5️ Experience Type ==================
    experienceType: {
      type: String,
      enum: ["Fresher", "Experienced"],
      default: "Fresher",
    },

    experiences: [
      {
        companyName: String,
        exEmployeeId: String,
        durationFrom: Date,
        durationTo: Date,
        joinedCTC: Number,
        finalCTC: Number,
        payslipAttachment: String,
        consentForBackgroundCheck: { type: Boolean, default: false },
        generalRemarks: String,
      },
    ],

    // ==================  6️ Fresher Details ==================
    fresherDetails: {
      internshipCompleted: { type: Boolean, default: false },
      internshipCompany: { type: String },
      internshipDuration: { type: String },
      trainingCertificate: { type: String },
      collegeName: { type: String },
      projectTitle: { type: String },
    },

    // ================== 📋 7️⃣ Status & Meta ==================
    status: {
      type: String,
      enum: ["Draft", "Submitted", "OfferGenerated", "Completed"],
      default: "Draft",
    },
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("CandidateOnboarding", OnboardingSchema);
