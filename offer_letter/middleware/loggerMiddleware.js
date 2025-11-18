const logger = require("../logger/logger");

module.exports = (req, res, next) => {
  logger.info(`API Request: ${req.method} ${req.originalUrl}`);
  next();
};
