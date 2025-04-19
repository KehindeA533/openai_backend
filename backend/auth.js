// Example auth script (save as auth.js)
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import http from 'http';
import open from 'open'; // You may need to install this package
import path from 'path';
import { fileURLToPath } from 'url';
import url from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Same constants as in your main file with correct paths
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const PORT = 3000; // Changed back to 3000 to match authorized origins in Google Cloud Console

// Run the OAuth2 flow and save the token
async function getAccessToken() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret } = credentials.web;
  
  // Use localhost with our port as the redirect URI
  const redirectUri = `http://localhost:${PORT}`;
  console.log(`Using redirect URI: ${redirectUri}`);
  
  const oAuth2Client = new OAuth2Client(
    client_id,
    client_secret,
    redirectUri
  );
  
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force to always get refresh token
  });
  
  console.log('Authorize this app by visiting this url:', authUrl);
  await open(authUrl); // Opens the URL in default browser
  
  // Create a simple HTTP server to handle the redirect
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      console.log('Received request:', req.url);
      
      if (!req.url || !req.url.includes('code=')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('No authorization code found. Please try again.');
        return;
      }
      
      // Extract the authorization code from the URL
      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      const code = parsedUrl.searchParams.get('code');
      console.log(`Received code: ${code}`);
      
      try {
        // Exchange code for tokens
        const { tokens } = await oAuth2Client.getToken(code);
        console.log('Received tokens successfully');
        oAuth2Client.setCredentials(tokens);
        
        // Save tokens to file
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('Token stored to', TOKEN_PATH);
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authentication successful!</h1><p>You can close this window.</p>');
        
        server.close(() => {
          console.log('Server closed');
          resolve(tokens);
        });
      } catch (error) {
        console.error('Error retrieving access token:', error);
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Authentication failed</h1><p>Please check the console for more info.</p>');
        
        server.close(() => {
          console.log('Server closed');
          reject(error);
        });
      }
    }).listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  });
}

// Main function to run the authentication flow
async function main() {
  try {
    await getAccessToken();
    console.log('Authentication completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Authentication failed:', error);
    process.exit(1);
  }
}

main();