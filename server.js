const app = require('./app');
const logger = require('./src/utils/logger');
const { consumer } = require('./src/services/queueService');

const port = process.env.PORT || 3001;

const server = app.listen(port, async () => {
  logger.info(`Server đang chạy tại http://localhost:${port}`);
  logger.info(`Môi trường: ${process.env.NODE_ENV || 'development'}`);

  // Start RabbitMQ consumers (graceful fail nếu không có RabbitMQ)
  await consumer.startAll();
});

// Graceful shutdown
const shutdown = (signal) => {
  logger.info(`[Server] Nhận tín hiệu ${signal}, đang tắt...`);
  server.close(() => {
    logger.info('[Server] HTTP server đã đóng');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error(`[Server] Uncaught Exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error(`[Server] Unhandled Rejection: ${reason}`);
});
