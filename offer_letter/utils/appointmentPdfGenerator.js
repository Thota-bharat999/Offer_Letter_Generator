const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const fs = require("fs");

const generateAppointmentPDF = async (appointmentData) => {
  try {
    console.log("🟩 [1] Starting Appointment PDF generation...");

    if (!appointmentData || typeof appointmentData !== "object") {
      throw new Error("Invalid appointment data provided to generateAppointmentPDF()");
    }

    const templatePath = path.join(__dirname, "../templates/appointmentTemplate.ejs");
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

    // === EMBED STAMP ===
    const stampCandidates = [
      path.join(assetsDir, "stamp.png"),
      path.join(assetsDir, "seal.png"),
      path.join(assetsDir, "company-stamp.png"),
    ];
    const foundStamp = stampCandidates.find((p) => fs.existsSync(p));
    let stampPath = "";
    if (foundStamp) {
      const mime = foundStamp.endsWith(".png")
        ? "image/png"
        : foundStamp.endsWith(".jpg") || foundStamp.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";
      stampPath = `data:${mime};base64,${fs.readFileSync(foundStamp).toString("base64")}`;
      console.log("✅ Stamp embedded:", foundStamp);
    } else console.warn("⚠️ Stamp not found in:", stampCandidates);

    // === EMBED FOOTER ===
    const footerCandidates = [
      path.join(assetsDir, "footer.png"),
      path.join(assetsDir, "bottom.png"),
      path.join(assetsDir, "footer-strip.png"),
    ];
    const foundFooter = footerCandidates.find((p) => fs.existsSync(p));
    let footerPath = "";
    if (foundFooter) {
      const mime = foundFooter.endsWith(".png")
        ? "image/png"
        : foundFooter.endsWith(".jpg") || foundFooter.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";
      footerPath = `data:${mime};base64,${fs.readFileSync(foundFooter).toString("base64")}`;
      console.log("✅ Footer embedded:", foundFooter);
    } else console.warn("⚠️ Footer not found in:", footerCandidates);

    // === RENDER EJS TEMPLATE ===
    const html = await ejs.renderFile(templatePath, {
      appointment: {
        issueDate: appointmentData.appointmentDate || new Date(),
        employeeName: appointmentData.employeeName || "Employee",
        address: appointmentData.address || "Address Not Provided",
        designation: appointmentData.designation || "Designation Not Provided",
        joiningDate: appointmentData.joiningDate || new Date(),
        ctcAnnual: appointmentData.ctcAnnual || 0,
        ctcWords: appointmentData.ctcWords || "",
        salaryBreakdown: appointmentData.salaryBreakdown || [],
        hrName: appointmentData.hrName || "HR Manager",
        hrDesignation: appointmentData.hrDesignation || "Manager – Human Resources",
      },
      appointmentDate: appointmentData.appointmentDate || new Date(),
      employeeName: appointmentData.employeeName || "Employee",
      address: appointmentData.address || "Address Not Provided",
      logoPath,
      letterheadPath,
      signaturePath,
      stampPath,
      footerPath,
    });

    console.log("✅ [8] Appointment EJS rendered successfully");

    // === LAUNCH PUPPETEER ===
    console.log("🟩 [10] Launching Puppeteer...");
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

    console.log("✅ [11] Puppeteer launched successfully");

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    await page.setDefaultTimeout(0);

    console.log("🟩 [12] Setting HTML content...");
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 0 });
    await page.evaluateHandle("document.fonts.ready");
    console.log("✅ [13] Page fully loaded with fonts");

    // === OUTPUT DIRECTORY ===
    const uploadsDir = path.resolve(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const safeName = (appointmentData.employeeName || "Employee").replace(/\s+/g, "_");
    const pdfPath = path.join(uploadsDir, `AppointmentLetter_${safeName}.pdf`);

    console.log("🟩 [14] Generating Appointment PDF...");
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
      timeout: 0,
    });

    console.log("✅ [15] Appointment PDF generated successfully:", pdfPath);

    await browser.close();
    console.log("✅ [16] Browser closed successfully");

    return pdfPath;
  } catch (error) {
    console.error("❌ Error generating appointment PDF:", error);
    throw error;
  }
};

module.exports = generateAppointmentPDF;
