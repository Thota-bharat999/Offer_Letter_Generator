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

    /** Utility: Encode image to base64 */
    const embedImage = (candidates) => {
      const found = candidates.find((p) => fs.existsSync(p));
      if (!found) return "";
      const mime = found.endsWith(".png")
        ? "image/png"
        : found.endsWith(".jpg") || found.endsWith(".jpeg")
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

    /** ✅ Normalize Salary Data */
    let salaryComponents = [];
    if (Array.isArray(appointmentData.salaryComponents) && appointmentData.salaryComponents.length > 0) {
      salaryComponents = appointmentData.salaryComponents;
    } else if (Array.isArray(appointmentData.salaryBreakdown) && appointmentData.salaryBreakdown.length > 0) {
      salaryComponents = appointmentData.salaryBreakdown;
    }

    // Ensure numeric formatting for table
    salaryComponents = salaryComponents.map((item) => ({
      label: item.label || item.component || "",
      perAnnum: Number(item.perAnnum || item.annual || item.yearly || 0),
      perMonth: Number(item.perMonth || item.monthly || 0),
    }));

    console.log("✅ Salary components prepared:", salaryComponents);

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
        salaryComponents, // ✅ guaranteed table data
        hrName: appointmentData.hrName || "HR Manager",
        hrDesignation: appointmentData.hrDesignation || "Manager – Human Resources",
      },
      logoPath,
      letterheadPath,
      signaturePath,
      stampPath,
      footerPath,
    });

    console.log("✅ [8] Appointment EJS rendered successfully");

    // === Launch Puppeteer ===
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

    console.log("🟩 [12] Setting HTML content...");
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 0 });
    await page.evaluateHandle("document.fonts.ready");

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

    return pdfPath;
  } catch (error) {
    console.error("❌ Error generating appointment PDF:", error);
    throw error;
  }
};

module.exports = generateAppointmentPDF;
