/**
 * Environment variable configuration and validation
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name for proper path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

// Required environment variables
const requiredEnvVars = [
  'API_KEYS',
  'OPENAI_API_KEY'
];

// Check for missing required environment variables
const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

// Environment configuration object
const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  frontendPort: process.env.F_LOCAL_HOST_PORT || 3001,
  environment: process.env.NODE_ENV || 'development',
  
  // API configurations
  apiKeys: process.env.API_KEYS,
  openAIKey: process.env.OPENAI_API_KEY,
  weatherApiKey: process.env.WEATHER_API_KEY,
  
  // CORS configuration
  corsOptions: {
    allowedOrigins: 
      process.env.NODE_ENV === 'production'
        ? ['https://ai-voice-agent-v0-1.vercel.app']
        : [`http://localhost:${process.env.F_LOCAL_HOST_PORT || 3001}`]
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: process.env.RATE_LIMIT_MAX || 5
  },
  
  // File paths
  paths: {
    credentials: path.resolve(__dirname, '..', 'credentials.json'),
    token: path.resolve(__dirname, '..', 'token.json')
  }
};

export default config;