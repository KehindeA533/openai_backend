import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWeatherForecast } from '../../controllers/weatherController.js';
import axios from 'axios';
import config from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

// Mock external dependencies
vi.mock('axios');

vi.mock('../../config/env.js', () => ({
  default: {
    weatherApiKey: 'mock-weather-api-key'
  }
}));

vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('Weather Controller', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();

    // Setup request, response, and next function mocks
    req = {
      query: {}
    };
    res = {
      json: vi.fn()
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getWeatherForecast', () => {
    const mockWeatherData = {
      location: {
        name: 'San Francisco',
        region: 'California',
        country: 'USA',
        lat: 37.78,
        lon: -122.42,
        localtime: '2023-09-25 10:00'
      },
      current: {
        temp_c: 18,
        temp_f: 64.4,
        condition: {
          text: 'Partly cloudy',
          icon: '//cdn.weatherapi.com/weather/64x64/day/116.png'
        },
        wind_mph: 12,
        humidity: 72,
        feelslike_c: 17
      },
      forecast: {
        forecastday: [{
          date: '2023-09-25',
          day: {
            maxtemp_c: 22,
            mintemp_c: 15,
            condition: {
              text: 'Partly cloudy',
              icon: '//cdn.weatherapi.com/weather/64x64/day/116.png'
            }
          },
          astro: {
            sunrise: '06:58 AM',
            sunset: '07:02 PM'
          },
          hour: []
        }]
      }
    };

    it('should fetch weather forecast successfully', async () => {
      // Arrange
      req.query = { zipCode: '94105' };
      axios.get.mockResolvedValue({ data: mockWeatherData });

      // Act
      await getWeatherForecast(req, res, next);

      // Assert
      expect(axios.get).toHaveBeenCalledWith(
        'http://api.weatherapi.com/v1/forecast.json',
        {
          params: {
            key: 'mock-weather-api-key',
            q: '94105',
            days: 1,
            aqi: 'no',
            alerts: 'no'
          }
        }
      );
      expect(res.json).toHaveBeenCalledWith(mockWeatherData);
      expect(logger.info).toHaveBeenCalledTimes(2);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 error when zipCode is missing', async () => {
      // Arrange
      req.query = {}; // Missing zipCode

      // Act
      await getWeatherForecast(req, res, next);

      // Assert
      expect(axios.get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].message).toBe('A valid zip code string is required.');
      expect(next.mock.calls[0][0].statusCode).toBe(400);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return 400 error when zipCode is empty', async () => {
      // Arrange
      req.query = { zipCode: '   ' }; // Empty zipCode

      // Act
      await getWeatherForecast(req, res, next);

      // Assert
      expect(axios.get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].message).toBe('A valid zip code string is required.');
      expect(next.mock.calls[0][0].statusCode).toBe(400);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle API response errors correctly (4xx)', async () => {
      // Arrange
      req.query = { zipCode: '94105' };
      const errorResponse = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            error: {
              code: 1006,
              message: 'No matching location found.'
            }
          }
        }
      };
      axios.get.mockRejectedValue(errorResponse);

      // Act
      await getWeatherForecast(req, res, next);

      // Assert
      expect(axios.get).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].message).toBe('Weather API error: No matching location found.');
      expect(next.mock.calls[0][0].statusCode).toBe(400);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle API response errors correctly (5xx)', async () => {
      // Arrange
      req.query = { zipCode: '94105' };
      const errorResponse = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {
            error: {
              message: 'Internal server error'
            }
          }
        }
      };
      axios.get.mockRejectedValue(errorResponse);

      // Act
      await getWeatherForecast(req, res, next);

      // Assert
      expect(axios.get).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].message).toBe('Weather API error: Internal server error');
      expect(next.mock.calls[0][0].statusCode).toBe(500);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      // Arrange
      req.query = { zipCode: '94105' };
      const networkError = {
        request: {},
        message: 'Network Error'
      };
      axios.get.mockRejectedValue(networkError);

      // Act
      await getWeatherForecast(req, res, next);

      // Assert
      expect(axios.get).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].message).toContain('No response received from Weather API');
      expect(next.mock.calls[0][0].statusCode).toBe(503);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      req.query = { zipCode: '94105' };
      const unexpectedError = new Error('Unexpected error');
      axios.get.mockRejectedValue(unexpectedError);

      // Act
      await getWeatherForecast(req, res, next);

      // Assert
      expect(axios.get).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(unexpectedError);
      expect(logger.error).toHaveBeenCalled();
    });
  });
}); 