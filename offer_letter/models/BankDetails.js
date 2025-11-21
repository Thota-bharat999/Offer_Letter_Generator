// models/BankDetails.js
const mongoose = require("mongoose");
const crypto = require("crypto");

// SALT for hashing account number + IFSC
const SALT_KEY = process.env.BANK_SALT || "default-bank-salt";

// 🔐 Hash function directly inside model (NO controller hashing)
function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(value + "|" + SALT_KEY)
    .digest("hex");
}

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

const bankSchema = new mongoose.Schema(
  {
    draftId: { type: String, required: true, index: true },

    // hashed fields (never store raw)
    accountNumberHashed: String,
    ifscCodeHashed: String,

    bankName: String,
    branchName: String,

    bankAttachment: attachmentSchema
  },
  { timestamps: true }
);

// ⚡ Model method to set hashed values
bankSchema.methods.setBankData = function (accountNumber, ifscCode) {
  if (accountNumber) {
    this.accountNumberHashed = hashValue(accountNumber);
  }
  if (ifscCode) {
    this.ifscCodeHashed = hashValue(ifscCode);
  }
};

module.exports = mongoose.model("BankDetails", bankSchema);
