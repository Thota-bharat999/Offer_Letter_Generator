const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const fs = require("fs");
const logger = require('../logger/logger');
const Messages = require('../MsgConstants/messages');

const generateFullPacketPDF = async (candidate) => {
  try {
    logger.info("🟩 [1] Starting Full Packet PDF generation...");

    const templatePath = path.join(__dirname, "../templates/fullPacket.ejs");
    const assetsDir = path.resolve(__dirname, "../assets");

    // Embed assets similar to pdfGenerator.js
    const logoCandidates = [
      path.join(assetsDir, "image.png"),
      path.join(assetsDir, "Amazon-Logo1.png"),
      path.join(assetsDir, "logo.png"),
    ];
    const foundLogo = logoCandidates.find((p) => fs.existsSync(p));
    let logoPath = "";
    if (foundLogo) {
      const mime = foundLogo.endsWith(".png")
        ? "image/png"
        : foundLogo.endsWith(".jpg") || foundLogo.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";
      logoPath = `data:${mime};base64,${fs.readFileSync(foundLogo).toString("base64")}`;
    }

    const letterheadCandidates = [
      path.join(assetsDir, "letterhead.png"),
      path.join(assetsDir, "letterhead.jpg"),
      path.join(assetsDir, "letterhead.jpeg"),
    ];
    const foundLetterhead = letterheadCandidates.find((p) => fs.existsSync(p));
    let letterheadPath = "";
    if (foundLetterhead) {
      const mime = foundLetterhead.endsWith(".png")
        ? "image/png"
        : foundLetterhead.endsWith(".jpg") || foundLetterhead.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";
      letterheadPath = `data:${mime};base64,${fs.readFileSync(foundLetterhead).toString("base64")}`;
    }

    const signatureCandidates = [
      path.join(assetsDir, "signature.png"),
      path.join(assetsDir, "sign.png"),
      path.join(assetsDir, "signature.jpg"),
    ];
    const foundSignature = signatureCandidates.find((p) => fs.existsSync(p));
    let signaturePath = "";
    if (foundSignature) {
      const mime = foundSignature.endsWith(".png")
        ? "image/png"
        : foundSignature.endsWith(".jpg") || foundSignature.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";
      signaturePath = `data:${mime};base64,${fs.readFileSync(foundSignature).toString("base64")}`;
    }

    // Prepare attachments as base64
    const attachments = candidate.attachments.map((att) => {
      if (fs.existsSync(att.filePath)) {
        const mime = att.filePath.endsWith(".pdf")
          ? "application/pdf"
          : att.filePath.endsWith(".png")
          ? "image/png"
          : att.filePath.endsWith(".jpg") || att.filePath.endsWith(".jpeg")
          ? "image/jpeg"
          : "application/octet-stream";
        const base64 = fs.readFileSync(att.filePath).toString("base64");
        return {
          type: att.type,
          data: `data:${mime};base64,${base64}`,
        };
      }
      return null;
    }).filter(Boolean);

    // Render EJS
    const html = await ejs.renderFile(templatePath, {
      candidateName: candidate.candidateName,
      candidateAddress: candidate.address,
      position: candidate.position,
      joiningDate: candidate.joiningDate,
      joiningTime: "10:30 AM",
      ctcAmount: candidate.ctcAmount,
      ctcInWords: candidate.ctcInWords,
      salaryBreakdown: [], // Assuming no breakdown for full packet, or calculate if needed
      probationPeriodMonths: 6,
      dateIssued: candidate.createdAt,
      companyName: "Amazon IT Solutions",
      companyAddress: "Amazon IT Solutions Pvt. Ltd.\nPlot No. 23, Hi-Tech City Road,\nHyderabad, Telangana – 500081",
      logoPath,
      letterheadPath,
      signaturePath,
      attachments,
    });

    // Modify HTML for letterhead
    let modifiedHtml = html;
    if (letterheadPath) {
      modifiedHtml = modifiedHtml.replace(
        "<body>",
        `<body>
          <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 210mm;
            height: 297mm;
            background-image: url('${letterheadPath}');
            background-repeat: no-repeat;
            background-size: 100% auto;
            background-position: top center;
            z-index: -1;
          "></div>`
      );
    }

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
      executablePath: puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    await page.setDefaultTimeout(0);

    await page.setContent(modifiedHtml, { waitUntil: "networkidle0", timeout: 0 });
    await page.evaluateHandle("document.fonts.ready");

    // Output PDF
    const uploadsDir = path.resolve(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const safeName = candidate.candidateName.replace(/\s+/g, "_");
    const pdfPath = path.join(uploadsDir, `FullPacket_${safeName}.pdf`);

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
      timeout: 0,
    });

    await browser.close();

    return pdfPath;
  } catch (error) {
    logger.error("❌ Error generating full packet PDF:", error);
    throw error;
  }
};

module.exports = generateFullPacketPDF;
