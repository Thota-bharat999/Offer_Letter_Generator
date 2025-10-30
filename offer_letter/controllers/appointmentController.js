const AppointmentLetter=require('../models/appointmentModel')
const mongoose=require('mongoose');
const {
  BASIC_WAGE_PERCENT,
  HRA_PERCENT,
  SPECIAL_ALLOWANCES_PERCENT,
  TRAVEL_ALLOWANCES_PERCENT,
  OTHER_ALLOWANCES_PERCENT,
} = require("../constants/salaryStructure");

const generateSalaryBreakdown = (ctcAmount) => {
  const ctc = Number(ctcAmount);

  if (isNaN(ctc) || ctc <= 0) {
    throw new Error("Invalid CTC amount provided");
  }

  const structure = [
    { component: "Basic Wage", percent: BASIC_WAGE_PERCENT },
    { component: "HRA", percent: HRA_PERCENT },
    { component: "Special Allowances", percent: SPECIAL_ALLOWANCES_PERCENT },
    { component: "Travel Allowances", percent: TRAVEL_ALLOWANCES_PERCENT },
    { component: "Other Allowances", percent: OTHER_ALLOWANCES_PERCENT },
  ];

  // Step 1️⃣ Calculate each component
  let salaryBreakdown = structure.map((item) => {
    const annual = Math.round(ctc * item.percent);
    return {
      component: item.component,
      annualAmount: annual,
      monthlyAmount: Math.round(annual / 12),
    };
  });

  // Step 2️⃣ Adjust rounding differences
  const totalAnnual = salaryBreakdown.reduce((sum, c) => sum + c.annualAmount, 0);
  const diff = Math.round(ctc - totalAnnual);
  if (diff !== 0) {
    salaryBreakdown[salaryBreakdown.length - 1].annualAmount += diff;
    salaryBreakdown[salaryBreakdown.length - 1].monthlyAmount = Math.round(
      salaryBreakdown[salaryBreakdown.length - 1].annualAmount / 12
    );
  }

  // Step 3️⃣ Add total row (Fixed CTC)
  const fixedAnnual = salaryBreakdown.reduce((sum, c) => sum + c.annualAmount, 0);
  const fixedMonthly = Math.round(fixedAnnual / 12);
  salaryBreakdown.push({
    component: "Fixed CTC",
    annualAmount: fixedAnnual,
    monthlyAmount: fixedMonthly,
  });

  return salaryBreakdown;
};

exports.createAppointmentLetter=async(req,res)=>{
    try{
        if (!req.admin || !req.admin.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Admin credentials missing.",
      });
    }
    const {
         employeeName,
      designation,
      address,
      joiningDate,
      appointmentDate,
      ctcAnnual,
      ctcWords,
      hrName,
      hrDesignation,

    }=req.body;
    if(!employeeName || !designation || !address || !joiningDate || !appointmentDate || !ctcAnnual || !ctcWords ||  !hrName || !hrDesignation){
        return res.status(400).json({message:"All fields are Required"});
    }
    const totalCTC=Number(ctcAnnual);
    if(isNaN(totalCTC)|| totalCTC <=0){
        return res.status(400).json({message:"Invalid CTC Amount"})
    }
    const salaryBreakdown=generateSalaryBreakdown(totalCTC);
    const createdBy = req.admin.id;

    const appointmentData={
        employeeName:employeeName.trim(),
        designation:designation.trim(),
        address:address.trim(),
        joiningDate,
        appointmentDate,
        ctcAnnual:Math.round(totalCTC),
        ctcWords:ctcWords.trim(),
      hrName: hrName.trim(),
      hrDesignation: hrDesignation.trim(),
      salaryBreakdown,
      createdBy,
    }
    // const pdfPath = await generateAppointmentPDF({
    //   ...appointmentData,
    //   companyName: "Amazon IT Solutions",
    //   companyAddress: "Hyderabad, Telangana, India",
    // });

    const appointmentLetter=new AppointmentLetter({
        ...appointmentData,
        // pdfPath,
    });
    await appointmentLetter.save();
    return res.status(201).json({
        success:true,
         message: "Appointment letter created successfully with salary breakdown and PDF.",
          data: appointmentLetter,
        //    pdfFile: appointmentLetter.pdfPath,
    })
    }catch(error){
        console.error("❌ Error creating appointment letter:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating appointment letter",
      error: error.message,
    });

    }
}