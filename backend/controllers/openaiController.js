/**
 * OpenAI controller for handling interactions with OpenAI API
 */
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import config from '../config/env.js';

// Import agent prompt from helper functions
import { agentPrompt } from '../utils/agentPrompt.js';

/**
 * Create a new OpenAI Realtime session
 */
export async function createSession(req, res, next) {
  try {
    logger.info('Creating new OpenAI Realtime session');
    
    // Make a POST request to OpenAI's realtime sessions API
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "ash",
        instructions: agentPrompt
      }),
    });
    
    // Handle non-success response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('OpenAI API error', { 
        status: response.status, 
        statusText: response.statusText,
        data: errorData
      });
      throw new ApiError(
        `OpenAI API Error: ${response.status} ${response.statusText}`, 
        response.status
      );
    }
    
    // Parse and return the successful response
    const data = await response.json();
    logger.info('OpenAI session created successfully');
    res.json(data);
  } catch (error) {
    logger.error('Failed to create OpenAI session', { error: error.message });
    next(error);
  }
}

/**
 * Get an ephemeral key from the OpenAI backend
 */
export async function getEphemeralKey(req, res, next) {
  try {
    logger.info('Fetching ephemeral key');
    
    // Determine the API endpoint based on environment
    const endpoint = config.environment === 'production'
      ? "https://openaibackend-production.up.railway.app/session"
      : "http://localhost:3000/session";
    
    // Fetch the ephemeral key
    const response = await fetch(endpoint, {
      headers: { "x-api-key": config.apiKeys }
    });
    
    // Handle non-success response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Failed to fetch ephemeral key', {
        status: response.status,
        statusText: response.statusText,
        data: errorData
      });
      throw new ApiError('Failed to fetch ephemeral key', response.status);
    }
    
    // Parse the response and extract the ephemeral key
    const data = await response.json();
    const ephemeralKey = data.client_secret?.value;
    
    if (!ephemeralKey) {
      logger.error('Ephemeral key not found in response');
      throw new ApiError('Ephemeral key not found in response', 500);
    }
    
    logger.info('Ephemeral key fetched successfully');
    res.json({ ephemeralKey });
  } catch (error) {
    logger.error('Error fetching ephemeral key', { error: error.message });
    next(error);
  }
}