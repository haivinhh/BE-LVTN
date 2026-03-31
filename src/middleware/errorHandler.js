const logger = require('../utils/logger');

/**
 * Centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Lỗi server nội bộ';

  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} không tìm thấy`);
  err.status = 404;
  next(err);
};

module.exports = { errorHandler, notFoundHandler };
