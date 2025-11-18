const OfferLetter = require("../models/Offer");
const generateOfferPDF= require("../utils/pdfGenerator");
const fs=require("fs");
const path=require("path");
const mongoose=require("mongoose")
const sendEmail=require("../services/emailService")
const logger = require('../logger/logger');
const messages = require('../MsgConstants/messages');

const {
  BASIC_WAGE_PERCENT,
  HRA_PERCENT,
  SPECIAL_ALLOWANCES_PERCENT,
  TRAVEL_ALLOWANCES_PERCENT,
  OTHER_ALLOWANCES_PERCENT,
} = require("../constants/salaryStructure");
const Messages = require("../MsgConstants/messages");

//
// ======================== HELPER FUNCTION ========================
//

// ✅ Helper: Generate salary breakdown (auto-rounded, accurate, no NaN)
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

  // Step 1️⃣ Calculate & round all components
  let salaryBreakdown = structure.map((item) => {
    const annual = Math.round(ctc * item.percent);
    return {
      component: item.component,
      annualAmount: annual,
      monthlyAmount: Math.round(annual / 12),
    };
  });

  // Step 2️⃣ Adjust rounding difference (Kept for annual consistency)
  const totalAnnual = salaryBreakdown.reduce((sum, c) => sum + c.annualAmount, 0);
  const diff = Math.round(ctc - totalAnnual);

  if (diff !== 0) {
    // This assumes the last component is the one to absorb the difference.
    salaryBreakdown[salaryBreakdown.length - 1].annualAmount += diff;
    // Recalculate monthly amount for the adjusted component
    salaryBreakdown[salaryBreakdown.length - 1].monthlyAmount = Math.round(
      salaryBreakdown[salaryBreakdown.length - 1].annualAmount / 12
    );
  }

  // Step 3️⃣ Compute final totals
  const fixedAnnual = salaryBreakdown.reduce((sum, c) => sum + c.annualAmount, 0);
  const fixedMonthly = salaryBreakdown.reduce((sum, c) => sum + c.monthlyAmount, 0);

  // Step 4️⃣ Calculate target monthly for Fixed CTC
  const targetMonthly = Math.round(fixedAnnual / 12);

  // Step 5️⃣ Adjust the last component's monthly to match target
  const monthlyDiff = targetMonthly - fixedMonthly;
  if (monthlyDiff !== 0) {
    salaryBreakdown[salaryBreakdown.length - 1].monthlyAmount += monthlyDiff;
  }

  // Step 6️⃣ Add "Fixed CTC" row at the end
  salaryBreakdown.push({
    component: "Fixed CTC",
    annualAmount: fixedAnnual,
    monthlyAmount: targetMonthly,
  });

  return salaryBreakdown;
};

//
// ======================== CREATE OFFER ========================
//
exports.createOfferLetter = async (req, res) => {
  try {
    // 🔥 Admin Safety Check
    // if (!req.admin || !req.admin.id) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Unauthorized: Admin credentials missing.",
    //   });
    // }

    const {
      candidateName,
      candidateAddress,
      position,
      joiningDate,
      joiningTime,
      ctcAmount,
      ctcInWords,
      probationPeriodMonths,
    } = req.body;

    // ✅ Validate required fields
    if (
      !candidateName ||
      !candidateAddress ||
      !position ||
      !joiningDate ||
      !ctcAmount ||
      !ctcInWords
    ) {
      return res.status(400).json({
        success: false,
        message:Messages.OFFER.MISSING_FIELDS_ERROR,
      });
    }

    // ✅ Admin reference
    const createdBy = req.admin.id;

    // ✅ Parse and validate CTC
    const totalCTC = Number(ctcAmount);
    if (isNaN(totalCTC) || totalCTC <= 0) {
      return res
        .status(400)
        .json({ success: false, message:Messages.OFFER.INVALID_CTC });
    }

    // ✅ Salary breakdown
    const salaryBreakdown = generateSalaryBreakdown(totalCTC);

    // Logo is now handled inside pdfGenerator

    // ✅ Create offer letter data object
    const offerData = {
      candidateName: candidateName.trim(),
      candidateAddress: candidateAddress.trim(),
      position: position.trim(),
      joiningDate,
      joiningTime: joiningTime || "10:30 AM",
      ctcAmount: Math.round(totalCTC),
      ctcInWords: ctcInWords.trim(),
      salaryBreakdown,
      probationPeriodMonths: probationPeriodMonths || 6,
      createdBy,
    };

    // ✅ Pass logo to EJS PDF generator
    const pdfPath = await generateOfferPDF(offerData);

    const offerLetter = new OfferLetter({
      ...offerData,
      pdfPath,
    });

    await offerLetter.save();

    res.status(201).json({
      success: true,
      message:Messages.OFFER.CREATE_SUCCESS,
      data: offerLetter,
      pdfFile: offerLetter.pdfPath,
    });
  } catch (error) {
  logger.error("Error creating offer letter:", error);
  res.status(500).json({
    message: Messages.ERROR.SERVER,
    error: error.message,
    stack: error.stack,
  });
}
};


//
// ======================== UPDATE OFFER ========================
//
exports.updateOfferLetter = async (req, res) => {
    try {
        // 🔥 Admin Safety Check (FIX)
        // if (!req.admin || !req.admin.id || !req.admin.role) {
        //     return res.status(401).json({ success: false, message: "Unauthorized: Admin credentials missing." });
        // }
        
        const { id } = req.params;
        // const adminId = req.admin.id;
        // const adminRole = req.admin.role;

        // ✅ Only allow specific fields to be updated
        const allowedUpdates = [
            "candidateName",
            "candidateAddress",
            "position",
            "joiningDate",
            "ctcAmount",
            "ctcInWords",
            "probationPeriodMonths",
            "status",
        ];

        const updates = {};
        for (const field of allowedUpdates) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        // ✅ Recalculate salary breakdown if CTC changed
        if (updates.ctcAmount) {
            const newCTC = Number(updates.ctcAmount);
            if (isNaN(newCTC) || newCTC <= 0) {
                return res.status(400).json({ success: false, message: Messages.OFFER.INVALID_CTC });
            }
            updates.ctcAmount = Math.round(newCTC);
            updates.salaryBreakdown = generateSalaryBreakdown(newCTC);
        }

        // Define the query filter based on the user's role
        const filter = {
            _id: id
        };
        
        const updatedOffer = await OfferLetter.findOneAndUpdate(filter, updates, {
            new: true,
            runValidators: true,
        });

        // ✅ Centralized Authorization and Not Found Check
        if (!updatedOffer) {
            const exists = await OfferLetter.exists({ _id: id });

            if (!exists) {
                return res.status(404).json({ success: false, message:Messages.OFFER.OFFER_NOT_FOUND });
            } else {
                return res.status(403).json({ success: false, message:Messages.OFFER.ACCESS_DEINED });
            }
        }

        res.status(200).json({
            success: true,
            message: Messages.OFFER.UPDATE_SUCCESS,
            data: updatedOffer,
        });
    } catch (error) {
        logger.error("Error updating offer letter:", error);
        if (error.name === 'CastError' && error.path === '_id') {
             return res.status(400).json({ success: false, message:Messages.OFFER.INVLAID_OFFER_ID });
        }
        res.status(500).json({
            success: false,
            message: Messages.ERROR.SERVER,
            error: error.message,
        });
    }
};


//
// ======================== DELETE OFFER ========================
//
exports.deleteOfferLetter = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Check if offer exists
    const offer = await OfferLetter.findById(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: Messages.OFFER.OFFER_NOT_FOUND
      });
    }

    // 2. Delete offer (no admin restrictions)
    await OfferLetter.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: Messages.OFFER.DELETE_SUCCESS,
      data: offer,
    });
    
  } catch (error) {
    logger.error("Error deleting offer letter:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: Messages.OFFER.INVLAID_OFFER_ID,
      });
    }

    res.status(500).json({
      success: false,
      message: Messages.ERROR.SERVER,
      error: error.message,
    });
  }
};


//
// ======================== GET ALL OFFERS ========================
//
exports.getAllOffers = async (req, res) => {
    try {
        const offers = await OfferLetter.find().sort({ createdAt: -1 });

        const totalCount = await OfferLetter.countDocuments();

        res.status(200).json({
            success: true,
            message: offers.length === 0 
                ? "No offer letters found" 
                : "Offers retrieved successfully",
            count: offers.length,
            totalCount,
            data: offers,
        });

    } catch (error) {
        logger.error("Error fetching offers:", error);
        res.status(500).json({ message: Messages.ERROR.SERVER });
    }
};


//
// ======================== GET OFFER BY ID ========================
//


// ✅ Fix your getOfferById method
exports.getOfferById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check for valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: Messages.OFFER.INVLAID_OFFER_ID });
    }

    const offer = await OfferLetter.findById(id).populate("createdBy", "firstName lastName email");

    if (!offer) {
      return res.status(404).json({ message: Messages.OFFER.OFFER_NOT_FOUND });
    }

    const totalCount = await OfferLetter.countDocuments({});
    res.status(200).json({ success: true, data: offer, count: totalCount });
  } catch (err) {
    logger.error("Error fetching offer by ID:", err);
    res.status(500).json({ message: Messages.ERROR.SERVER, error: err.message });
  }
};


// offer Letter Download
exports.downloadOfferLetter = async (req, res) => {
  try {
    const offer = await OfferLetter.findById(req.params.id);
    if (!offer)
      return res.status(404).json({ message: Messages.OFFER.OFFER_NOT_FOUND });

    let pdfPath = offer.pdfPath;

    if (!pdfPath || !fs.existsSync(pdfPath)) {
      pdfPath = await generateOfferPDF(offer);
      offer.pdfPath = pdfPath;
      await offer.save();
    }

    return res.download(
      pdfPath,
      `OfferLetter_${offer.candidateName}.pdf`,
      (err) => {
        if (err)
          return res
            .status(500)
            .json({ message:Messages.OFFER.DOWNLOAD_ERROR });
      }
    );
  } catch (error) {
    logger.error("Download error:", error);
    res.status(500).json({ message: Messages.ERROR.SERVER });
  }
};



//send-email
exports.sendOfferLetterEmail=async(req,res)=>{
    try{
        const {offerId,candidateEmail}=req.body;
        if(!offerId || !candidateEmail){
            return res.status(400).json({message:Messages.OFFER.EMAIL_AND_OFFER_ID});
        }
        const offer=await OfferLetter.findById(offerId).populate("createdBy", "name email");
        if(!offer){
            return res.status(404).json({message:Messages.OFFER.OFFER_NOT_FOUND})
        }
        const pdfPath = path.join(
      __dirname,
      `../uploads/OfferLetter_${offer.candidateName.replace(/\s+/g, "_")}.pdf`
    );
     if (!fs.existsSync(pdfPath)) {
      logger.info("PDF not found — generating now...");
      await generateOfferPDF(offer);
    }
    logger.info("PDF Path:", pdfPath);
    logger.info("File Exists:", fs.existsSync(pdfPath));

    // compose mail
    const subject=`Offer  Letter -${offer.candidateName} | Amazon IT Solutions`;
    const htmlBody = `
      <p>Dear ${offer.candidateName},</p>
      <p>We are pleased to offer you the position of <strong>${offer.position}</strong> at <strong>Amazon IT Solutions</strong>.</p>
      <p>Please find attached your official offer letter.</p>
      <p>We look forward to having you on board!</p>
      <br />
      <p>Best regards,<br><strong>HR Department</strong><br>Amazon IT Solutions</p>
    `;
    await sendEmail({
  to: candidateEmail,
  subject,
  html: htmlBody,
  text: `Dear ${offer.candidateName}, please find attached your offer letter.`,
  attachments: [
    {
      filename: `OfferLetter_${offer.candidateName}.pdf`,
      path: pdfPath,
    },
  ],
});

    res.status(200).json({
        success: true,
      message: `Messages.OFFER.SENT_EMAIL ${candidateEmail}`,
    })
    }catch(err){
    logger.error("Error sending offer letter email:", err);
    res.status(500).json({ message: messages.ERROR.SERVER });

    }
}

exports.generatePDF = async (req, res) => {
  try {
    logger.info("Incoming PDF Generation Request:", req.body);

    const offerData = req.body;
    const pdfPath = await generateOfferPDF(offerData);

    logger.info("PDF generated at:", pdfPath);

    return res.status(200).json({
      success: true,
      message: Messages.OFFER.GENERATE_PDF,
      pdfPath,
    });
  } catch (error) {
    logger.error("PDF Generation Failed:", error);
    res.status(500).json({
      message: Messages.ERROR.SERVER,
      error: error.message,
      stack: error.stack,
    });
  }
};
