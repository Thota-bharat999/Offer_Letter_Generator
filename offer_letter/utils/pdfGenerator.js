const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer-core");
const fs = require("fs");

const generateOfferPDF = async (offerData) => {
  try {
    // 1️⃣ Path to EJS template
    const templatePath = path.join(__dirname, "../templates/offer.ejs");

    // 2️⃣ Company logo absolute path (prefer image.png, fallback to Amazon-Logo1.png or logo.png)
    const assetsDir = path.resolve(__dirname, "../assets");
    const logoCandidates = [
      path.join(assetsDir, "image.png"),
      path.join(assetsDir, "Amazon-Logo1.png"),
      path.join(assetsDir, "logo.png"),
    ];
    const foundLogo = logoCandidates.find(p => fs.existsSync(p));
    let logoPath = "";
    if (!foundLogo) {
      console.warn("⚠️ Logo not found. Looked for:", logoCandidates);
    } else {
      console.log("��️ Using logo:", foundLogo);
      try {
        const lower = foundLogo.toLowerCase();
        const mime = lower.endsWith(".png") ? "image/png" : (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) ? "image/jpeg" : "application/octet-stream";
        const base64 = fs.readFileSync(foundLogo).toString("base64");
        logoPath = `data:${mime};base64,${base64}`; // embed to avoid file:// issues
      } catch (e) {
        console.warn("⚠️ Failed to embed logo, falling back to file URL:", e.message);
        logoPath = `file:///${foundLogo.replace(/\\/g, "/")}`;
      }
    } 
    
    // 2b️⃣ Letterhead background image (embed as base64)
    const letterheadCandidates = [
    path.join(assetsDir, "letterhead.png"),
    path.join(assetsDir, "letterhead.jpg"),
    path.join(assetsDir, "letterhead.jpeg"),
    ];
    const foundLetterhead = letterheadCandidates.find(p => fs.existsSync(p));
    let letterheadPath = "";
    if (!foundLetterhead) {
    console.warn("⚠️ Letterhead not found. Looked for:", letterheadCandidates);
    } else {
    try {
    const lowerLh = foundLetterhead.toLowerCase();
    const mimeLh = lowerLh.endsWith(".png") ? "image/png" : (lowerLh.endsWith(".jpg") || lowerLh.endsWith(".jpeg")) ? "image/jpeg" : "application/octet-stream";
    const base64Lh = fs.readFileSync(foundLetterhead).toString("base64");
    letterheadPath = `data:${mimeLh};base64,${base64Lh}`;
    } catch (e) {
    console.warn("⚠️ Failed to embed letterhead, falling back to file URL:", e.message);
    letterheadPath = `file:///${foundLetterhead.replace(/\\/g, "/")}`;
    }
    }
    // 🔹 Signature image
const signatureCandidates = [
  path.join(assetsDir, "signature.png"),
  path.join(assetsDir, "sign.png"),
  path.join(assetsDir, "signature.jpg"),
];
const foundSignature = signatureCandidates.find(p => fs.existsSync(p));
let signaturePath = "";
if (foundSignature) {
  try {
    const lowerS = foundSignature.toLowerCase();
    const mimeS = lowerS.endsWith(".png") ? "image/png" : 
                 (lowerS.endsWith(".jpg") || lowerS.endsWith(".jpeg")) ? "image/jpeg" : "application/octet-stream";
    const base64S = fs.readFileSync(foundSignature).toString("base64");
    signaturePath = `data:${mimeS};base64,${base64S}`;
  } catch (e) {
    console.warn("⚠️ Failed to embed signature:", e.message);
    signaturePath = `file:///${foundSignature.replace(/\\/g, "/")}`;
  }
}

    
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
      signaturePath, // ✅ match with <img src="<%= logoPath %>" />
      // reportingDateTime: offerData.reportingDateTime || "TBD", 
      // acceptanceDeadlineDate: offerData.acceptanceDeadlineDate || "TBD",
    });
    // Inject overrides and letterhead background for both pages
    const cssParts = [ '  .title-row { margin: -3mm 0 4mm !important; }' ];
    if (letterheadPath) {
      // Use letterhead behind content; avoid double logo; add top padding to clear header artwork
      cssParts.push(
        `  .page-bg { position: fixed; left: 0; top: 0; width: 210mm; height: 297mm; background-image: url('${letterheadPath}'); background-repeat: no-repeat; background-position: top center; background-size: 100% auto; z-index: -1; pointer-events: none; }`,
        '  .header { min-height: 12mm !important; }',
        '  .header .logo { display: none !important; }',
        '  .container { padding-top: 36mm !important; }',
        '  .watermark { display: none !important; }'
      );
    } else {
      // No letterhead: show large inline logo and keep header spacing
      cssParts.push(
        '  .header { min-height: 54mm !important; }',
        '  .header .logo { width: 150mm !important; height: auto !important; right: 0; top: 0; }'
      );
    }
    const withCss = html.replace('</style>', cssParts.join('\n') + '\n</style>');
    const finalHtml = letterheadPath
      ? withCss.replace('<body>', '<body>\n<div class="page-bg"></div>')
      : withCss;

    // 4️⃣ Launch Puppeteer (headless Chrome)
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.NODE_ENV === "production"
        ? "/opt/render/project/src/offer_letter/chrome/linux-141.0.7390.122/chrome-linux64/chrome"
        : puppeteer.executablePath(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--remote-debugging-port=9222"
      ],
    });

    const page = await browser.newPage();

    // 5️⃣ Load rendered HTML content
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });
     await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
    // Ensure fonts/images are fully loaded before printing for precise layout
    try { await page.evaluateHandle('document.fonts.ready'); } catch (e) {}

    // 6️⃣ Ensure uploads directory exists
    const uploadsDir = path.resolve(__dirname, "../uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });

    // 7️⃣ Safe file name for candidate
    const safeName = (offerData.candidateName || "Candidate").replace(/\s+/g, "_");
    const pdfPath = path.join(uploadsDir, `OfferLetter_${safeName}.pdf`);

    // 8️⃣ Generate PDF (edge-to-edge; inner spacing controlled by the template)
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