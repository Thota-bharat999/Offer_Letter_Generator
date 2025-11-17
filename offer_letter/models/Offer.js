const mongoose = require("mongoose");

// ====================== SALARY COMPONENT SUBSCHEMA ======================
const SalaryComponentSchema = new mongoose.Schema(
  {
    component: {
      type: String,
      required: [true, "Salary component name is required"],
      trim: true,
    },
    annualAmount: {
      type: Number,
      required: [true, "Annual amount is required"],
      min: [0, "Annual amount cannot be negative"],
    },
    monthlyAmount: {
      type: Number,
      required: [true, "Monthly amount is required"],
      min: [0, "Monthly amount cannot be negative"],
    },
  },
  { _id: false } // avoid extra _id for each component
);

// ====================== MAIN OFFER LETTER SCHEMA ======================
const OfferLetterSchema = new mongoose.Schema(
  {
    candidateName: {
      type: String,
      required: [true, "Candidate name is required"],
      trim: true,
    },
    candidateAddress: {
      type: String,
      required: [true, "Candidate address is required"],
      trim: true,
    },
    position: {
      type: String,
      required: [true, "Position is required"],
      trim: true,
    },
    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
    },
    joiningTime: {
      type: String,
      required:[true,"Joining time is required"],
      default: "10:30 AM",
    },
    ctcAmount: {
      type: Number,
      required: [true, "CTC amount is required"],
      min: [0, "CTC cannot be negative"],
    },
    ctcInWords: {
      type: String,
      required: [true, "CTC in words is required"],
      trim: true,
    },

    // ✅ Auto-calculated by controller
    salaryBreakdown: {
      type: [SalaryComponentSchema],
      default: [],
      validate: {
        validator: function (arr) {
          return Array.isArray(arr);
        },
        message: "Salary breakdown must be an array",
      },
    },

    // Offer Metadata
    dateIssued: {
      type: Date,
      default: Date.now,
    },
    probationPeriodMonths: {
      type: Number,
      default: 6,
      min: [0, "Probation period cannot be negative"],
    },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "cancelled"],
      default: "draft",
    },
    pdfPath: {
     type: String,
     default: null,
    },


    // ✅ Linked Admin (Creator)
    // createdBy: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "HrAdmin",
    //   required: [true, "Offer must be created by an admin"],
    // },
  },
  { timestamps: true }
);

// ====================== MODEL EXPORT ======================
const OfferLetter = mongoose.model("OfferLetter", OfferLetterSchema);
module.exports = OfferLetter;
