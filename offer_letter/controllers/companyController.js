const Company = require("../models/Company");
const fs = require('fs');
const path = require('path');
const logger = require('../logger/logger');
const messages = require('../MsgConstants/messages');

exports.updateCompany = async (req, res) => {
    try {
        const { name, address } = req.body;
        let newLogoPath;
        let oldLogoPath = null;

        // 1. Get the existing company record
        let company = await Company.findOne();
        const isNewCompany = !company;

        if (isNewCompany) {
            company = new Company();
        } else {
            // Store the current logo path for potential cleanup later
            oldLogoPath = company.logo;
        }

        // 2. Handle File Upload (Multer)
        if (req.file) {
            const originalTempPath = req.file.path; // Multer's temporary path (e.g., uploads/temp/filename)
            const extension = path.extname(req.file.originalname);
            const finalFileName = `logo_${company._id || 'new'}_${Date.now()}${extension}`;
            
            // Define the final permanent location
            const finalUploadDir = path.join(__dirname, "../uploads/company_logo"); 
            
            // Ensure the final directory exists
            if (!fs.existsSync(finalUploadDir)) {
                fs.mkdirSync(finalUploadDir, { recursive: true });
            }

            // Define the final path
            newLogoPath = path.join(finalUploadDir, finalFileName);

            // Move the file from the temporary location to the final location
            fs.renameSync(originalTempPath, newLogoPath); 
            
            company.logo = newLogoPath; // Update the logo field with the new path
        }


        // 3. Update Text Fields
        if (name) company.name = name;
        if (address) company.address = address;

        // 4. Save the updated record
        await company.save();

        // 5. Cleanup the Old Logo (if a new one was successfully saved)
        if (req.file && oldLogoPath && fs.existsSync(oldLogoPath)) {
             // Optional: Add a check to ensure it's not a default/placeholder path
             fs.unlink(oldLogoPath, (err) => {
                 if (err) logger.error("Could not delete old company logo:", err);
             });
        }
        
        // 6. Respond
        res.status(200).json({
            success: true,
            message: "✅ Company information updated successfully",
            data: company,
        });

    } catch (error) {
        // Handle Multer errors (file size/type) and other errors
        if (error.message === "Only .png, .jpg, and .jpeg files allowed!") {
             return res.status(400).json({ message: error.message });
        }
        logger.error("Error updating company info:", error);
        res.status(500).json({ message: messages.ERROR.SERVER });
    }
};

// GetComapny 
exports.getCompanyInfo = async (req, res) => {
  try {
    const company = await Company.findOne();

    if (!company) {
      return res.status(404).json({ message: "Company information not found" });
    }

    res.status(200).json({
      success: true,
      message: "Company information fetched successfully",
      data: company,
    });
  } catch (error) {
    logger.error("Error fetching company info:", error);
    res.status(500).json({ message: messages.ERROR.SERVER });
  }
};
