const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const fs = require("fs");

const generateOfferPDF = async (offerData) => {
  try {
    console.log("🟩 [1] Starting PDF generation...");

    // ✅ Validate data
    if (!offerData || typeof offerData !== "object") {
      throw new Error("Invalid offer data provided to generateOfferPDF()");
    }

    // ✅ Template path
    const templatePath = path.join(__dirname, "../templates/offer.ejs");
    console.log("🟩 [2] Template path:", templatePath);

    // ✅ Asset folder
    const assetsDir = path.resolve(__dirname, "../assets");
    console.log("🟩 [3] Assets directory:", assetsDir);

    // === EMBED LOGO ===
    console.log("🟩 [4] Checking logo...");
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
      const base64 = fs.readFileSync(foundLogo).toString("base64");
      logoPath = `data:${mime};base64,${base64}`;
      console.log("✅ Logo embedded:", foundLogo);
    } else {
      console.warn("⚠️ Logo not found in:", logoCandidates);
    }

    // === EMBED LETTERHEAD ===
    console.log("🟩 [5] Checking letterhead...");
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
      const base64 = fs.readFileSync(foundLetterhead).toString("base64");
      letterheadPath = `data:${mime};base64,${base64}`;
      console.log("✅ Letterhead embedded:", foundLetterhead);
    } else {
      console.warn("⚠️ Letterhead not found in:", letterheadCandidates);
    }

    // === EMBED SIGNATURE ===
    console.log("🟩 [6] Checking signature...");
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
      const base64 = fs.readFileSync(foundSignature).toString("base64");
      signaturePath = `data:${mime};base64,${base64}`;
      console.log("✅ Signature embedded:", foundSignature);
    } else {
      console.warn("⚠️ Signature not found in:", signatureCandidates);
    }

    // === RENDER EJS ===
    console.log("🟩 [7] Rendering EJS template...");
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
      letterheadPath,
      signaturePath,
    });

    console.log("✅ [8] EJS rendered successfully");

    // === EMBED LETTERHEAD AS IMG ===
    let modifiedHtml = html;
    if (letterheadPath) {
      modifiedHtml = modifiedHtml.replace('<div class="container">', '<div class="container" style="position: relative;"><img src="' + letterheadPath + '" style="position: absolute; top: 0; left: 0; width: 100%; height: auto; z-index: -1;" /></div>');
    }

    // === STYLE INJECTION ===
    const cssParts = ['  .title-row { margin: -3mm 0 4mm !important; }'];
    if (letterheadPath) {
      cssParts.push(
        '  .header { min-height: 12mm !important; }',
        '  .header .logo { display: none !important; }',
        '  .container { padding-top: 36mm !important; }',
        '  .watermark { display: none !important; }'
      );
    }
    const finalHtml = modifiedHtml.replace("</style>", cssParts.join("\n") + "\n</style>");
    console.log("✅ [9] CSS adjustments applied, letterheadPath:", letterheadPath);

    // === PUPPETEER LAUNCH ===
    console.log("🟩 [10] Launching Puppeteer...");
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
    });
    console.log("✅ [11] Puppeteer launched successfully");

    const page = await browser.newPage();
    console.log("🟩 [12] Setting HTML content...");
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");
    console.log("✅ [13] Page fully loaded with fonts");

    // === OUTPUT DIR ===
    const uploadsDir = path.resolve(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const safeName = (offerData.candidateName || "Candidate").replace(/\s+/g, "_");
    const pdfPath = path.join(uploadsDir, `OfferLetter_${safeName}.pdf`);

    // === PDF GENERATION ===
    console.log("🟩 [14] Generating PDF...");
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });

    console.log("✅ [15] PDF generated successfully:", pdfPath);

    await browser.close();
    console.log("✅ [16] Browser closed");

    return pdfPath;
  } catch (error) {
    console.error("❌ Error generating offer PDF:", error);
    throw error;
  }
};

module.exports = generateOfferPDF;
