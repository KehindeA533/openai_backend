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

// Add S3 imports
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// Create S3 client
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
  }
});

// S3 bucket configuration
const S3_BUCKET_NAME = config.aws.bucketName;
const S3_STORAGE_CLASS = 'STANDARD_IA'; // Standard-Infrequent Access

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
 * Save conversation transcript to AWS S3
 */
export async function saveTranscript(req, res, next) {
  try {
    const { transcript, functionCalls, userAudioClips, aiAudioClips, sessionData } = req.body;
    logger.info('Saving transcript data with audio to S3');
    
    // Get/increment session counter
    let sessionCounter = 1;
    
    try {
      // Try to get the current counter from S3
      const counterResponse = await s3Client.send(new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: 'session_counter.json'
      }));
      
      const counterData = await streamToString(counterResponse.Body);
      const counterObj = JSON.parse(counterData);
      sessionCounter = counterObj.counter + 1;
    } catch (err) {
      // File doesn't exist or is invalid, start with 1
      logger.info('Creating new session counter file in S3');
    }
    
    // Update counter file in S3
    const counterContent = JSON.stringify({ 
      counter: sessionCounter, 
      lastUpdated: new Date().toISOString() 
    }, null, 2);
    
    await uploadToS3(
      'session_counter.json',
      counterContent,
      'application/json'
    );
    
    // Set base path for this session
    const sessionPrefix = `session_${sessionCounter}/`;
    
    // Save raw payload
    await uploadToS3(
      `${sessionPrefix}raw_payload.json`,
      JSON.stringify(req.body, null, 2),
      'application/json'
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
    
    // Save text files to S3
    await uploadToS3(
      `${sessionPrefix}transcript.txt`,
      transcriptText,
      'text/plain'
    );
    
    await uploadToS3(
      `${sessionPrefix}function_call_transcript.txt`,
      functionCallsText,
      'text/plain'
    );
    
    // Save JSON files to S3
    await uploadToS3(
      `${sessionPrefix}transcript.json`,
      JSON.stringify({ transcript: chronologicalTranscript, sessionData }, null, 2),
      'application/json'
    );
    
    await uploadToS3(
      `${sessionPrefix}function_call_transcript.json`,
      JSON.stringify({ functionCalls: chronologicalFunctionCalls, sessionData }, null, 2),
      'application/json'
    );
    
    // Handle user audio clips
    if (userAudioClips && userAudioClips.length > 0) {
      const userAudioPrefix = `${sessionPrefix}user_audio/`;
      const userAudioMetadata = [];
      
      for (let i = 0; i < userAudioClips.length; i++) {
        const clip = userAudioClips[i];
        const timestamp = new Date(clip.timestamp);
        const formattedTime = timestamp.getTime();
        const filename = `user_audio_${i+1}_${formattedTime}.webm`;
        
        // Convert base64 to binary
        const audioBuffer = Buffer.from(clip.audioData, 'base64');
        
        // Save the audio file to S3
        await uploadToS3(
          `${userAudioPrefix}${filename}`,
          audioBuffer,
          'audio/webm'
        );
        
        // Add to metadata
        userAudioMetadata.push({
          index: i + 1,
          timestamp: clip.timestamp,
          formattedTimestamp: timestamp.toISOString(),
          filename: filename
        });
      }
      
      // Save metadata to S3
      await uploadToS3(
        `${userAudioPrefix}metadata.json`,
        JSON.stringify(userAudioMetadata, null, 2),
        'application/json'
      );
    }
    
    // Handle AI audio clips
    if (aiAudioClips && aiAudioClips.length > 0) {
      const aiAudioPrefix = `${sessionPrefix}ai_audio/`;
      const aiAudioMetadata = [];
      
      for (let i = 0; i < aiAudioClips.length; i++) {
        const clip = aiAudioClips[i];
        const timestamp = new Date(clip.timestamp);
        const formattedTime = timestamp.getTime();
        const filename = `ai_audio_${i+1}_${formattedTime}.pcm`;
        
        // Convert base64 to binary
        const audioBuffer = Buffer.from(clip.audioData, 'base64');
        
        // Save the audio file to S3
        await uploadToS3(
          `${aiAudioPrefix}${filename}`,
          audioBuffer,
          'audio/pcm'
        );
        
        // Add to metadata
        aiAudioMetadata.push({
          index: i + 1,
          timestamp: clip.timestamp,
          formattedTimestamp: timestamp.toISOString(),
          filename: filename
        });
      }
      
      // Save metadata to S3
      await uploadToS3(
        `${aiAudioPrefix}metadata.json`,
        JSON.stringify(aiAudioMetadata, null, 2),
        'application/json'
      );
    }
    
    logger.info('Transcript and audio saved successfully to S3', { 
      sessionId: sessionCounter,
      bucketName: S3_BUCKET_NAME,
      sessionPrefix
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Transcript and audio saved successfully to S3',
      sessionId: sessionCounter,
      sessionPrefix
    });
  } catch (error) {
    logger.error('Error saving transcript and audio to S3', { error: error.message });
    next(error);
  }
}

/**
 * Helper function to upload data to S3
 */
async function uploadToS3(key, content, contentType) {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: content,
        ContentType: contentType,
        StorageClass: S3_STORAGE_CLASS
      }
    });
    
    return await upload.done();
  } catch (error) {
    logger.error(`Error uploading to S3: ${key}`, { error: error.message });
    throw error;
  }
}

/**
 * Helper function to convert a readable stream to a string
 */
async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
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