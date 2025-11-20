// models/BasicInfo.js
const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  fileName: String,
  mimeType: String,
  fileSize: Number,
  uploadedAt: Date,
});

const basicInfoSchema = new mongoose.Schema({
  draftId: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  fatherName: String,
  email: { type: String, required: true },
  countryCode: String,
  phoneNumber: String,
  aadharNumber: String,
  panNumber: String,

  aadharAttachment: attachmentSchema,
  panAttachment: attachmentSchema,
}, { timestamps: true });

module.exports = mongoose.model("BasicInfo", basicInfoSchema);
