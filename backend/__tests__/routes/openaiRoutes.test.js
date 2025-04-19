import { vi, describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import openaiRoutes from '../../routes/openaiRoutes.js';
import * as openaiController from '../../controllers/openaiController.js';
import apiKeyMiddleware from '../../middleware/apiKey.js';

// Mock dependencies
vi.mock('../../controllers/openaiController.js');
vi.mock('../../middleware/apiKey.js', () => {
  return {
    default: vi.fn((req, res, next) => next())
  };
});

describe('OpenAI Routes', () => {
  let app;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup express app for testing
    app = express();
    app.use('/openai', openaiRoutes);
    
    // Mock controller implementations
    openaiController.createSession.mockImplementation((req, res) => {
      res.json({ session: { id: 'mock-session-id', token: 'mock-token' } });
    });
    
    openaiController.getEphemeralKey.mockImplementation((req, res) => {
      res.json({ ephemeralKey: 'mock-ephemeral-key' });
    });
  });

  describe('Middleware', () => {
    it('should apply the API key middleware to all routes', async () => {
      // Make a request to trigger the middleware
      await request(app)
        .get('/openai/session');
      
      // The middleware should have been called
      expect(apiKeyMiddleware).toHaveBeenCalled();
    });
  });

  describe('GET /openai/session', () => {
    it('should return session data for valid request', async () => {
      const response = await request(app)
        .get('/openai/session');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ session: { id: 'mock-session-id', token: 'mock-token' } });
      expect(openaiController.createSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /openai/getEKey', () => {
    it('should return ephemeral key for valid request', async () => {
      const response = await request(app)
        .get('/openai/getEKey');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ephemeralKey: 'mock-ephemeral-key' });
      expect(openaiController.getEphemeralKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('should handle API errors in createSession correctly', async () => {
      // Mock controller to simulate an error
      openaiController.createSession.mockImplementation((req, res, next) => {
        const error = new Error('OpenAI API error');
        error.statusCode = 400;
        next(error);
      });

      // Create a new app with error handling
      const testApp = express();
      testApp.use('/openai', openaiRoutes);
      testApp.use((err, req, res, next) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });

      const response = await request(testApp)
        .get('/openai/session');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'OpenAI API error');
    });

    it('should handle API errors in getEphemeralKey correctly', async () => {
      // Mock controller to simulate an error
      openaiController.getEphemeralKey.mockImplementation((req, res, next) => {
        const error = new Error('Failed to get ephemeral key');
        error.statusCode = 500;
        next(error);
      });

      // Create a new app with error handling
      const testApp = express();
      testApp.use('/openai', openaiRoutes);
      testApp.use((err, req, res, next) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });

      const response = await request(testApp)
        .get('/openai/getEKey');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to get ephemeral key');
    });
  });

  describe('API Key middleware', () => {
    it('should reject requests with invalid API key', async () => {
      // Mock apiKeyMiddleware to reject the request
      apiKeyMiddleware.mockImplementation((req, res, next) => {
        return res.status(403).json({ error: 'Forbidden: Invalid API Key' });
      });

      const response = await request(app)
        .get('/openai/session');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Forbidden: Invalid API Key' });
      expect(openaiController.createSession).not.toHaveBeenCalled();
    });

    it('should allow requests with valid API key', async () => {
      // Mock apiKeyMiddleware to allow the request
      apiKeyMiddleware.mockImplementation((req, res, next) => next());

      const response = await request(app)
        .get('/openai/session')
        .set('x-api-key', 'valid-api-key');

      expect(response.status).toBe(200);
      expect(openaiController.createSession).toHaveBeenCalledTimes(1);
    });
  });
}); 