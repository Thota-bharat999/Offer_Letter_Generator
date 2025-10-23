const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const fs = require("fs");

const generateOfferPDF = async (offerData) => {
  try {
    if (!offerData || typeof offerData !== "object") {
      throw new Error("Invalid offer data provided to generateOfferPDF()");
    }

    const templatePath = path.join(__dirname, "../templates/offer.ejs");

    // === EMBED LOGO ===
    const assetsDir = path.resolve(__dirname, "../assets");
    const logoCandidates = [
      path.join(assetsDir, "image.png"),
      path.join(assetsDir, "Amazon-Logo1.png"),
      path.join(assetsDir, "logo.png"),
    ];
    const foundLogo = logoCandidates.find(p => fs.existsSync(p));
    let logoPath = "";
    if (foundLogo) {
      try {
        const mime = foundLogo.endsWith(".png") ? "image/png" :
                     foundLogo.endsWith(".jpg") || foundLogo.endsWith(".jpeg")
                       ? "image/jpeg"
                       : "application/octet-stream";
        const base64 = fs.readFileSync(foundLogo).toString("base64");
        logoPath = `data:${mime};base64,${base64}`;
      } catch {
        logoPath = "";
      }
    }

    // === EMBED LETTERHEAD ===
    const letterheadCandidates = [
      path.join(assetsDir, "letterhead.png"),
      path.join(assetsDir, "letterhead.jpg"),
      path.join(assetsDir, "letterhead.jpeg"),
    ];
    const foundLetterhead = letterheadCandidates.find(p => fs.existsSync(p));
    let letterheadPath = "";
    if (foundLetterhead) {
      try {
        const mime = foundLetterhead.endsWith(".png") ? "image/png" :
                     foundLetterhead.endsWith(".jpg") || foundLetterhead.endsWith(".jpeg")
                       ? "image/jpeg"
                       : "application/octet-stream";
        const base64 = fs.readFileSync(foundLetterhead).toString("base64");
        letterheadPath = `data:${mime};base64,${base64}`;
      } catch {
        letterheadPath = "";
      }
    }

    // === EMBED SIGNATURE ===
    const signatureCandidates = [
      path.join(assetsDir, "signature.png"),
      path.join(assetsDir, "sign.png"),
      path.join(assetsDir, "signature.jpg"),
    ];
    const foundSignature = signatureCandidates.find(p => fs.existsSync(p));
    let signaturePath = "";
    if (foundSignature) {
      try {
        const mime = foundSignature.endsWith(".png") ? "image/png" :
                     foundSignature.endsWith(".jpg") || foundSignature.endsWith(".jpeg")
                       ? "image/jpeg"
                       : "application/octet-stream";
        const base64 = fs.readFileSync(foundSignature).toString("base64");
        signaturePath = `data:${mime};base64,${base64}`;
      } catch {
        signaturePath = "";
      }
    }

    // === RENDER EJS ===
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
      letterheadPath, // ✅ added
    });

    // === STYLE INJECTION ===
    const cssParts = ['  .title-row { margin: -3mm 0 4mm !important; }'];
    if (letterheadPath) {
      cssParts.push(
        `  .page-bg { position: fixed; left: 0; top: 0; width: 210mm; height: 297mm; background-image: url('${letterheadPath}'); background-repeat: no-repeat; background-position: top center; background-size: 100% auto; z-index: -1; pointer-events: none; }`,
        '  .header { min-height: 12mm !important; }',
        '  .header .logo { display: none !important; }',
        '  .container { padding-top: 36mm !important; }',
        '  .watermark { display: none !important; }'
      );
    }
    const finalHtml = html.replace('</style>', cssParts.join('\n') + '\n</style>');

    // === PUPPETEER LAUNCH ===
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: "domcontentloaded" });
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
    try { await page.evaluateHandle('document.fonts.ready'); } catch {}

    const uploadsDir = path.resolve(__dirname, "../uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });
    const safeName = (offerData.candidateName || "Candidate").replace(/\s+/g, "_");
    const pdfPath = path.join(uploadsDir, `OfferLetter_${safeName}.pdf`);

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
