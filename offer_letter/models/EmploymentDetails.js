// models/EmploymentDetails.js
const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  fileName: String,
  mimeType: String,
  fileSize: Number,
  uploadedAt: Date,
});

// Experience sub-schema
const experienceSchema = new mongoose.Schema({
  companyName: String,
  durationFrom: Date,
  durationTo: Date,
  joinedCtc: String,
  offeredCtc: String,
  isExEmployee: Boolean,
  payslipAttachment: [attachmentSchema],  // Multiple payslips
});

const employmentDetailsSchema = new mongoose.Schema({
  draftId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "BasicInfo" },

  employmentType: { type: String, enum: ["Fresher", "Experience"], required: true },

  // Fresher
  roleHired: String,
  fresherCtc: String,
  offerLetterAttachment: attachmentSchema,

  // Experience
  experiences: [experienceSchema],

  remarks: String,
}, { timestamps: true });

module.exports = mongoose.model("EmploymentDetails", employmentDetailsSchema);
