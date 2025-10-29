const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const fs = require("fs");

const generateRelievingPDF = async (data) => {
  try {
    console.log("[1] Starting Relieving PDF generation...");

    if (!data || typeof data !== "object") {
      throw new Error("Invalid data provided to generateRelievingPDF()");
    }

    const templatePath = path.join(__dirname, "../templates/relieving.ejs");
    const assetsDir = path.resolve(__dirname, "../assets");

    // === EMBED LOGO ===
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
      console.log("✅ Logo embedded:", foundLogo);
    } else console.warn("⚠️ Logo not found in:", logoCandidates);

    // === EMBED LETTERHEAD ===
    const letterheadCandidates = [
      path.join(assetsDir, "letterhead.png"),
      path.join(assetsDir, "letterhead_with_footer.png"),
      path.join(assetsDir, "letterhead.jpg"),
      path.join(assetsDir, "letterhead_with_footer.jpg"),
    ];
    const foundLetterhead = letterheadCandidates.find((p) => fs.existsSync(p));
    let letterheadPath = "";
    let hasFooterImage = false;

    if (foundLetterhead) {
      const mime = foundLetterhead.endsWith(".png")
        ? "image/png"
        : foundLetterhead.endsWith(".jpg") || foundLetterhead.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";
      letterheadPath = `data:${mime};base64,${fs.readFileSync(foundLetterhead).toString("base64")}`;

      // auto-detect footer in filename
      if (foundLetterhead.includes("with_footer")) hasFooterImage = true;

      console.log("✅ Letterhead embedded:", foundLetterhead);
    } else console.warn("⚠️ Letterhead not found in:", letterheadCandidates);

    // === EMBED SIGNATURE ===
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
      console.log("✅ Signature embedded:", foundSignature);
    } else console.warn("⚠️ Signature not found in:", signatureCandidates);

    // === RENDER EJS ===
    console.log("🟩 [2] Rendering EJS template...");
    const html = await ejs.renderFile(templatePath, {
      employee_name: data.employeeName || "Employee Name",
      employee_id: data.employeeId || "EMP001",
      designation: data.designation || "Software Engineer",
      start_date: data.joiningDate || "2022-01-01",
      resignation_date: data.resignationDate || data.relievingDate || "2025-09-15",
      relieving_date: data.relievingDate || "2025-09-15",
      hrName: data.hrName || "Chakravarthy Devarkonda",
      hrDesignation: data.hrDesignation || "Manager – Human Resources",
      logoPath,
      letterheadPath,
      signaturePath,
      hasFooterImage, // <== important flag
    });

    console.log("✅ [3] EJS rendered successfully");

    // === BACKGROUND LETTERHEAD ===
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
            background-size: cover;
            background-position: center top;
            z-index: -1;
          "></div>`
      );
    }

    // === LAUNCH PUPPETEER ===
    console.log("[4] Launching Puppeteer...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(modifiedHtml, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");

    const uploadsDir = path.resolve(__dirname, "../generated_pdfs");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const safeName = (data.employeeName || "Employee").replace(/\s+/g, "_");
    const pdfPath = path.join(uploadsDir, `Relieving_${safeName}.pdf`);

    console.log("🟩 [5] Generating PDF...");
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "0px", bottom: "0px", left: "0px", right: "0px" },
    });

    await browser.close();
    console.log("✅ PDF generated successfully:", pdfPath);
    return pdfPath;
  } catch (error) {
    console.error("❌ Error generating relieving PDF:", error);
    throw error;
  }
};

module.exports = generateRelievingPDF;
