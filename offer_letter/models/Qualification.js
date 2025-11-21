// models/Qualification.js
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

const qualificationSchema = new mongoose.Schema(
  {
    draftId: { type: String, required: true, index: true },

    qualification: String,
    specialization: String,
    percentage: String,
    university: String,
    passingYear: String,

    marksheetAttachment: attachmentSchema,
    odAttachment: attachmentSchema
  },
  { timestamps: true }
);

module.exports = mongoose.model("Qualification", qualificationSchema);
