const nodemailer = require("nodemailer");
const fs = require("fs");

const sendEmail = async (options) => {
  try {
    // ✅ Configure SendGrid (SMTP)
    const transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net", // ✅ Always use SendGrid SMTP host
      port: 587,
      secure: false,
      auth: {
        user: "apikey", // ✅ SendGrid always uses 'apikey' as the user
        pass: process.env.OfferDocumentation, // ✅ store your actual SendGrid API Key in .env
      },
    });

    // ✅ Build base email
    const mailOptions = {
      from: process.env.SUPPORT_EMAIL || `"HR Department" <no-reply@youroffersystem.com>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || "",
      attachments: [],
    };

    // ✅ Handle attachment (if provided)
    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments.map((file) => {
        const pdfBuffer = fs.readFileSync(file.path);
        return {
          filename: file.filename,
          content: pdfBuffer.toString("base64"), // ✅ Base64 encode
          contentType: file.contentType || "application/pdf",
          encoding: "base64",
          disposition: "attachment",
        };
      });
    }

    // ✅ Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to: ${options.to}`);
    console.log(`📎 Attachments: ${mailOptions.attachments.length}`);
    return info;

  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};

module.exports = sendEmail;
