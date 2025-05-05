/**
 * Audio routes
 * Defines all endpoints related to audio functionality
 */
import express from 'express';
import { saveAudioTranscript } from '../controllers/audioController.js';

const router = express.Router();

/**
 * @api {post} /save-audio-transcript Save audio transcript
 * @apiName SaveAudioTranscript
 * @apiGroup Audio
 * 
 * @apiBody {Object} audio Audio data object
 * @apiBody {String} audio.data Base64-encoded audio data
 * @apiBody {String} audio.mimeType MIME type of the audio (e.g., 'audio/wav')
 * @apiBody {Object} [metadata] Metadata for the audio transcript
 * @apiBody {Object} [functionCalls] Function calls data related to the audio
 * 
 * @apiSuccess {Boolean} success Whether the operation was successful
 * @apiSuccess {Number} sessionId The assigned session ID
 * @apiSuccess {Array} savedFiles List of files saved
 * 
 * @apiError {Boolean} success false
 * @apiError {String} error Error message
 */
router.post('/save-audio-transcript', saveAudioTranscript);

export default router; 