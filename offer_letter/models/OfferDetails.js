// models/OfferDetails.js
const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  fileName: String,
  mimeType: String,
  fileSize: Number,
  uploadedAt: Date,
});

const offerDetailsSchema = new mongoose.Schema({
  draftId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "BasicInfo" },

  offerDate: { type: Date, required: true },
  dateOfJoining: { type: Date, required: true },
  employeeId: String,

  offerLetterAttachment: attachmentSchema,
  interviewRemarks: String,
}, { timestamps: true });

module.exports = mongoose.model("OfferDetails", offerDetailsSchema);
