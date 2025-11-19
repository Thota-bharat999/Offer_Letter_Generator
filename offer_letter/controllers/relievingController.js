const fs=require('fs');
const path=require("path");
const RelievingLetter=require('../models/RelievingLetter');
const generateRelievingPDFUtil = require("../utils/relievingPdfGenerator")
const sendEmail=require('../services/emailService')
const logger = require('../logger/logger');

const mongoose=require('mongoose');
const Messages = require('../MsgConstants/messages');

// Helper function to parse DD-MM-YYYY date format
const parseDate = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        return new Date(`${year}-${month}-${day}`);
    }
    return new Date(dateString);
};


exports.createRelivingLetter=async(req,res)=>{
    try{
        const {employeeName,designation,employeeId,joiningDate,resignationDate,relievingDate}=req.body;

        if(!employeeName || !designation || !employeeId || !joiningDate || !resignationDate || !relievingDate){
            return res.status(400).json({message:Messages.RELIEVING_lETTER.MISSING_FIELDS_ERROR});
        }

        // Check if employeeId already exists
        const existingLetter = await RelievingLetter.findOne({ employeeId });
        if (existingLetter) {
            return res.status(400).json({ message:Messages.RELIEVING_lETTER.EMPLOYEE_ID_EXIST });
        }

        const newRelievingLetter=new RelievingLetter({
            employeeName,
            designation,
            employeeId,
            joiningDate: parseDate(joiningDate),
            resignationDate: parseDate(resignationDate),
            relievingDate: parseDate(relievingDate),

        });
        await newRelievingLetter.save();
        res.status(201).json({
            message:Messages.RELIEVING_lETTER.CREATE_SUCCESS,
      data: {
        _id: newRelievingLetter._id,
        employeeName: newRelievingLetter.employeeName
      }
        });

    }catch(error){
    logger.error("Error creating relieving letter:", error);
    res.status(500).json({ message: Messages.ERROR.SERVER, error: error.message });

    }

}
// Get All Relieving Letters

exports.getAllRelievingLetters=async(req,res)=>{
    try{
        const letters=await RelievingLetter.find().sort({createdAt:-1});
        if(!letters || letters.length==0){
            return res.status(404).json({message:Messages.RELIEVING_lETTER.NO_RELIEVING_LETTER});

        }
        const result=letters.map((letter)=>({
            _id:letter._id,
            employeeName:letter.employeeName,
            employeeId:letter.employeeId,
            designation:letter.designation,
        }));
        res.status(200).json(result);

    }catch(error){
        logger.error("Error fetching relieving letters:", error);
    res.status(500).json({
      message: Messages.ERROR.SERVER,
      error: error.message,
    });    

    }
}

// Get Relieving Letter By Id

exports.getRelievingLetterById=async(req,res)=>{
try{
    const {id}=req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ message:Messages.RELIEVING_lETTER.INVLAID_OFFER_ID });
        }
        const letter=await RelievingLetter.findById(id);
        if(!letter){
            return res.status(404).json({message:Messages.RELIEVING_lETTER.NO_RELIEVING_LETTER});
        }
        res.status(200).json({
            _id:letter._id,
            employeeName:letter.employeeName,
            designation:letter.designation,
            employeeId:letter.employeeId,
            joiningDate:letter.joiningDate,
            resignationDate:letter.resignationDate,
            relievingDate:letter.relievingDate,
        });


}catch(error){
    logger.error("Error fetching relieving letter by ID:", error);
    res.status(500).json({
      message: Messages.ERROR.SERVER,
      error: error.message,
    });
}
}

// Upadate Relieving Letter

exports.updateRelievingLetter=async(req,res)=>{
    try{
        const {id}=req.params;
        if(!id){
            return res.status(400).json({message:Messages.RELIEVING_lETTER.RELIEVING_LETTER_ID});
        }
        const{employeeName,designation,employeeId,joiningDate,resignationDate,relievingDate}=req.body;
        const updates={
            ...(employeeName &&{employeeName}),
            ...(designation &&{designation}),
            ...(employeeId &&{employeeId}),
            ...(joiningDate &&{joiningDate: parseDate(joiningDate)}),
            ...(resignationDate &&{resignationDate: parseDate(resignationDate)}),
            ...(relievingDate &&{relievingDate: parseDate(relievingDate)}),
        };
        const updateLetter=await RelievingLetter.findByIdAndUpdate(id,updates,{
            new:true,
            runValidators:true,

        });
        if(!updateLetter){
            return res.status(404).json({message:Messages.RELIEVING_lETTER.RELIEVING_lETTER_NOT_FOUND});
        }
        res.status(200).json({
            message:Messages.RELIEVING_lETTER.UPDATE_SUCCESS,
            data: updateLetter,
        });

    }catch(error){
        logger.error("Error updating relieving letter:", error);
    res.status(500).json({
      message: Messages.ERROR.SERVER,
      error: error.message,
    });

    }
}

// Delete Relieving Letter

exports.deleteRelievingLetter=async(req,res) => {
    try{
        const {id}=req.params;

        if(!id){
            return res.status(400).json({message:Messages.RELIEVING_lETTER.RELIEVING_LETTER_ID});
        }
        const deleteLetter=await RelievingLetter.findByIdAndDelete(id);
        if(!deleteLetter){
            return res.status(404).json({message:Messages.RELIEVING_lETTER.RELIEVING_lETTER_NOT_FOUND})
        }
        res.status(200).json({
            message:Messages.RELIEVING_lETTER.DELETE_SUCCESS,
        })

    }catch(error){
        logger.error("Error deleting relieving letter:", error);
    return res.status(500).json({
      message: Messages.ERROR.SERVER,
      error: error.message,
    })
    }
}

// Generate Relieving PDF
exports.generateRelievingPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const letter = await RelievingLetter.findById(id);
    if (!letter) {
      return res.status(404).json({ message:Messages.RELIEVING_lETTER.RELIEVING_lETTER_NOT_FOUND });
    }

    const pdfPath = await generateRelievingPDFUtil(letter);

    res.status(200).json({
      message: Messages.RELIEVING_lETTER.GENERATE_PDF,
      pdfPath,
    });
  } catch (error) {
    res.status(500).json({
      message: Messages.ERROR.SERVER,
      error: error.message,
    });
  }
};



exports.downloadRelievingLetter = async (req, res) => {
  try {
    const { id } = req.params;

    
    const letter = await RelievingLetter.findById(id);
    if (!letter) {
      return res.status(404).json({ message: Messages.RELIEVING_lETTER.RELIEVING_lETTER_NOT_FOUND});
    }

    //Resolve stored PDF path (example field: pdfPath)
    let pdfPath = path.resolve(__dirname, "../generated_pdfs", `Relieving_${letter.employeeName.replace(/\s+/g, "_")}.pdf`);

    // Check if file exists, if not generate it
    if (!fs.existsSync(pdfPath)) {
      logger.info("PDF not found — generating now...");
      pdfPath = await generateRelievingPDFUtil(letter);
    }

    // Set response headers for download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Relieving_${letter.employeeName.replace(/\s+/g, "_")}.pdf`);

    // Stream the file to client
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    logger.info(`Downloaded: ${pdfPath}`);
  } catch (error) {
    logger.error("Error downloading PDF:", error);
    res.status(500).json({
      message: Messages.ERROR.SERVER,
      error: error.message,
    });
  }
};
//send relieving email with pdf Attachment

exports.sendRelievingEmail = async (req, res) => {
  try {
    const { relievingId, email } = req.body;

    // ✅ Validate required fields
    if (!relievingId || !email) {
      return res.status(400).json({ message: Messages.RELIEVING_lETTER.EMAIL_AND_RELIEVING_ID });
    }

    // ✅ Fetch relieving letter from DB
    const letter = await RelievingLetter.findById(relievingId);
    if (!letter) {
      return res.status(404).json({ message:Messages.RELIEVING_lETTER.RELIEVING_lETTER_NOT_FOUND });
    }

    // ✅ Construct PDF path
    const pdfPath = path.join(
      __dirname,
      `../generated_pdfs/Relieving_${letter.employeeName.replace(/\s+/g, "_")}.pdf`
    );

    // ✅ Check if PDF already exists — if not, generate it
    if (!fs.existsSync(pdfPath)) {
      logger.info("PDF not found — generating now...");
      await generateRelievingPDFUtil(letter);
    }

    logger.info("PDF Path:", pdfPath);
    logger.info("File Exists:", fs.existsSync(pdfPath));

    // ✅ Compose email
    const subject = `Relieving and Experience Letter - ${letter.employeeName} | Amazon IT Solutions`;
    const htmlBody = `
      <p>Dear ${letter.employeeName},</p>
      <p>
        Please find attached your <strong>Relieving and Experience Letter</strong> from 
        <strong>Amazon IT Solutions</strong>.
      </p>
      <p>We wish you the very best for your future endeavors!</p>
      <br />
      <p>Best regards,<br><strong>HR Department</strong><br>Amazon IT Solutions</p>
    `;

    // ✅ Send email with attachment
    await sendEmail({
      to: email,
      subject,
      html: htmlBody,
      text: `Dear ${letter.employeeName}, please find attached your relieving and experience letter.`,
      attachments: [
        {
          filename: `Relieving_${letter.employeeName}.pdf`,
          path: pdfPath,
          contentType: "application/pdf",
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: `Messages.RELIEVING_lETTER.RELIEVING_SENT ${email}`,
    });
  } catch (err) {
    logger.error("Error sending relieving letter email:", err);
    res.status(500).json({
      message: Messages.ERROR.SERVER,
      error: err.message,
    });
  }
};
