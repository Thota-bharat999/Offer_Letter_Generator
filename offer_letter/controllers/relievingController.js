const fs=require('fs');
const path=require("path");
const RelievingLetter=require('../models/RelievingLetter');
const generateRelievingPDFUtil = require("../utils/relievingPdfGenerator")
const sendEmail=require('../services/emailService')

const mongoose=require('mongoose');

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
            return res.status(400).json({message:"All fields are required"});
        }

        // Check if employeeId already exists
        const existingLetter = await RelievingLetter.findOne({ employeeId });
        if (existingLetter) {
            return res.status(400).json({ message: "This employee ID already exists. Try for new." });
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
            employeeId:letter.employeeId,
            designation:letter.designation,
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
            resignationDate:letter.resignationDate,
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
    const { id } = req.params;
    const letter = await RelievingLetter.findById(id);
    if (!letter) {
      return res.status(404).json({ message: "Relieving letter not found" });
    }

    const pdfPath = await generateRelievingPDFUtil(letter);

    res.status(200).json({
      message: "Relieving PDF generated successfully",
      pdfPath,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while generating relieving PDF",
      error: error.message,
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
    let pdfPath = path.resolve(__dirname, "../generated_pdfs", `Relieving_${letter.employeeName.replace(/\s+/g, "_")}.pdf`);

    // Check if file exists, if not generate it
    if (!fs.existsSync(pdfPath)) {
      console.log("📄 PDF not found — generating now...");
      pdfPath = await generateRelievingPDFUtil(letter);
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
    const { relievingId, email } = req.body;

    // ✅ Validate required fields
    if (!relievingId || !email) {
      return res.status(400).json({ message: "Relieving ID and email are required" });
    }

    // ✅ Fetch relieving letter from DB
    const letter = await RelievingLetter.findById(relievingId);
    if (!letter) {
      return res.status(404).json({ message: "Relieving letter not found" });
    }

    // ✅ Construct PDF path
    const pdfPath = path.join(
      __dirname,
      `../generated_pdfs/Relieving_${letter.employeeName.replace(/\s+/g, "_")}.pdf`
    );

    // ✅ Check if PDF already exists — if not, generate it
    if (!fs.existsSync(pdfPath)) {
      console.log("📄 PDF not found — generating now...");
      await generateRelievingPDFUtil(letter);
    }

    console.log("✅ PDF Path:", pdfPath);
    console.log("✅ File Exists:", fs.existsSync(pdfPath));

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
      message: `Relieving letter sent successfully to ${email}`,
    });
  } catch (err) {
    console.error("❌ Error sending relieving letter email:", err);
    res.status(500).json({
      message: "Server error while sending relieving letter email",
      error: err.message,
    });
  }
};
