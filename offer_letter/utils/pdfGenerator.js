const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const fs = require("fs");

const generateOfferPDF = async (offerData) => {
  try {
    // 1️⃣ Template path
    const templatePath = path.join(__dirname, "../templates/offer.ejs");

    // Ensure template exists
    if (!fs.existsSync(templatePath)) {
      throw new Error(`EJS template not found at: ${templatePath}`);
    }

    // 2️⃣ Assets
    const assetsDir = path.resolve(__dirname, "../assets");

    // Helper to safely load image and convert to base64
    const toBase64Image = (candidates) => {
      for (const img of candidates) {
        if (fs.existsSync(img)) {
          const mime =
            img.endsWith(".png") ? "image/png" :
            img.endsWith(".jpg") || img.endsWith(".jpeg") ? "image/jpeg" :
            "application/octet-stream";
          const base64 = fs.readFileSync(img).toString("base64");
          return `data:${mime};base64,${base64}`;
        }
      }
      return "";
    };

    // Company logo, letterhead & signature
    const logoPath = toBase64Image([
      path.join(assetsDir, "image.png"),
      path.join(assetsDir, "Amazon-Logo1.png"),
      path.join(assetsDir, "logo.png"),
    ]);

    const letterheadPath = toBase64Image([
      path.join(assetsDir, "letterhead.png"),
      path.join(assetsDir, "letterhead.jpg"),
      path.join(assetsDir, "letterhead.jpeg"),
    ]);

    const signaturePath = toBase64Image([
      path.join(assetsDir, "signature.png"),
      path.join(assetsDir, "sign.png"),
      path.join(assetsDir, "signature.jpg"),
    ]);

    // 3️⃣ Render EJS → HTML
    const html = await ejs.renderFile(templatePath, {
      candidateName: offerData.candidateName || "Candidate",
      candidateAddress: offerData.candidateAddress || "Address Not Provided",
      position: offerData.position || "Position Not Specified",
      joiningDate: offerData.joiningDate || new Date(),
      ctcAmount: offerData.ctcAmount || 0,
      ctcInWords: offerData.ctcInWords || "",
      salaryBreakdown: offerData.salaryBreakdown || [],
      probationPeriodMonths: offerData.probationPeriodMonths || 6,
      dateIssued: offerData.dateIssued || new Date(),
      companyName: "Amazon IT Solutions",
      companyAddress:
        "Amazon IT Solutions Pvt. Ltd.\nPlot No. 23, Hi-Tech City Road,\nHyderabad, Telangana – 500081",
      logoPath,
      signaturePath,
    });

    // 4️⃣ Inject letterhead or style adjustments
    const cssPatch = [];
    if (letterheadPath) {
      cssPatch.push(`
        .page-bg {
          position: fixed;
          left: 0; top: 0;
          width: 210mm; height: 297mm;
          background-image: url('${letterheadPath}');
          background-repeat: no-repeat;
          background-position: top center;
          background-size: 100% auto;
          z-index: -1;
        }
        body { position: relative; }
      `);
    }

    const finalHtml = html.replace("</style>", cssPatch.join("\n") + "\n</style>")
                          .replace("<body>", "<body>\n<div class='page-bg'></div>");

    // 5️⃣ Puppeteer (Render safe)
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

    // 6️⃣ Output directory
    const uploadsDir = path.resolve(__dirname, "../uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });

    const safeName = (offerData.candidateName || "Candidate").replace(/\s+/g, "_");
    const pdfPath = path.join(uploadsDir, `OfferLetter_${safeName}.pdf`);

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await browser.close();
    console.log(`✅ PDF generated successfully: ${pdfPath}`);
    return pdfPath;
  } catch (err) {
    console.error("❌ Offer PDF Generation Error:", err.message);
    throw new Error("Failed to generate PDF. " + err.message);
  }
};

module.exports = generateOfferPDF;
