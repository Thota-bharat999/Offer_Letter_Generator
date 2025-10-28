const fs=require('fs');
const path=require("path");
const RelievingLetter=require('../models/RelievingLetter');
const generateRelievingPDFUtil = require("../utils/relievingPdfGenerator")
const sendEmail=require('../services/emailService')

const mongoose=require('mongoose');


exports.createRelivingLetter=async(req,res)=>{
    try{
        const {employeeName,designation,employeeId,joiningDate,relievingDate}=req.body;

        if(!employeeName || !designation || !employeeId || !joiningDate || !relievingDate){
            return res.status(400).json({message:"All fields are required"});
        }
        const newRelievingLetter=new RelievingLetter({
            employeeName,
            designation,
            employeeId,
            joiningDate,
            relievingDate,

        });
        await newRelievingLetter.save();
        res.status(201).json({
            message: "Relieving letter created successfully",
      data: {
        _id: newRelievingLetter._id,
        employeeName: newRelievingLetter.employeeName
      }
        });

    }catch(error){
    console.error("❌ Error creating relieving letter:", error);
    res.status(500).json({ message: "Server error while creating relieving letter", error: error.message });

    }

}
// Get All Relieving Letters

exports.getAllRelievingLetters=async(req,res)=>{
    try{
        const letters=await RelievingLetter.find().sort({createdAt:-1});
        if(!letters || letters.length==0){
            return res.status(404).json({message:"No Relieving Letters Found"});

        }
        const result=letters.map((letter)=>({
            _id:letter._id,
            employeeName:letter.employeeName,
        }));
        res.status(200).json(result);

    }catch(error){
        console.error("Error fetching relieving letters:", error);
    res.status(500).json({
      message: "Server error while fetching relieving letters",
      error: error.message,
    });    

    }
}

// Get Relieving Letter By Id

exports.getRelievingLetterById=async(req,res)=>{
try{
    const {id}=req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid offer ID" });
        }
        const letter=await RelievingLetter.findById(id);
        if(!letter){
            return res.status(404).json({message:"Relieving Letter Not Found"});
        }
        res.status(200).json({
            _id:letter._id,
            employeeName:letter.employeeName,
            designation:letter.designation,
            employeeId:letter.employeeId,
            joiningDate:letter.joiningDate,
            relievingDate:letter.relievingDate,
        });


}catch(error){
    console.error("❌ Error fetching relieving letter by ID:", error);
    res.status(500).json({
      message: "Server error while fetching relieving letter",
      error: error.message,
    });
}
}

// Upadate Relieving Letter

exports.updateRelievingLetter=async(req,res)=>{
    try{
        const {id}=req.params;
        if(!id){
            return res.status(400).json({message:"Relieving letter ID is required"});
        }
        const{employeeName,designation,employeeId,joiningDate,relievingDate}=req.body;
        const updates={
            ...(employeeName &&{employeeName}),
            ...(designation &&{designation}),
            ...(employeeId &&{employeeId}),
            ...(joiningDate &&{joiningDate}),
            ...(relievingDate &&{relievingDate}),
        };
        const updateLetter=await RelievingLetter.findByIdAndUpdate(id,updates,{
            new:true,
            runValidators:true,

        });
        if(!updateLetter){
            return res.status(404).json({message:"Relieving letter not found"});
        }
        res.status(200).json({
            message: "Relieving letter updated successfully",
            data: updateLetter,
        });

    }catch(error){
        console.error("❌ Error updating relieving letter:", error);
    res.status(500).json({
      message: "Server error while updating relieving letter",
      error: error.message,
    });

    }
}

// Delete Relieving Letter

exports.deleteRelievingLetter=async(req,res) => {
    try{
        const {id}=req.params;

        if(!id){
            return res.status(400).json({message:"Relieving letter ID is required"});
        }
        const deleteLetter=await RelievingLetter.findByIdAndDelete(id);
        if(!deleteLetter){
            return res.status(404).json({message:"Relieving letter not found"})
        }
        res.status(200).json({
            message: "Relieving letter deleted successfully",
        })

    }catch(error){
        console.error("❌ Error deleting relieving letter:", error);
    return res.status(500).json({
      message: "Server error while deleting relieving letter",
      error: error.message,
    })
    }
}

// Generate Relieving PDF
exports.generateRelievingPDF = async (req, res) => {
  try {
    console.log("📩 Incoming Relieving PDF Generation Request:", req.params, req.body);

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Relieving letter ID is required" });
    }

    // ✅ Fetch letter details
    const letter = await RelievingLetter.findById(id);
    if (!letter) {
      return res.status(404).json({ message: "Relieving letter not found" });
    }

    // ✅ Generate the PDF (using your utility)
    const pdfPath = await generateRelievingPDFUtil(letter);
    console.log("✅ Relieving Letter PDF generated successfully at:", pdfPath);

    // ✅ Response
    return res.status(200).json({
      success: true,
      message: "Relieving PDF generated successfully",
      pdfPath,
    });
  } catch (error) {
    console.error("❌ Error generating relieving PDF:", error);
    return res.status(500).json({
      message: "Server error while generating relieving PDF",
      error: error.message,
      stack: error.stack,
    });
  }
};



exports.downloadRelievingLetter = async (req, res) => {
  try {
    const { id } = req.params;

    
    const letter = await RelievingLetter.findById(id);
    if (!letter) {
      return res.status(404).json({ message: "Relieving letter not found" });
    }

    //Resolve stored PDF path (example field: pdfPath)
    const pdfPath = path.resolve(__dirname, "../generated_pdfs", `Relieving_${letter.employeeName.replace(/\s+/g, "_")}.pdf`);

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ message: "PDF file not found on server" });
    }

    // Set response headers for download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Relieving_${letter.employeeName.replace(/\s+/g, "_")}.pdf`);

    // Stream the file to client
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    console.log(`✅ Downloaded: ${pdfPath}`);
  } catch (error) {
    console.error("❌ Error downloading PDF:", error);
    res.status(500).json({
      message: "Server error while downloading PDF",
      error: error.message,
    });
  }
};
//send relieving email with pdf Attachment

exports.sendRelievingEmail = async (req, res) => {
  try {
    const { email, pdfPath } = req.body;

    // ✅ Validate input
    if (!email || !pdfPath) {
      return res.status(400).json({ message: "Email and pdfPath are required" });
    }

    // ✅ Resolve PDF absolute path
    const absolutePath = path.resolve(__dirname, `../generated_pdfs${pdfPath}`);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "PDF file not found on server" });
    }

    // ✅ Compose email content
    const subject = "Your Relieving and Experience Letter - Amazon IT Solutions";
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>Dear Employee,</p>
        <p>
          Please find attached your <strong>Relieving and Experience Letter</strong> from 
          <strong>Amazon IT Solutions</strong>.
        </p>
        <p>
          We wish you success in your future endeavors!
        </p>
        <br/>
        <p>Best regards,<br/><strong>HR Department</strong><br/>Amazon IT Solutions</p>
      </div>
    `;

    // ✅ Send email via SendGrid
    await sendEmail({
      to: email,
      subject,
      html,
      attachments: [
        {
          filename: path.basename(pdfPath),
          path: absolutePath,
          contentType: "application/pdf",
        },
      ],
    });

    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("❌ Error sending relieving email:", error);
    res.status(500).json({
      message: "Server error while sending email",
      error: error.message,
    });
  }
};