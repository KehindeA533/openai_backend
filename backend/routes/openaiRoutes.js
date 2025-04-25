/**
 * OpenAI routes
 * Defines all endpoints related to OpenAI functionality
 */
import express from 'express';
import { createSession, getEphemeralKey, saveTranscript } from '../controllers/openaiController.js';
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

/**
 * @api {post} /api/save-transcript Save conversation transcript
 * @apiName SaveTranscript
 * @apiGroup OpenAI
 * 
 * @apiBody {Array} transcript Array of conversation messages
 * @apiBody {Array} functionCalls Array of function calls made during conversation
 * @apiBody {Object} sessionData Session metadata
 * 
 * @apiSuccess {Boolean} success Indicates if transcript was saved successfully
 * @apiSuccess {String} message Status message
 * @apiSuccess {String} filename Name of the saved text file
 * @apiSuccess {String} jsonFilename Name of the saved JSON file
 * 
 * @apiError {Object} error Error message
 */
router.post('/api/save-transcript', saveTranscript);

export default router;