import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

// Human-readable format for development
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${ts} [${level}]: ${stack ?? message}${metaStr}`;
  }),
);

// Structured JSON format for production (ship to log aggregator)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'findata-hub' },
  transports: [
    new winston.transports.Console({
      silent: env.NODE_ENV === 'test',
    }),
  ],
});

/** Convenience wrappers that keep call sites clean. */
export const log = {
  error: (message: string, meta?: object) => logger.error(message, meta),
  warn:  (message: string, meta?: object) => logger.warn(message, meta),
  info:  (message: string, meta?: object) => logger.info(message, meta),
  debug: (message: string, meta?: object) => logger.debug(message, meta),
};
