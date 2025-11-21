const mongoose = require("mongoose");
const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "12345678901234567890123456789012"; // 32 bytes
const DRAFT_SALT = process.env.DRAFT_SALT || "default-salt";

// 🔐 AES-256 Encryption
function encryptText(value) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);

  return {
    iv: iv.toString("base64"),
    content: encrypted.toString("base64")
  };
}

// 🔓 AES-256 Decryption
function decryptText(data) {
  if (!data) return "";
  const iv = Buffer.from(data.iv, "base64");
  const encryptedText = Buffer.from(data.content, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
}

// 🆔 Generate draftId
function generateDraftId(aadhar, pan) {
  const normalized = `${aadhar}|${pan}|${DRAFT_SALT}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

const attachmentSchema = new mongoose.Schema({
  fileName: String,
  base64: String,
  mimeType: String,
  fileSize: Number,
  uploadedAt: Date
});

// ⭐ UPDATED BASIC INFO SCHEMA
const basicInfoSchema = new mongoose.Schema(
  {
    draftId: { type: String, required: true, index: true },

    // UI Fields
    salutation: String,   // 🆕 Mr / Ms / Mrs / Dr
    firstName: String,
    lastName: String,
    fatherName: String,
    gender: String,       // 🆕 Male / Female / Other
    email: String,
    countryCode: String,
    phoneNumber: String,

    // Sensitive encrypted fields
    aadharEncrypted: {},
    panEncrypted: {},

    // Attachments (Base64)
    aadharAttachment: attachmentSchema,
    panAttachment: attachmentSchema
  },
  { timestamps: true }
);

// Methods
basicInfoSchema.statics.generateDraftId = generateDraftId;

basicInfoSchema.methods.setAadhar = function (value) {
  this.aadharEncrypted = encryptText(value);
};

basicInfoSchema.methods.setPan = function (value) {
  this.panEncrypted = encryptText(value);
};

basicInfoSchema.methods.getAadhar = function () {
  return decryptText(this.aadharEncrypted);
};

basicInfoSchema.methods.getPan = function () {
  return decryptText(this.panEncrypted);
};

module.exports = mongoose.model("BasicInfo", basicInfoSchema);
