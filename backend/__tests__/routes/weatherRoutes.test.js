import { vi, describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import weatherRoutes from '../../routes/weatherRoutes.js';
import * as weatherController from '../../controllers/weatherController.js';
import apiKeyMiddleware from '../../middleware/apiKey.js';

// Mock dependencies
vi.mock('../../controllers/weatherController.js');
vi.mock('../../middleware/apiKey.js', () => {
  return {
    default: vi.fn((req, res, next) => next())
  };
});

describe('Weather Routes', () => {
  let app;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup express app for testing
    app = express();
    app.use('/weather', weatherRoutes);
    
    // Mock controller implementation
    weatherController.getWeatherForecast.mockImplementation((req, res) => {
      res.json({ forecast: 'Mock forecast data' });
    });
  });

  describe('Middleware', () => {
    it('should apply the API key middleware to all routes', async () => {
      // Make a request to trigger the middleware
      await request(app)
        .get('/weather/forecast')
        .query({ zipCode: '90210' });
      
      // The middleware should have been called
      expect(apiKeyMiddleware).toHaveBeenCalled();
    });
  });

  describe('GET /weather/forecast', () => {
    it('should return forecast data for valid request', async () => {
      const response = await request(app)
        .get('/weather/forecast')
        .query({ zipCode: '90210' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ forecast: 'Mock forecast data' });
      expect(weatherController.getWeatherForecast).toHaveBeenCalledTimes(1);
    });

    it('should pass zipCode from query parameters to controller', async () => {
      await request(app)
        .get('/weather/forecast')
        .query({ zipCode: '90210' });

      // Verify the controller was called with the right request object
      const mockCall = weatherController.getWeatherForecast.mock.calls[0][0];
      expect(mockCall.query.zipCode).toBe('90210');
    });
  });

  describe('Error handling', () => {
    it('should handle API errors correctly', async () => {
      // Mock controller to simulate an error
      weatherController.getWeatherForecast.mockImplementation((req, res, next) => {
        const error = new Error('Weather API error');
        error.statusCode = 400;
        next(error);
      });

      // Create a new app with error handling
      const testApp = express();
      testApp.use('/weather', weatherRoutes);
      testApp.use((err, req, res, next) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });

      const response = await request(testApp)
        .get('/weather/forecast')
        .query({ zipCode: '90210' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Weather API error');
    });

    it('should handle missing zipCode parameter', async () => {
      // Mock controller to validate zipCode
      weatherController.getWeatherForecast.mockImplementation((req, res, next) => {
        if (!req.query.zipCode) {
          const error = new Error('A valid zip code is required');
          error.statusCode = 400;
          return next(error);
        }
        res.json({ forecast: 'Mock forecast data' });
      });

      // Create a new app with error handling
      const testApp = express();
      testApp.use('/weather', weatherRoutes);
      testApp.use((err, req, res, next) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });

      const response = await request(testApp)
        .get('/weather/forecast');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'A valid zip code is required');
    });
  });

  describe('API Key middleware', () => {
    it('should reject requests with invalid API key', async () => {
      // Mock apiKeyMiddleware to reject the request
      apiKeyMiddleware.mockImplementation((req, res, next) => {
        return res.status(403).json({ error: 'Forbidden: Invalid API Key' });
      });

      const response = await request(app)
        .get('/weather/forecast')
        .query({ zipCode: '90210' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Forbidden: Invalid API Key' });
      expect(weatherController.getWeatherForecast).not.toHaveBeenCalled();
    });

    it('should allow requests with valid API key', async () => {
      // Mock apiKeyMiddleware to allow the request
      apiKeyMiddleware.mockImplementation((req, res, next) => next());

      const response = await request(app)
        .get('/weather/forecast')
        .query({ zipCode: '90210' })
        .set('x-api-key', 'valid-api-key');

      expect(response.status).toBe(200);
      expect(weatherController.getWeatherForecast).toHaveBeenCalledTimes(1);
    });
  });
}); 