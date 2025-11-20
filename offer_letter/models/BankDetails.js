// models/BankDetails.js
const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  fileName: String,
  mimeType: String,
  fileSize: Number,
  uploadedAt: Date,
});

const bankDetailsSchema = new mongoose.Schema({
  draftId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "BasicInfo" },

  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  ifscCode: { type: String, required: true },
  branchName: String,

  bankAttachment: attachmentSchema,
}, { timestamps: true });

module.exports = mongoose.model("BankDetails", bankDetailsSchema);
