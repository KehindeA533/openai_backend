/**
 * OpenAI controller for handling interactions with OpenAI API
 */
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import config from '../config/env.js';
import fs from 'fs/promises';
import path from 'path';

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

/**
 * Save conversation transcript to files
 */
export async function saveTranscript(req, res, next) {
  try {
    const { transcript, functionCalls, sessionData } = req.body;
    logger.info('Saving transcript data');
    
    // Get/increment session counter
    const transcriptsBaseDir = path.join(process.cwd(), 'backend/transcripts');
    await fs.mkdir(transcriptsBaseDir, { recursive: true });
    
    // Read/create session counter file
    const counterFilePath = path.join(transcriptsBaseDir, 'session_counter.json');
    let sessionCounter = 1;
    
    try {
      const counterData = await fs.readFile(counterFilePath, 'utf8');
      const counterObj = JSON.parse(counterData);
      sessionCounter = counterObj.counter + 1;
    } catch (err) {
      // File doesn't exist or is invalid, start with 1
      logger.info('Creating new session counter file');
    }
    
    // Update counter file
    await fs.writeFile(
      counterFilePath,
      JSON.stringify({ counter: sessionCounter, lastUpdated: new Date().toISOString() }, null, 2)
    );
    
    // Create session-specific directory
    const sessionDirName = `session_${sessionCounter}`;
    const sessionDir = path.join(transcriptsBaseDir, sessionDirName);
    await fs.mkdir(sessionDir, { recursive: true });
    
    // Save raw payload
    await fs.writeFile(
      path.join(sessionDir, 'raw_payload.json'),
      JSON.stringify(req.body, null, 2)
    );
    
    // Combine and sort all events chronologically
    const allEvents = [
      ...transcript.map(msg => ({
        type: 'message',
        timestamp: msg.timestamp,
        data: msg
      })),
      ...functionCalls.map(call => ({
        type: 'function',
        timestamp: call.timestamp,
        data: call
      }))
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Extract messages and function calls in chronological order
    const chronologicalTranscript = allEvents
      .filter(event => event.type === 'message')
      .map(event => event.data);
    
    const chronologicalFunctionCalls = allEvents
      .filter(event => event.type === 'function')
      .map(event => event.data);
    
    // Format text content
    const transcriptText = formatTranscriptAsText(chronologicalTranscript);
    const functionCallsText = formatFunctionCallsAsText(chronologicalFunctionCalls);
    
    // Save text files
    await fs.writeFile(
      path.join(sessionDir, 'transcript.txt'),
      transcriptText
    );
    
    await fs.writeFile(
      path.join(sessionDir, 'function_call_transcript.txt'),
      functionCallsText
    );
    
    // Save JSON files
    await fs.writeFile(
      path.join(sessionDir, 'transcript.json'),
      JSON.stringify({ transcript: chronologicalTranscript, sessionData }, null, 2)
    );
    
    await fs.writeFile(
      path.join(sessionDir, 'function_call_transcript.json'),
      JSON.stringify({ functionCalls: chronologicalFunctionCalls, sessionData }, null, 2)
    );
    
    logger.info('Transcript saved successfully', { 
      sessionId: sessionCounter,
      sessionDir: sessionDirName
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Transcript saved successfully',
      sessionId: sessionCounter,
      sessionDir: sessionDirName
    });
  } catch (error) {
    logger.error('Error saving transcript', { error: error.message });
    next(error);
  }
}

/**
 * Helper function to format the transcript as text
 */
function formatTranscriptAsText(transcript) {
  let text = '=== CONVERSATION TRANSCRIPT ===\n\n';
  
  // Add the transcript
  transcript.forEach(msg => {
    text += `[${msg.timestamp}] ${msg.role.toUpperCase()}: ${msg.content}\n\n`;
  });
  
  return text;
}

/**
 * Helper function to format function calls as text
 */
function formatFunctionCallsAsText(functionCalls) {
  let text = '=== FUNCTION CALLS TRANSCRIPT ===\n\n';
  
  // Add the function calls
  functionCalls.forEach(call => {
    text += `[${call.timestamp}] Function: ${call.functionName}\n`;
    text += `Arguments: ${JSON.stringify(call.arguments, null, 2)}\n\n`;
  });
  
  return text;
}