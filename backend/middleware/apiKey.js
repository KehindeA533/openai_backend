/**
 * API Key validation middleware
 * Checks for a valid API key in the x-api-key header
 */
import config from '../config/env.js';

/**
 * Middleware that validates API keys from the request headers
 */
const apiKeyMiddleware = (req, res, next) => {
  // Extract the API key from the custom header 'x-api-key'
  const apiKey = req.headers['x-api-key'];
  
  // Check if an API key is provided and if it exists in the allowed API keys
  if (!apiKey || !config.apiKeys.includes(apiKey)) {
    // If the API key is missing or invalid, respond with a 403 Forbidden error
    return res.status(403).json({ error: 'Forbidden: Invalid API Key' });
  }
  
  // If the API key is valid, pass control to the next middleware or route handler
  next();
};

export default apiKeyMiddleware;