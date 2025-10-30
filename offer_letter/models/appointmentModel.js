const mongoose=require("mongoose");
const SalaryComponentSchema=new mongoose.Schema({
     component:{
        type:String,
        required:[true,"Salary Component Name is Required"],
        trim:true,
     },
     annualAmount:{
        type:Number,
        required:[true,"Annual Amount is Required"],
        min:[0,"Annual Amount Cannot be Negative"],

     },
     monthlyAmount:{
        type:Number,
        required:[true,"Monthly Amount is Required"],
        min:[0,"Monthly Amount Cannot be Negative"],
     },
},{_id:false})

const AppointmentLetterSchema = new mongoose.Schema(
  {
    employeeName: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Employee address is required"],
      trim: true,
    },
    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
    },
    appointmentDate: {
      type: Date,
      required: [true, "Appointment date is required"],
    },
    ctcAnnual: {
      type: Number,
      required: [true, "CTC annual amount is required"],
      min: [0, "CTC annual cannot be negative"],
    },
    ctcWords: {
      type: String,
      required: [true, "CTC in words is required"],
      trim: true,
    },

    // ✅ Salary Structure
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

    // HR Details
    // hrName: {
    //   type: String,
    //   required: [true, "HR name is required"],
    //   trim: true,
    // },
    // hrDesignation: {
    //   type: String,
    //   required: [true, "HR designation is required"],
    //   trim: true,
    // },

    // Meta Info
    dateIssued: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["draft", "issued", "accepted", "rejected", "cancelled"],
      default: "draft",
    },
    pdfPath: {
      type: String,
      default: null,
    },

    // ✅ Creator Reference
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HrAdmin",
      required: [true, "Appointment letter must be created by an HR admin"],
    },
  },
  { timestamps: true }
);

// ====================== MODEL EXPORT ======================
const AppointmentLetter = mongoose.model("AppointmentLetter", AppointmentLetterSchema);
module.exports = AppointmentLetter;