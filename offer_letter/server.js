const logger = require("./logger/logger");

// Override console logs → send to Winston
console.log = (...args) =>
  logger.info(args.map(a => (typeof a === "object" ? JSON.stringify(a) : a)).join(" "));

console.error = (...args) =>
  logger.error(args.map(a => (typeof a === "object" ? JSON.stringify(a) : a)).join(" "));

console.warn = (...args) =>
  logger.warn(args.map(a => (typeof a === "object" ? JSON.stringify(a) : a)).join(" "));

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const bodyParser = require("body-parser");
const loggerMiddleware = require("./middleware/loggerMiddleware");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
const offerRoutes = require("./routes/offerRoutes");
const companyRoutes = require("./routes/companyRoutes");
const relievingRoutes = require("./routes/relievingRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const onboardingRoutes = require("./routes/onboardingRoutes");

// CORS
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  })
);

// Static + logger
app.use(express.json());
app.use("/assets", express.static(__dirname + "/offer_letter/assets"));
app.use(loggerMiddleware);

// API Routes
app.use("/api/offer", offerRoutes);
app.use("/api/offer/company", companyRoutes);
app.use("/api/relieving", relievingRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/onboarding", onboardingRoutes);

// MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
  })
  .then(() => logger.info("MongoDB connected"))
  .catch((err) => logger.error("MongoDB connection error: " + err.message));

// Test route
app.get("/", (req, res) => res.send("Offer Letter Generator API is running..."));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Server Running on ${PORT}`));
