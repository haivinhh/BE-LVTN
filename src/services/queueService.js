const amqp = require('amqplib');
const logger = require('../utils/logger');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

const QUEUES = {
  EMAIL: 'queue.email',
  ORDER_NOTIFY: 'queue.order_notify',
};

let connection = null;
let channel = null;

/**
 * Khởi tạo kết nối RabbitMQ (lazy, retry-safe)
 */
const connect = async () => {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Đảm bảo các queue tồn tại và durable
    await channel.assertQueue(QUEUES.EMAIL, { durable: true });
    await channel.assertQueue(QUEUES.ORDER_NOTIFY, { durable: true });

    // Only process 1 message at a time (fair dispatch)
    channel.prefetch(1);

    logger.info('[RabbitMQ] Connected and queues asserted');

    connection.on('error', (err) => {
      logger.error(`[RabbitMQ] Connection error: ${err.message}`);
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      logger.warn('[RabbitMQ] Connection closed');
      connection = null;
      channel = null;
    });

    return channel;
  } catch (err) {
    logger.warn(`[RabbitMQ] Failed to connect: ${err.message} — async tasks will run inline`);
    return null;
  }
};

const getChannel = async () => {
  if (channel) return channel;
  return connect();
};

// ─── PRODUCER ─────────────────────────────────────────────────────────────────

const producer = {
  /**
   * Publish a message to a queue
   */
  async publish(queueName, payload) {
    try {
      const ch = await getChannel();
      if (!ch) {
        logger.warn(`[Producer] No channel available, skipping queue "${queueName}"`);
        return false;
      }
      const content = Buffer.from(JSON.stringify(payload));
      ch.sendToQueue(queueName, content, { persistent: true });
      logger.info(`[Producer] Published to "${queueName}": ${JSON.stringify(payload)}`);
      return true;
    } catch (err) {
      logger.error(`[Producer] Publish error to "${queueName}": ${err.message}`);
      return false;
    }
  },

  async sendEmail(to, subject, htmlContent) {
    return this.publish(QUEUES.EMAIL, { to, subject, htmlContent });
  },

  async notifyOrder(idDonHang, event) {
    return this.publish(QUEUES.ORDER_NOTIFY, { idDonHang, event, timestamp: new Date().toISOString() });
  },
};

// ─── CONSUMER ─────────────────────────────────────────────────────────────────

const consumer = {
  /**
   * Start consuming the email queue
   */
  async startEmailConsumer() {
    const ch = await getChannel();
    if (!ch) {
      logger.warn('[Consumer] No channel — email consumer not started');
      return;
    }

    const sendEmail = require('../mailService');

    ch.consume(QUEUES.EMAIL, async (msg) => {
      if (!msg) return;
      try {
        const { to, subject, htmlContent } = JSON.parse(msg.content.toString());
        logger.info(`[Consumer] Processing email to: ${to}`);
        await sendEmail(to, subject, htmlContent);
        ch.ack(msg);
        logger.info(`[Consumer] Email sent to: ${to}`);
      } catch (err) {
        logger.error(`[Consumer] Email processing error: ${err.message}`);
        // nack + requeue=false để tránh vòng lặp vô hạn
        ch.nack(msg, false, false);
      }
    });

    logger.info('[Consumer] Email consumer started');
  },

  /**
   * Start consuming order notification queue
   */
  async startOrderNotifyConsumer() {
    const ch = await getChannel();
    if (!ch) {
      logger.warn('[Consumer] No channel — order consumer not started');
      return;
    }

    ch.consume(QUEUES.ORDER_NOTIFY, async (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        logger.info(`[Consumer] Order event: ${data.event} for order #${data.idDonHang}`);
        // Additional order processing logic can be plugged here
        ch.ack(msg);
      } catch (err) {
        logger.error(`[Consumer] Order notify error: ${err.message}`);
        ch.nack(msg, false, false);
      }
    });

    logger.info('[Consumer] Order notify consumer started');
  },

  /**
   * Start all consumers
   */
  async startAll() {
    await this.startEmailConsumer();
    await this.startOrderNotifyConsumer();
  },
};

module.exports = { producer, consumer, connect, QUEUES };
