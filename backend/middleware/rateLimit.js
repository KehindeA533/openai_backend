/**
 * Rate limiting middleware to prevent abuse
 */
import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

// Configure the rate limiter using settings from config
const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { 
    error: 'Too many requests from this IP. Please try again later.'
  },
  // Skip rate limiting in test environment
  skip: () => config.environment === 'test'
});

export default rateLimiter;