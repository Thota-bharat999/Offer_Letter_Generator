const logger = require("../logger/logger");

const loggerMiddleware = (req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
};

module.exports = loggerMiddleware;

