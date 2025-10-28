// utils/emailService.js
const sgMail = require("@sendgrid/mail");
const fs = require("fs");

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // ✅ same SendGrid key you already use

const sendEmail = async (options) => {
  try {
    // ✅ Prepare base email
    const msg = {
      to: options.to,
      from: process.env.SUPPORT_EMAIL || "manithotabharat@gmail.com", // must be a verified sender in SendGrid
      subject: options.subject,
      html: options.html,
      text: options.text || "",
      attachments: [],
    };

    // ✅ Handle attachments (if provided)
    if (options.attachments && options.attachments.length > 0) {
      msg.attachments = options.attachments.map((file) => {
        const pdfBuffer = fs.readFileSync(file.path);
        return {
          content: pdfBuffer.toString("base64"),
          filename: file.filename,
          type: file.contentType || "application/pdf",
          disposition: "attachment",
        };
      });
    }

    // ✅ Send email via SendGrid API
    await sgMail.send(msg);
    console.log(`📧 Email sent successfully to: ${options.to}`);
    console.log(`📎 Attachments: ${msg.attachments.length}`);
    return true;

  } catch (error) {
    console.error("❌ Error sending email via SendGrid:", error.response?.body || error.message);
    throw new Error("Failed to send email");
  }
};

module.exports = sendEmail;
