/**
 * Weather routes
 * Defines all endpoints related to weather functionality
 */
import express from 'express';
import { getWeatherForecast } from '../controllers/weatherController.js';
import apiKeyMiddleware from '../middleware/apiKey.js';

const router = express.Router();

/**
 * Apply API key middleware to all weather routes
 */
router.use(apiKeyMiddleware);

/**
 * @api {get} /weather/forecast Get weather forecast
 * @apiName GetWeatherForecast
 * @apiGroup Weather
 * 
 * @apiHeader {String} x-api-key API key for authentication
 * 
 * @apiParam {String} zipCode Zip code or location identifier
 * 
 * @apiSuccess {Object} forecast Weather forecast data
 * 
 * @apiError {Object} error Error message
 */
router.get('/forecast', getWeatherForecast);

export default router;