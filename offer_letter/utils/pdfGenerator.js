const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const fs = require("fs");

const generateOfferPDF = async (offerData) => {
  try {
    // 1️⃣ Path to EJS template
    const templatePath = path.join(__dirname, "../templates/offer.ejs");

    // 2️⃣ Company logo (embed as Base64)
    const assetsDir = path.resolve(__dirname, "../assets");
    const logoCandidates = [
      path.join(assetsDir, "image.png"),
      path.join(assetsDir, "Amazon-Logo1.png"),
      path.join(assetsDir, "logo.png"),
    ];
    const foundLogo = logoCandidates.find((p) => fs.existsSync(p));
    let logoPath = "";

    if (foundLogo) {
      console.log("🖼️ Using logo:", foundLogo);
      const lower = foundLogo.toLowerCase();
      const mime = lower.endsWith(".png")
        ? "image/png"
        : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";
      logoPath = `data:${mime};base64,${fs.readFileSync(foundLogo).toString("base64")}`;
    } else {
      console.warn("⚠️ Logo not found. Looked for:", logoCandidates);
    }

    // 3️⃣ Letterhead background
    const letterheadCandidates = [
      path.join(assetsDir, "letterhead.png"),
      path.join(assetsDir, "letterhead.jpg"),
      path.join(assetsDir, "letterhead.jpeg"),
    ];
    const foundLetterhead = letterheadCandidates.find((p) => fs.existsSync(p));
    let letterheadPath = "";

    if (foundLetterhead) {
      const lowerLh = foundLetterhead.toLowerCase();
      const mimeLh = lowerLh.endsWith(".png")
        ? "image/png"
        : lowerLh.endsWith(".jpg") || lowerLh.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";
      letterheadPath = `data:${mimeLh};base64,${fs.readFileSync(foundLetterhead).toString("base64")}`;
    } else {
      console.warn("⚠️ Letterhead not found. Looked for:", letterheadCandidates);
    }

    // 4️⃣ Signature image (optional)
    const signatureCandidates = [
      path.join(assetsDir, "signature.png"),
      path.join(assetsDir, "sign.png"),
      path.join(assetsDir, "signature.jpg"),
    ];
    const foundSignature = signatureCandidates.find((p) => fs.existsSync(p));
    let signaturePath = "";

    if (foundSignature) {
      const lowerS = foundSignature.toLowerCase();
      const mimeS = lowerS.endsWith(".png")
        ? "image/png"
        : lowerS.endsWith(".jpg") || lowerS.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";
      signaturePath = `data:${mimeS};base64,${fs.readFileSync(foundSignature).toString("base64")}`;
    }

    // 5️⃣ Render EJS → HTML
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

    // 6️⃣ Inject CSS + letterhead
    const cssParts = ['.title-row { margin: -3mm 0 4mm !important; }'];
    if (letterheadPath) {
      cssParts.push(`
        .page-bg { position: fixed; left: 0; top: 0; width: 210mm; height: 297mm;
        background-image: url('${letterheadPath}'); background-repeat: no-repeat;
        background-position: top center; background-size: 100% auto; z-index: -1; }
        .header .logo { display: none !important; }
        .container { padding-top: 36mm !important; }
      `);
    }
    const finalHtml = html.replace("</style>", cssParts.join("\n") + "\n</style>");

    // 7️⃣ Launch Puppeteer safely (Render-compatible)
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        (process.env.NODE_ENV === "production"
          ? "/opt/render/.cache/puppeteer/chrome/linux-141.0.7390.54/chrome-linux64/chrome"
          : puppeteer.executablePath()), // local fallback
    });

    const page = await browser.newPage();

    await page.setContent(finalHtml, { waitUntil: "networkidle0" });
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
    try {
      await page.evaluateHandle("document.fonts.ready");
    } catch {}

    // 8️⃣ Output path
    const uploadsDir = path.resolve(__dirname, "../uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });
    const safeName = (offerData.candidateName || "Candidate").replace(/\s+/g, "_");
    const pdfPath = path.join(uploadsDir, `OfferLetter_${safeName}.pdf`);

    // 9️⃣ Generate PDF
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });

    await browser.close();
    console.log(`✅ Offer Letter PDF generated successfully: ${pdfPath}`);
    return pdfPath;
  } catch (error) {
    console.error("❌ Error generating offer PDF:", error);
    throw error;
  }
};

module.exports = generateOfferPDF;
