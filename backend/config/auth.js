/**
 * Google OAuth authentication script for Calendar API
 * This script is run separately to generate the token.json file
 */
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import http from 'http';
import open from 'open'; // You'll need to install this package: npm install open
import path from 'path';
import { fileURLToPath } from 'url';
import config from './env.js';
import logger from '../utils/logger.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants for Google API authentication
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const PORT = 3000; // Use port 3000 for the local redirect server

/**
 * Run the OAuth2 flow and save the token
 */
async function getAccessToken() {
  try {
    logger.info('Starting Google OAuth authentication process');
    
    // Read credentials file
    const credentials = JSON.parse(fs.readFileSync(config.paths.credentials));
    const { client_id, client_secret } = credentials.web;
    
    // Use localhost with our port as the redirect URI
    const redirectUri = `http://localhost:${PORT}`;
    logger.info(`Using redirect URI: ${redirectUri}`);
    
    // Create OAuth client
    const oAuth2Client = new OAuth2Client(
      client_id,
      client_secret,
      redirectUri
    );
    
    // Generate auth URL
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force to always get refresh token
    });
    
    // Output auth URL and open browser
    logger.info('Authorize this app by visiting this url:', authUrl);
    await open(authUrl);
    
    // Create a simple HTTP server to handle the redirect
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        logger.debug('Received request:', req.url);
        
        if (!req.url || !req.url.includes('code=')) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>No authorization code found</h1><p>Please try again.</p>');
          return;
        }
        
        try {
          // Extract the authorization code from the URL
          const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
          const code = parsedUrl.searchParams.get('code');
          logger.info('Authorization code received');
          
          // Exchange code for tokens
          const { tokens } = await oAuth2Client.getToken(code);
          logger.info('Access token obtained successfully');
          
          // Save tokens to file
          fs.writeFileSync(config.paths.token, JSON.stringify(tokens));
          logger.info('Token stored to', config.paths.token);
          
          // Respond to the browser
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <h1>Authentication successful!</h1>
            <p>You have successfully authenticated your application with Google Calendar.</p>
            <p>You can close this window now.</p>
          `);
          
          // Close the server and resolve the promise
          server.close(() => {
            logger.info('Local server closed');
            resolve(tokens);
          });
        } catch (error) {
          logger.error('Error retrieving access token:', error.message);
          
          // Respond with error
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <h1>Authentication failed</h1>
            <p>Error: ${error.message}</p>
            <p>Please check the console for more information.</p>
          `);
          
          // Close the server and reject the promise
          server.close(() => {
            logger.info('Local server closed');
            reject(error);
          });
        }
      }).listen(PORT, () => {
        logger.info(`Local server listening on port ${PORT}`);
      });
      
      // Handle server errors
      server.on('error', (err) => {
        logger.error('Server error:', err.message);
        reject(err);
      });
    });
  } catch (error) {
    logger.error('Authentication setup failed:', error.message);
    throw error;
  }
}

/**
 * Main function to run the authentication flow
 */
async function main() {
  try {
    logger.info('Starting Google Calendar authentication');
    await getAccessToken();
    logger.info('Authentication completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Authentication failed:', error.message);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { getAccessToken };