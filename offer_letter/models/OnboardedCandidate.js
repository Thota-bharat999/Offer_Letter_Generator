// models/OnboardedCandidate.js
const mongoose = require("mongoose");

const onboardSchema = new mongoose.Schema(
  {
    draftId: { type: String, required: true, index: true },

    basicInfo: Object,
    qualification: Object,
    offerDetails: Object,
    bankDetails: Object,
    employmentDetails: Object,

    submittedAt: { type: Date, default: Date.now },
    status: { type: String, default: "completed" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("OnboardedCandidate", onboardSchema);
