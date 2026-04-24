import winston from 'winston';
import path from 'path';
import fs from 'fs';

const LOG_PATH = process.env.LOG_PATH ?? 'D:\\logs\\openrouter-proxy';

// Ensure log directory exists
if (!fs.existsSync(LOG_PATH)) {
  fs.mkdirSync(LOG_PATH, { recursive: true });
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(LOG_PATH, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(LOG_PATH, 'combined.log')
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});
