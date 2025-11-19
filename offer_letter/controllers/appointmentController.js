const AppointmentLetter=require('../models/appointmentModel');
const generateAppointmentPDF = require("../utils/appointmentPdfGenerator");
const fs=require('fs');
const path=require('path')
const mongoose=require('mongoose');
const logger = require('../logger/logger');
const {
  BASIC_WAGE_PERCENT,
  HRA_PERCENT,
  SPECIAL_ALLOWANCES_PERCENT,
  TRAVEL_ALLOWANCES_PERCENT,
  OTHER_ALLOWANCES_PERCENT,
} = require("../constants/salaryStructure");
const Messages = require('../MsgConstants/messages');

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
        message: Messages.ERROR.UNAUTHORIZED,
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
        return res.status(400).json({message:Messages.APPOINTMENT_LETTER.MISSING_FIELDS_ERROR});
    }
    const totalCTC=Number(ctcAnnual);
    if(isNaN(totalCTC)|| totalCTC <=0){
        return res.status(400).json({message:Messages.APPOINTMENT_LETTER.INVALID_CTC})
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
    const pdfPath = await generateAppointmentPDF({
      ...appointmentData,
      companyName: "Amazon IT Solutions",
      companyAddress: "Hyderabad, Telangana, India",
    });

    const appointmentLetter=new AppointmentLetter({
        ...appointmentData,
        pdfPath,
    });
    await appointmentLetter.save();
    return res.status(201).json({
        success:true,
         message:Messages.APPOINTMENT_LETTER.CREATE_SUCCESS,
          data: appointmentLetter,
        pdfFile: appointmentLetter.pdfPath,
    })
    }catch(error){
        logger.error("Error creating appointment letter:", error);
    res.status(500).json({
      success: false,
      message: Messages.ERROR.SERVER,
      error: error.message,
    });

    }
}

exports.updateAppointmentLetter=async(req,res)=>{
  try{
    if(!req.admin || !req.admin.id){
      return res.status(401).json({
        success: false,
        message:Messages.ERROR.UNAUTHORIZED,
      });
    }
    const {id}=req.params;
    const updates=req.body;
    const appointment=await AppointmentLetter.findById(id);
    if(!appointment){
      return res.status(404).json({
        success: false,
        message: Messages.APPOINTMENT_LETTER.APPOINTMENT_lETTER_NOT_FOUND,
      })
    }
    if(updates.ctcAnnual){
      const newCTC=Number(updates.ctcAnnual);
      if (isNaN(newCTC) || newCTC <= 0) {
        return res
          .status(400)
          .json({ success: false, message:Messages.APPOINTMENT_LETTER.INVALID_CTC });
      }
      appointment.ctcAnnual = newCTC;
      appointment.salaryBreakdown = generateSalaryBreakdown(newCTC);
    }
    if(updates.designation) appointment.designation=updates.designation.trim();
    Object.keys(updates).forEach((key)=>{
       if (["designation", "ctcAnnual"].includes(key)) return;
      if (updates[key] !== undefined) appointment[key] = updates[key];
    });
    await appointment.save();
    return res.status(200).json({
      success: true,
      message:Messages.APPOINTMENT_LETTER.CREATE_SUCCESS,
      data: {
        _id: appointment._id,
        employeeName: appointment.employeeName,
        designation: appointment.designation,
        ctcAnnual: appointment.ctcAnnual,
        address:appointment.address,
        joiningDate:appointment.joiningDate,
        appointmentDate:appointment.appointmentDate,
        ctcWords:appointment.ctcWords,
        ctcAnnual:appointment.ctcAnnual,
        hrName:appointment.hrName,
        hrDesignation:appointment.hrDesignation,
      },
    });
  }catch(error){
    logger.error("Error updating appointment letter:", error);
    res.status(500).json({
      success: false,
      message: Messages.ERROR.SERVER,
      error: error.message,
    });

  }
}
// Delete Appointement Letter
exports.deleteAppointmentLetter=async(req,res)=>{
  try{
    if(!req.admin || !req.admin.id){
      return res.status(401).json({
        success:false,
        messsage:Messages.ERROR.UNAUTHORIZED,
      });
    }
    const {id}=req.params;
    const appointment=await AppointmentLetter.findById(id);
    if(!appointment){
      return res.status(404).json({
        success:false,
        message:Messages.APPOINTMENT_LETTER.APPOINTMENT_lETTER_NOT_FOUND,
      })
    }
    if(appointment.pdfPath && fs.existsSync(appointment.pdfPath)){
      fs.unlinkSync(appointment.pdfPath);
    }
    await AppointmentLetter.findByIdAndDelete(id);
    return res.status(200).json({
      success:true,
      message:Messages.APPOINTMENT_LETTER.DELETE_SUCCESS
    });

  }catch(error){ 
    logger.error("Error Deleting Appointment Letter:",error);
    return res.status(500).json({
      success:false,
      message:Messages.ERROR.SERVER,
      error:error.messsage,
    });

  }
};
// getAll Appointment Lettters
exports.getAllAppointmentLetters=async(req,res)=>{
  try{
    if(!req.admin || !req.admin.id){
      return res.status(401).json({
        success:false,
        message:Messages.ERROR.UNAUTHORIZED,
      });
    }
    const appointmentLetters=await AppointmentLetter.find().sort({created:-1});
    const result=appointmentLetters.map((letter)=>({
      _id:letter._id,
      employeeName:letter.employeeName,
      designation:letter.designation,
      joiningDate:letter.joiningDate,
      ctcAnnual:letter.ctcAnnual,
      appointmentDate:letter.appointmentDate,

    }));
    if(result.length==0){
      return res.status(404).json({
        success:false,
        message:Messages.APPOINTMENT_LETTER.NO_APPOINTMENT_LETTER,
        data:[],
      });
    }
return res.status(200).json({
  success:true,
  message:Messages.APPOINTMENT_LETTER.APPOINTMENT_FETCHED,
  data:result,
})
  }catch(error){
    logger.error("Error fetching appointment letters:", error);
    return res.status(500).json({
      success: false,
      message: messages.ERROR.SERVER,
      error: error.message,
    });

  }
}

// Get Appointement letter By Id 
exports.getAppointmentLetterById = async (req, res) => {
  try {
    //Verify HR admin access
    if (!req.admin || !req.admin.id) {
      return res.status(401).json({
        success: false,
        message: Messages.ERROR.UNAUTHORIZED,
      });
    }

    const { id } = req.params;

    // Fetch appointment letter by ID
    const letter = await AppointmentLetter.findById(id);

    if (!letter) {
      return res.status(404).json({
        success: false,
        message: Messages.APPOINTMENT_LETTER.NO_APPOINTMENT_LETTER,
      });
    }

    // Format specific response
    const result = {
      _id: letter._id,
      employeeName: letter.employeeName,
      designation: letter.designation,
      joiningDate: letter.joiningDate,
      address: letter.address,
      hrName: letter.hrName,
      hrDesignation: letter.hrDesignation,
      ctcAnnual: letter.ctcAnnual,
      ctcWords: letter.ctcWords,
      salaryBreakdown: letter.salaryBreakdown,
    };

    // ✅ Success response
    return res.status(200).json({
      success: true,
      message: Messages.APPOINTMENT_LETTER.APPOINTMENT_FETCHED,
      data: result,
    });
  } catch (error) {
    logger.error("Error fetching appointment letter by ID:", error);
    return res.status(500).json({
      success: false,
      message: Messages.ERROR.SERVER,
      error: error.message,
    });
  }
};

exports.generateAppointmentPDF = async (req, res) => {
  try {
    // 🔐 HR Admin authorization check
    if (!req.admin || !req.admin.id) {
      return res.status(401).json({
        success: false,
        message:Messages.ERROR.UNAUTHORIZED,
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
      salaryBreakdown,
      hrName,
      hrDesignation,
    } = req.body;

    // ✅ Validate required fields
    if (
      !employeeName ||
      !designation ||
      !joiningDate ||
      !appointmentDate ||
      !ctcAnnual ||
      !ctcWords ||
      !hrName ||
      !hrDesignation
    ) {
      return res.status(400).json({
        success: false,
        message:Messages.APPOINTMENT_LETTER.MISSING_FIELDS_ERROR,
      });
    }

    // ✅ Prepare data object for EJS template
    const appointmentData = {
      employeeName: employeeName.trim(),
      designation: designation.trim(),
      address: address || "Address Not Provided",
      joiningDate,
      appointmentDate,
      ctcAnnual,
      ctcWords,
      salaryBreakdown: salaryBreakdown || [],
      hrName: hrName.trim(),
      hrDesignation: hrDesignation.trim(),
      companyName: "Amazon IT Solutions",
      companyAddress:
        "Amazon IT Solutions Pvt. Ltd.\nPlot No. 23, Hi-Tech City Road,\nHyderabad, Telangana – 500081",
    };

    // ✅ Generate PDF via Puppeteer & EJS
    const pdfPath = await generateAppointmentPDF(appointmentData);

    // ✅ Save to DB (optional: create or update appointment)
    const appointment = await AppointmentLetter.create({
      ...appointmentData,
      pdfPath,
      createdBy: req.admin.id,
    });

    // ✅ Success response
    return res.status(201).json({
      success: true,
      message: Messages.APPOINTMENT_LETTER.GENERATE_PDF,
      pdfPath,
      data: {
        _id: appointment._id,
        employeeName: appointment.employeeName,
        designation: appointment.designation,
        pdfPath: appointment.pdfPath,
      },
    });
  } catch (error) {
    logger.error("Error generating appointment PDF:", error);
    return res.status(500).json({
      success: false,
      message: Messages.ERROR.SERVER,
      error: error.message,
    });
  }
};

// get Download Link for Appointment Letter PDF
exports.downloadAppointmentPDF = async (req, res) => {
  try {
    // 🔐 Verify HR admin access
    if (!req.admin || !req.admin.id) {
      return res.status(401).json({
        success: false,
        message: Messages.ERROR.UNAUTHORIZED,
      });
    }

    const { id } = req.params;

    // ✅ Find appointment by ID
    const appointment = await AppointmentLetter.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: Messages.APPOINTMENT_LETTER.APPOINTMENT_lETTER_NOT_FOUND,
      });
    }

    if (!appointment.pdfPath) {
      return res.status(400).json({
        success: false,
        message:Messages.APPOINTMENT_LETTER.NO_PDF_FILE,
      });
    }

    let pdfPath = path.resolve(appointment.pdfPath);

    // ✅ Check file existence, if not generate it
    if (!fs.existsSync(pdfPath)) {
      logger.info("PDF not found — generating now...");
      pdfPath = await generateAppointmentPDF({
        ...appointment.toObject(),
        companyName: "Amazon IT Solutions",
        companyAddress: "Hyderabad, Telangana, India",
      });
      appointment.pdfPath = pdfPath;
      await appointment.save();
    }

    // ✅ Send PDF as download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(pdfPath)}"`
    );

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    fileStream.on("error", (err) => {
      logger.error("Error streaming PDF file:", err);
      res.status(500).json({
        success: false,
        message:Messages.APPOINTMENT_LETTER.ERROR_DOWNLAOD,
      });
    });
  } catch (error) {
    logger.error("Error downloading appointment letter:", error);
    return res.status(500).json({
      success: false,
      message: Messages.ERROR.SERVER,
      error: error.message,
    });
  }
};

