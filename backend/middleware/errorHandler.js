/**
 * Global error handling middleware for the application
 * Centralizes error handling logic and provides consistent error responses
 */
import config from '../config/env.js';

/**
 * Custom error class with status code and optional data
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, data = {}) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 * Handles all errors thrown in the application
 */
const errorHandler = (err, req, res, next) => {
  const isDev = config.environment === 'development';
  
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let stack = err.stack;
  let data = err.data || {};
  
  // Log the error (with stack trace in development)
  console.error(`[ERROR] ${message}`);
  if (isDev) {
    console.error(stack);
  }

  // Don't expose stack traces in production
  if (!isDev) {
    stack = undefined;
    
    // For 500 errors, use a generic message in production
    if (statusCode === 500) {
      message = 'Internal Server Error';
    }
  }

  // Send error response
  res.status(statusCode).json({
    error: message,
    ...(isDev && stack ? { stack } : {}),
    ...(Object.keys(data).length > 0 ? { data } : {})
  });
};

export default errorHandler;