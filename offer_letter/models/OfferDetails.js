// models/OfferDetails.js
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

const offerDetailsSchema = new mongoose.Schema(
  {
    draftId: { type: String, required: true, index: true },

    offerDate: String,
    dateOfJoining: String,
    employeeId: String,
    interviewRemarks: String,

    offerLetterAttachment: attachmentSchema
  },
  { timestamps: true }
);

module.exports = mongoose.model("OfferDetails", offerDetailsSchema);
