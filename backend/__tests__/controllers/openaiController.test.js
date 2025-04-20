import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSession, getEphemeralKey } from '../../controllers/openaiController.js';
import { ApiError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';
import config from '../../config/env.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock dependencies
vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../config/env.js', () => ({
  default: {
    openAIKey: 'mock-openai-key',
    environment: 'test',
    apiKeys: ['mock-api-key']
  }
}));

vi.mock('../../utils/agentPrompt.js', () => ({
  agentPrompt: 'Test agent prompt'
}));

describe('OpenAI Controller', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();

    // Setup request, response, and next function mocks
    req = {};
    res = {
      json: vi.fn()
    };
    next = vi.fn();

    // Reset global fetch mock
    global.fetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create an OpenAI session successfully', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ session_id: 'mock-session-id' })
      };
      global.fetch.mockResolvedValue(mockResponse);

      // Act
      await createSession(req, res, next);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/realtime/sessions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-openai-key',
            'Content-Type': 'application/json'
          }),
          body: expect.any(String)
        })
      );
      
      const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(requestBody).toEqual({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'ash',
        instructions: 'Test agent prompt'
      });
      
      expect(res.json).toHaveBeenCalledWith({ session_id: 'mock-session-id' });
      expect(logger.info).toHaveBeenCalledTimes(2);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle API errors correctly', async () => {
      // Arrange
      const errorResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({ error: 'Invalid API key' })
      };
      global.fetch.mockResolvedValue(errorResponse);

      // Act
      await createSession(req, res, next);

      // Assert
      expect(global.fetch).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].message).toContain('OpenAI API Error: 401 Unauthorized');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    it('should handle network errors correctly', async () => {
      // Arrange
      const networkError = new Error('Network failure');
      global.fetch.mockRejectedValue(networkError);

      // Act
      await createSession(req, res, next);

      // Assert
      expect(global.fetch).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(networkError);
    });

    it('should handle JSON parsing errors in error responses', async () => {
      // Arrange
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      };
      global.fetch.mockResolvedValue(errorResponse);

      // Act
      await createSession(req, res, next);

      // Assert
      expect(global.fetch).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].message).toContain('OpenAI API Error: 500 Internal Server Error');
    });
  });

  describe('getEphemeralKey', () => {
    it('should fetch ephemeral key successfully', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ 
          client_secret: { value: 'mock-ephemeral-key' } 
        })
      };
      global.fetch.mockResolvedValue(mockResponse);

      // Act
      await getEphemeralKey(req, res, next);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/session',
        expect.objectContaining({
          headers: { 'x-api-key': ['mock-api-key'] }
        })
      );
      expect(res.json).toHaveBeenCalledWith({ ephemeralKey: 'mock-ephemeral-key' });
      expect(logger.info).toHaveBeenCalledTimes(2);
      expect(next).not.toHaveBeenCalled();
    });

    it('should use production endpoint when environment is production', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ 
          client_secret: { value: 'mock-ephemeral-key' } 
        })
      };
      global.fetch.mockResolvedValue(mockResponse);
      
      // Override config environment for this test
      const originalEnv = config.environment;
      config.environment = 'production';

      // Act
      await getEphemeralKey(req, res, next);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openaibackend-production.up.railway.app/session',
        expect.objectContaining({
          headers: { 'x-api-key': ['mock-api-key'] }
        })
      );
      
      // Reset config environment
      config.environment = originalEnv;
    });

    it('should handle API errors correctly', async () => {
      // Arrange
      const errorResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: vi.fn().mockResolvedValue({ error: 'Invalid API key' })
      };
      global.fetch.mockResolvedValue(errorResponse);

      // Act
      await getEphemeralKey(req, res, next);

      // Assert
      expect(global.fetch).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].message).toBe('Failed to fetch ephemeral key');
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });

    it('should handle missing ephemeral key in response', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ 
          // No client_secret or empty client_secret
        })
      };
      global.fetch.mockResolvedValue(mockResponse);

      // Act
      await getEphemeralKey(req, res, next);

      // Assert
      expect(global.fetch).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Ephemeral key not found in response');
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].message).toBe('Ephemeral key not found in response');
      expect(next.mock.calls[0][0].statusCode).toBe(500);
    });

    it('should handle network errors correctly', async () => {
      // Arrange
      const networkError = new Error('Network failure');
      global.fetch.mockRejectedValue(networkError);

      // Act
      await getEphemeralKey(req, res, next);

      // Assert
      expect(global.fetch).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(networkError);
    });
  });
}); 