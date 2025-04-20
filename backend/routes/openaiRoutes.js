/**
 * OpenAI routes
 * Defines all endpoints related to OpenAI functionality
 */
import express from 'express';
import { createSession, getEphemeralKey } from '../controllers/openaiController.js';
import apiKeyMiddleware from '../middleware/apiKey.js';

const router = express.Router();

/**
 * @api {get} /session Create a session with OpenAI
 * @apiName CreateSession
 * @apiGroup OpenAI
 * 
 * @apiHeader {String} x-api-key API key for authentication
 * 
 * @apiSuccess {Object} session Session data from OpenAI
 * 
 * @apiError {Object} error Error message
 */
router.get('/session', apiKeyMiddleware, createSession);

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