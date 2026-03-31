const Joi = require('joi');
require('dotenv').config();

const schema = Joi.object({
  PORT: Joi.number().default(3001),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  JWT_ACCESS_KEY: Joi.string().min(16).required(),
  JWT_REFRESH_KEY: Joi.string().min(16).required(),
  EMAIL_USER: Joi.string().email().required(),
  EMAIL_PASS: Joi.string().required(),
  REDIS_URL: Joi.string().uri().optional().default('redis://localhost:6379'),
  RABBITMQ_URL: Joi.string().optional().default('amqp://localhost'),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
}).unknown(true); // allow other env vars

const { error, value: env } = schema.validate(process.env, { abortEarly: false });

if (error) {
  const messages = error.details.map((d) => d.message).join('\n');
  throw new Error(`[EnvConfig] Biến môi trường không hợp lệ:\n${messages}`);
}

module.exports = env;
