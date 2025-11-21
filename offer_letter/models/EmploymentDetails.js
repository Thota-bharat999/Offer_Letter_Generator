// models/EmploymentDetails.js
const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    fileName: String,
    base64: String,
    mimeType: String,
    fileSize: Number,
    uploadedAt: Date
  },
  { _id: false }
);

// Experience sub-schema
const experienceSchema = new mongoose.Schema(
  {
    companyName: String,
    durationFrom: String,
    durationTo: String,
    joinedCtc: String,
    offeredCtc: String,
    reasonForLeaving: String,

    payslipAttachments: [attachmentSchema]   // Base64 array
  },
  { _id: false }
);

const employmentSchema = new mongoose.Schema(
  {
    draftId: { type: String, required: true, index: true },

    employmentType: {
      type: String,
      enum: ["Fresher", "Experience"],
      required: true
    },

    // Fresher fields
    fresherCtc: String,
    hiredRole: String,
    offerLetterAttachment: attachmentSchema,

    // Experience fields
    experiences: [experienceSchema]  // can store multiple companies

  },
  { timestamps: true }
);

module.exports = mongoose.model("EmploymentDetails", employmentSchema);
