// models/BankDetails.js
const mongoose = require('mongoose');
const { encryptText, decryptText } = require('../utils/cryptoUtil');

const attachmentSchema = new mongoose.Schema({
  fileName: String,
  base64: String,
  mimeType: String,
  fileSize: Number,
  uploadedAt: Date
}, { _id: false });

const bankSchema = new mongoose.Schema({
  draftId: { type: String, required: true, index: true },

  // encrypted versions
  accountEncrypted: {
    iv: String,
    content: String
  },
  ifscEncrypted: {
    iv: String,
    content: String
  },

  bankName: String,
  branchName: String,

  bankAttachment: attachmentSchema
}, { timestamps: true });

// method to set encrypted data
bankSchema.methods.setBankData = function(accountNumber, ifscCode) {
  if (accountNumber) this.accountEncrypted = encryptText(accountNumber);
  if (ifscCode) this.ifscEncrypted = encryptText(ifscCode);
};

// helpers to get decrypted text
bankSchema.methods.getAccountNumber = function() {
  return decryptText(this.accountEncrypted);
};
bankSchema.methods.getIfscCode = function() {
  return decryptText(this.ifscEncrypted);
};

module.exports = mongoose.model('BankDetails', bankSchema);
