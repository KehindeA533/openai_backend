/**
 * OpenAI routes
 * Defines all endpoints related to OpenAI functionality
 */
import express from 'express';
import { createSession, getEphemeralKey } from '../controllers/openaiController.js';
import apiKeyMiddleware from '../middleware/apiKey.js';

const router = express.Router();

/**
 * Apply API key middleware to all OpenAI routes
 */
router.use(apiKeyMiddleware);

/**
 * @api {get} /session Create a new OpenAI session
 * @apiName CreateSession
 * @apiGroup OpenAI
 * 
 * @apiHeader {String} x-api-key API key for authentication
 * 
 * @apiSuccess {Object} session OpenAI session object with session ID and token
 * 
 * @apiError {Object} error Error message
 */
router.get('/session', createSession);

/**
 * @api {get} /getEKey Get an ephemeral key
 * @apiName GetEphemeralKey
 * @apiGroup OpenAI
 * 
 * @apiHeader {String} x-api-key API key for authentication
 * 
 * @apiSuccess {Object} ephemeralKey The ephemeral key value
 * 
 * @apiError {Object} error Error message
 */
router.get('/getEKey', getEphemeralKey);

export default router;