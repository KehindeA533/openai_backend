/**
 * Logging utility for the application
 * Provides consistent log formatting and levels
 */
import config from '../config/env.js';

// Define log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Only log debug messages in development
const shouldLogDebug = config.environment === 'development';

/**
 * Format the log message with timestamp, level, and additional context
 */
const formatLog = (level, message, context = {}) => {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    level,
    message,
    ...(Object.keys(context).length > 0 ? { context } : {})
  };
};

/**
 * Log an error message
 */
const error = (message, context = {}) => {
  console.error(JSON.stringify(formatLog(LOG_LEVELS.ERROR, message, context)));
};

/**
 * Log a warning message
 */
const warn = (message, context = {}) => {
  console.warn(JSON.stringify(formatLog(LOG_LEVELS.WARN, message, context)));
};

/**
 * Log an informational message
 */
const info = (message, context = {}) => {
  console.log(JSON.stringify(formatLog(LOG_LEVELS.INFO, message, context)));
};

/**
 * Log a debug message (only in development)
 */
const debug = (message, context = {}) => {
  if (shouldLogDebug) {
    console.log(JSON.stringify(formatLog(LOG_LEVELS.DEBUG, message, context)));
  }
};

/**
 * Log HTTP requests
 */
const httpRequest = (req, res, duration) => {
  info(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`, {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    duration,
    ip: req.ip
  });
};

export default {
  error,
  warn,
  info,
  debug,
  httpRequest
};