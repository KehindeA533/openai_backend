/**
 * Main server entry point
 */
import express from 'express';
import cors from 'cors';
import config from './config/env.js';
import logger from './utils/logger.js';

// Import routes
import openaiRoutes from './routes/openaiRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';

// Import middleware
import apiKeyMiddleware from './middleware/apiKey.js';
import errorHandler from './middleware/errorHandler.js';
import rateLimiter from './middleware/rateLimit.js';

// Create Express application
const app = express();

// ============================================================================
// STEP 1: Set up Middleware
// ============================================================================

// Apply CORS middleware globally with configured origins
app.use(
  cors({
    origin: (origin, callback) => {
      // If the request has no origin (e.g., a same-origin request) or if the origin is in the allowed list, allow the request
      if (!origin || config.corsOptions.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // If the origin is not allowed, return an error
        callback(new Error('Not allowed by CORS'));
      }
    }
  })
);

// Apply rate limiting to all requests
app.use(rateLimiter);

// Parse JSON request bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // When the response is finished, log the HTTP request
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.httpRequest(req, res, duration);
  });
  
  next();
});

// ============================================================================
// STEP 2: Define Routes
// ============================================================================

// Mount all OpenAI routes
// This will make routes available at /session and /getEKey directly
app.use('/', openaiRoutes);

// Calendar routes
app.use('/calendar', calendarRoutes);

// Weather routes
app.use('/weather', weatherRoutes);


// Handle 404 errors
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not Found - The requested resource does not exist' });
});

// Error handling middleware (must be the last middleware)
app.use(errorHandler);

// ============================================================================
// STEP 3: Start the Server
// ============================================================================

app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});