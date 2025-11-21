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

const educationSchema = new mongoose.Schema(
  {
    qualification: { type: String, required: true },      // B.Tech, Intermediate, 10th
    specialization: String,
    percentage: String,
    university: String,
    passingYear: String,

    certificateAttachment: attachmentSchema       // marksheet / OD / 10th memo
  },
  { _id: false }
);

const qualificationSchema = new mongoose.Schema(
  {
    draftId: { type: String, required: true, index: true },

    education: [educationSchema],                 // ARRAY OF EDUCATIONS
  },
  { timestamps: true }
);

module.exports = mongoose.model("Qualification", qualificationSchema);
