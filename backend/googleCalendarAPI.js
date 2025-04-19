// Interact with Google Calendar API
import { google } from "googleapis";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path constants
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

/**
 * Reads previously authorized credentials from the save file.
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = fs.readFileSync(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Load or request authorization to call APIs.
 */
export async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret } = credentials.web;
  
  // Use the first javascript_origin as the redirect URI base
  const redirectUri = credentials.web.javascript_origins 
    ? `${credentials.web.javascript_origins[0]}`
    : 'http://localhost:3000';
  
  // For web applications, we need to manually handle the OAuth flow
  const oAuth2Client = new OAuth2Client(
    client_id,
    client_secret,
    redirectUri
  );
  
  // Read token from token.json if it exists
  try {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  } catch (err) {
    console.error('Unable to load token, authentication required:', err);
    throw new Error('Authentication required. Please run the auth script first.');
  }
}

/**
 * Creates a Google Calendar event
 */
export async function createGoogleCalendarEvent(date, time, partySize, email, restaurantName, restaurantAddress, name) {
  try {
    const auth = await authorize();
    const calendar = google.calendar({ version: 'v3', auth });

    // Create start and end times in the correct timezone
    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1-hour reservation

    // Convert start time to human-readable format in 'America/New_York'
    const readableTime = startDateTime.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const event = {
      summary: `Reservation for ${name}`,
      location: `${restaurantName}, ${restaurantAddress}`,
      description: `Reservation confirmed for ${name} on ${readableTime} for ${partySize} people. We look forward to serving you!`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
      attendees: [{ email }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 }, // 24 hours before
          { method: 'popup', minutes: 30 },   // 30 minutes before
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    console.log(`Event created: ${response.data.htmlLink}`);
    return response.data;
  } catch (error) {
    console.error('Error creating calendar event:', error.message);
    throw error;
  }
}

/**
 * Updates an existing Google Calendar event
 */
export async function updateGoogleCalendarEvent(eventId, date, time, partySize, email, restaurantName, restaurantAddress, name) {
  try {
    const auth = await authorize();
    const calendar = google.calendar({ version: 'v3', auth });

    // Create start and end times in the correct timezone
    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1-hour reservation

    // Convert start time to human-readable format in 'America/New_York'
    const readableTime = startDateTime.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const event = {
      summary: `Reservation for ${name}`,
      location: `${restaurantName}, ${restaurantAddress}`,
      description: `Reservation updated for ${name} on ${readableTime} for ${partySize} people. We look forward to serving you!`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
      attendees: [{ email }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 }, // 24 hours before
          { method: 'popup', minutes: 30 },   // 30 minutes before
        ],
      },
    };

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: event,
    });

    console.log(`Event updated: ${response.data.htmlLink}`);
    return response.data;
  } catch (error) {
    console.error('Error updating calendar event:', error.message);
    throw error;
  }
}

/**
 * Deletes a Google Calendar event
 */
export async function deleteGoogleCalendarEvent(eventId) {
  try {
    const auth = await authorize();
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });

    console.log(`Event deleted: ${eventId}`);
    return { success: true, eventId };
  } catch (error) {
    console.error('Error deleting calendar event:', error.message);
    throw error;
  }
} 