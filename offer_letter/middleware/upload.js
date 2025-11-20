const multer = require("multer");

// we use memory storage because you convert to Base64 (no file writing)
const upload = multer({
  storage: multer.memoryStorage()
});

module.exports = upload;
