/**
 * Audio controller for handling transcript uploads and processing
 */
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import config from '../config/env.js';

// Create S3 client
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
  }
});

// Base path for storing transcripts in S3
const S3_TRANSCRIPT_PREFIX = 'transcripts/';

/**
 * Get the next session ID by checking existing folders in S3
 * @returns {number} Next available session ID
 */
async function getNextSessionId() {
  try {
    // List objects in the transcripts prefix with delimiter to get "folders"
    const listCommand = new ListObjectsV2Command({
      Bucket: config.aws.bucketName,
      Prefix: S3_TRANSCRIPT_PREFIX,
      Delimiter: '/'
    });
    
    const response = await s3Client.send(listCommand);
    
    // CommonPrefixes will contain our session folders
    const directories = response.CommonPrefixes || [];
    
    // Find the highest session ID from existing directories
    let maxId = 0;
    
    directories.forEach(prefix => {
      // Match session_X pattern in directory names
      // The prefix will be something like "transcripts/session_1/"
      const pathParts = prefix.Prefix.split('/');
      const folderName = pathParts[pathParts.length - 2]; // Get the second to last part (folder name)
      
      const match = folderName?.match(/session_(\d+)/);
      if (match && match[1]) {
        const id = parseInt(match[1], 10);
        if (id > maxId) {
          maxId = id;
        }
      }
    });
    
    // Return next available ID
    return maxId + 1;
  } catch (error) {
    logger.error('Error determining next session ID from S3:', error);
    // Default to 1 if there's an error
    return 1;
  }
}

/**
 * Upload a file to S3
 * @param {string} key - S3 object key
 * @param {Buffer|string} body - File content
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} - S3 URL
 */
async function uploadToS3(key, body, contentType) {
  const command = new PutObjectCommand({
    Bucket: config.aws.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType
  });
  
  await s3Client.send(command);
  
  // Return the S3 URL
  return `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
}

/**
 * Save audio transcript and related data to S3
 */
export async function saveAudioTranscript(req, res, next) {
  try {
    logger.info('Processing audio transcript save request');
    const { audio, metadata, functionCalls } = req.body;
    
    if (!audio || !audio.data) {
      logger.warn('Missing audio data in request');
      throw new ApiError('Missing audio data', 400);
    }
    
    // Get the next available session ID
    const sessionId = await getNextSessionId();
    const sessionFolderName = `session_${sessionId}`;
    const sessionFolderPath = `${S3_TRANSCRIPT_PREFIX}${sessionFolderName}/`;
    
    // Determine file extension based on MIME type
    const fileExt = audio.mimeType.includes('wav') ? 'wav' : 'webm';
    const contentType = audio.mimeType || (fileExt === 'wav' ? 'audio/wav' : 'audio/webm');
    
    // Create file keys for S3
    const audioFileKey = `${sessionFolderPath}audio.${fileExt}`;
    const metadataFileKey = `${sessionFolderPath}metadata.json`;
    const functionCallsFileKey = `${sessionFolderPath}function_calls.json`;
    
    // Decode base64 audio data
    const audioBuffer = Buffer.from(audio.data, 'base64');
    
    // Upload files to S3
    const audioUrl = await uploadToS3(audioFileKey, audioBuffer, contentType);
    const metadataUrl = await uploadToS3(
      metadataFileKey, 
      JSON.stringify(metadata || {}, null, 2), 
      'application/json'
    );
    const functionCallsUrl = await uploadToS3(
      functionCallsFileKey, 
      JSON.stringify(functionCalls || {}, null, 2), 
      'application/json'
    );
    
    logger.info(`Audio transcript saved successfully to S3 with session ID: ${sessionId}`);
    
    // Return success response with session ID and S3 URLs
    res.status(200).json({
      success: true,
      sessionId,
      sessionFolder: sessionFolderName,
      s3Bucket: config.aws.bucketName,
      s3Prefix: sessionFolderPath,
      files: {
        audio: audioUrl,
        metadata: metadataUrl,
        functionCalls: functionCallsUrl
      }
    });
  } catch (error) {
    logger.error('Error saving audio transcript to S3:', error);
    next(error);
  }
} 