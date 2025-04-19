/**
 * Weather controller for handling weather API requests
 */
import axios from 'axios';
import config from '../config/env.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Get weather forecast for a location
 */
export async function getWeatherForecast(req, res, next) {
  try {
    // Weather API configuration
    const WEATHER_API_KEY = config.weatherApiKey;
    const BASE_URL = 'http://api.weatherapi.com/v1';
    
    // Get zipCode from query parameters
    const { zipCode } = req.query;
    
    // Parameter validation
    if (typeof zipCode !== 'string' || zipCode.trim() === '') {
      throw new ApiError('A valid zip code string is required.', 400);
    }
    
    logger.info('Fetching weather forecast', { zipCode });
    
    // Construct the endpoint URL
    const endpoint = `${BASE_URL}/forecast.json`;
    
    // Make the API request
    const response = await axios.get(endpoint, {
      params: {
        key: WEATHER_API_KEY,
        q: zipCode,
        days: 1,
        aqi: 'no',
        alerts: 'no'
      },
    });
    
    logger.info('Weather forecast retrieved successfully', { zipCode });
    
    // Return the weather data
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to fetch weather forecast', { error: error.message });
    
    // Provide more detailed error responses
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const statusCode = error.response.status;
      const errorMessage = error.response.data?.error?.message || error.response.statusText;
      next(new ApiError(`Weather API error: ${errorMessage}`, statusCode));
    } else if (error.request) {
      // The request was made but no response was received
      next(new ApiError(`No response received from Weather API: ${error.message}`, 503));
    } else {
      // Something happened in setting up the request that triggered an Error
      next(error);
    }
  }
}