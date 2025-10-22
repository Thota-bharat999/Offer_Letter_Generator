const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const fs = require("fs");

const generateOfferPDF = async (offerData) => {
  try {
    // 1️⃣ Load the EJS template
    const templatePath = path.join(__dirname, "../templates/offer.ejs");

    // 2️⃣ Load assets (logo, signature, etc.)
    const assetsDir = path.resolve(__dirname, "../assets");

    // ----- Logo -----
    const logoCandidates = [
      path.join(assetsDir, "image.png"),
      path.join(assetsDir, "Amazon-Logo1.png"),
      path.join(assetsDir, "logo.png"),
    ];
    const foundLogo = logoCandidates.find((p) => fs.existsSync(p));
    let logoPath = "";
    if (foundLogo) {
      const ext = path.extname(foundLogo).toLowerCase();
      const mime =
        ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "application/octet-stream";
      const base64 = fs.readFileSync(foundLogo).toString("base64");
      logoPath = `data:${mime};base64,${base64}`;
      console.log("✅ Using logo:", foundLogo);
    } else {
      console.warn("⚠️ No logo found. Looked for:", logoCandidates);
    }

    // ----- Letterhead -----
    const letterheadCandidates = [
      path.join(assetsDir, "letterhead.png"),
      path.join(assetsDir, "letterhead.jpg"),
      path.join(assetsDir, "letterhead.jpeg"),
    ];
    const foundLetterhead = letterheadCandidates.find((p) => fs.existsSync(p));
    let letterheadPath = "";
    if (foundLetterhead) {
      const ext = path.extname(foundLetterhead).toLowerCase();
      const mime =
        ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "application/octet-stream";
      const base64 = fs.readFileSync(foundLetterhead).toString("base64");
      letterheadPath = `data:${mime};base64,${base64}`;
    }

    // ----- Signature -----
    const signatureCandidates = [
      path.join(assetsDir, "signature.png"),
      path.join(assetsDir, "sign.png"),
      path.join(assetsDir, "signature.jpg"),
    ];
    const foundSignature = signatureCandidates.find((p) => fs.existsSync(p));
    let signaturePath = "";
    if (foundSignature) {
      const ext = path.extname(foundSignature).toLowerCase();
      const mime =
        ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "application/octet-stream";
      const base64 = fs.readFileSync(foundSignature).toString("base64");
      signaturePath = `data:${mime};base64,${base64}`;
    }

    // 3️⃣ Render the EJS → HTML
    const html = await ejs.renderFile(templatePath, {
      ...offerData,
      companyName: "Amazon IT Solutions",
      companyAddress:
        "Amazon IT Solutions Pvt. Ltd.\nPlot No. 23, Hi-Tech City Road,\nHyderabad, Telangana – 500081",
      logoPath,
      signaturePath,
    });

    // 4️⃣ Launch Puppeteer
    const chromePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      (process.env.NODE_ENV === "production"
        ? "/opt/render/project/src/offer_letter/chrome/linux-141.0.7390.122/chrome-linux64/chrome"
        : puppeteer.executablePath());

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

    // 5️⃣ Ensure uploads dir exists
    const uploadsDir = path.resolve(__dirname, "../uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });

    const safeName = (offerData.candidateName || "Candidate").replace(
      /\s+/g,
      "_"
    );
    const pdfPath = path.join(uploadsDir, `OfferLetter_${safeName}.pdf`);

    // 6️⃣ Create PDF
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
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
