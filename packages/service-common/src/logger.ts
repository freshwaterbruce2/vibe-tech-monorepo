// Structured logger using Winston

import path from 'path';

import winston from 'winston';



const { combine, timestamp, json, printf, colorize } = winston.format;



// Custom format for development

const devFormat = printf(({ level, message, timestamp, ...meta }) => {

  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';

  return `${timestamp} [${level}]: ${message} ${metaStr}`;

});



// Create logger instance

export const logger = winston.createLogger({

  level: process.env.LOG_LEVEL ?? 'info',

  format: combine(

    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),

    json()

  ),

  defaultMeta: {

    service: process.env.SERVICE_NAME ?? 'unknown',

  },

  transports: [

    // Console transport with pretty printing in development

    new winston.transports.Console({

      format: process.env.NODE_ENV === 'production'

        ? combine(timestamp(), json())

        : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat),

    }),

  ],

});



// Dynamically determine log directory

const serviceName = process.env.SERVICE_NAME ?? 'unknown';

const baseLogPath = process.env.ANTIGRAVITY_LOGS

  ? path.join(process.env.ANTIGRAVITY_LOGS, serviceName)

  : path.join(process.cwd(), 'logs', serviceName);



// Add file transport in production

if (process.env.NODE_ENV === 'production') {

  // Ensure the log directory exists (Node.js does not automatically create parent dirs)

  // This will be handled by the setup-antigravity.ps1 script on D drive.

  // For local 'logs' fallback, it might need to be created.

  // We'll rely on the runtime environment to ensure `baseLogPath` exists or handle errors.



  logger.add(new winston.transports.File({

    filename: path.join(baseLogPath, 'error.log'),

    level: 'error'

  }));

  logger.add(new winston.transports.File({

    filename: path.join(baseLogPath, 'combined.log')

  }));

}



// Child logger factory for adding context

export const createChildLogger = (context: Record<string, unknown>) => {

  return logger.child(context);

};



export default logger;


