const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const fs = require("fs");
const logger = require("../logger/logger");

const generateAppointmentPDF = async (appointmentData) => {
  try {
    logger.info("🟩 [1] Starting Appointment PDF generation...");

    if (!appointmentData || typeof appointmentData !== "object") {
      throw new Error("Invalid appointment data provided to generateAppointmentPDF()");
    }

    const templatePath = path.join(__dirname, "../templates/appointmentTemplate.ejs");
    const assetsDir = path.resolve(__dirname, "../assets");

    /** Utility: Encode image to base64 */
    const embedImage = (candidates) => {
      const found = candidates.find((p) => fs.existsSync(p));
      if (!found) return "";
      const mime = found.endsWith(".png")
        ? "image/png"
        : (found.endsWith(".jpg") || found.endsWith(".jpeg"))
        ? "image/jpeg"
        : "application/octet-stream";

      return `data:${mime};base64,${fs.readFileSync(found).toString("base64")}`;
    };

    // === EMBED ALL IMAGES ===
    const logoPath = embedImage([
      path.join(assetsDir, "image.png"),
      path.join(assetsDir, "Amazon-Logo1.png"),
      path.join(assetsDir, "logo.png"),
    ]);

    const letterheadPath = embedImage([
      path.join(assetsDir, "letterhead.png"),
      path.join(assetsDir, "letterhead.jpg"),
      path.join(assetsDir, "letterhead.jpeg"),
    ]);

    const signaturePath = embedImage([
      path.join(assetsDir, "signature.png"),
      path.join(assetsDir, "sign.png"),
      path.join(assetsDir, "signature.jpg"),
    ]);

    const stampPath = embedImage([
      path.join(assetsDir, "stamp.png"),
      path.join(assetsDir, "seal.png"),
      path.join(assetsDir, "company-stamp.png"),
    ]);

    const footerPath = embedImage([
      path.join(assetsDir, "footer.png"),
      path.join(assetsDir, "bottom.png"),
      path.join(assetsDir, "footer-strip.png"),
    ]);

    /** Normalize Salary Data */
    let salaryComponents = [];
    if (Array.isArray(appointmentData.salaryComponents) && appointmentData.salaryComponents.length > 0) {
      salaryComponents = appointmentData.salaryComponents;
    } else if (Array.isArray(appointmentData.salaryBreakdown) && appointmentData.salaryBreakdown.length > 0) {
      salaryComponents = appointmentData.salaryBreakdown;
    }

    salaryComponents = salaryComponents.map((item) => ({
      label: item.label || item.component || "",
      perAnnum: Number(item.perAnnum || item.annualAmount || item.annual || item.yearly || 0),
      perMonth: Number(item.perMonth || item.monthlyAmount || item.monthly || 0),
    }));

    logger.info("✅ Salary components prepared for PDF table");

    // === Render EJS Template ===
    const html = await ejs.renderFile(templatePath, {
      appointment: {
        issueDate: appointmentData.appointmentDate || new Date(),
        employeeName: appointmentData.employeeName || "Employee",
        address: appointmentData.address || "Address Not Provided",
        designation: appointmentData.designation || "Designation Not Provided",
        joiningDate: appointmentData.joiningDate || new Date(),
        ctcAnnual: appointmentData.ctcAnnual || 0,
        ctcWords: appointmentData.ctcWords || "",
        salaryComponents,
        hrName: appointmentData.hrName || "HR Manager",
        hrDesignation: appointmentData.hrDesignation || "Manager – Human Resources",
      },
      companyName: appointmentData.companyName || "Amazon IT Solutions",
      logoPath,
      letterheadPath,
      signaturePath,
      stampPath,
      footerPath,
    });

    logger.info("✅ [8] Appointment EJS rendered successfully");

    // === Launch Puppeteer ===
    logger.info("🟩 Launching Puppeteer...");
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
    logger.info("✅ Puppeteer launched");

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    await page.setDefaultTimeout(0);

    logger.info("🟩 Setting HTML content into Puppeteer...");
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 0 });
    await page.evaluateHandle("document.fonts.ready");

    // === Output directory ===
    const uploadsDir = path.resolve(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const companySafe = (appointmentData.companyName || "Amazon_IT_Solutions")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "");

    const safeName = (appointmentData.employeeName || "Employee").replace(/\s+/g, "_");

    const pdfPath = path.join(
      uploadsDir,
      `Appointment_Letter_${safeName}_${companySafe}.pdf`
    );

    logger.info("🟩 [14] Generating Appointment PDF...");
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
      timeout: 0,
    });

    logger.info(`✅ [15] Appointment PDF generated successfully: ${pdfPath}`);
    await browser.close();
    logger.info("✅ Browser closed");

    return pdfPath;

  } catch (error) {
    logger.error("❌ Error generating appointment PDF: " + error.stack);
    throw error;
  }
};

module.exports = generateAppointmentPDF;
