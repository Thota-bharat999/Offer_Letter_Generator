const multer = require("multer");

// Memory storage to avoid disk I/O (faster, non-blocking)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // max 10 MB per file
  }
});

module.exports = upload;
