// models/Qualification.js
const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
    draftId: { type: String, required: true },
  fileName: String,
  mimeType: String,
  fileSize: Number,
  uploadedAt: Date,
});

const qualificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "BasicInfo" },

  qualification: { type: String, required: true },
  percentage: String,
  yearOfPassing: String,

  marksheetAttachment: attachmentSchema,
  odAttachment: attachmentSchema,   // Optional
}, { timestamps: true });

module.exports = mongoose.model("Qualification", qualificationSchema);
