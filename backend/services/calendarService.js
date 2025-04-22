/**
 * Calendar service handling Google Calendar operations
 */
import { google } from 'googleapis';
import fs from 'fs';
import { OAuth2Client } from 'google-auth-library';
import config from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Gets Google API credentials from environment variable or file
 */
function getCredentials() {
  // First try to get from environment variable
  if (process.env.GOOGLE_CREDENTIALS) {
    return JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } 
  // Fall back to file system for local development
  return JSON.parse(fs.readFileSync(config.paths.credentials));
}

/**
 * Reads previously authorized credentials from the token file or environment
 */
async function loadSavedCredentials() {
  try {
    // First try environment variable
    if (process.env.GOOGLE_TOKEN) {
      const credentials = JSON.parse(process.env.GOOGLE_TOKEN);
      return google.auth.fromJSON(credentials);
    }
    
    // Fall back to file
    const content = fs.readFileSync(config.paths.token);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    logger.error('Failed to load saved credentials', { error: err.message });
    return null;
  }
}

/**
 * Authorize with Google Calendar API
 */
export async function authorize() {
  // Try to load existing credentials first
  let client = await loadSavedCredentials();
  if (client) {
    return client;
  }
  
  // If no credentials exist, set up new ones
  try {
    const credentials = getCredentials();
    const { client_id, client_secret } = credentials.web;
    
    // Use the first javascript_origin as the redirect URI base
    const redirectUri = credentials.web.javascript_origins 
      ? `${credentials.web.javascript_origins[0]}`
      : 'http://localhost:3000';
    
    // Set up OAuth2 client
    const oAuth2Client = new OAuth2Client(
      client_id,
      client_secret,
      redirectUri
    );
    
    // Read token from token.json if it exists
    try {
      // Try environment variable first for token
      if (process.env.GOOGLE_TOKEN) {
        const token = JSON.parse(process.env.GOOGLE_TOKEN);
        oAuth2Client.setCredentials(token);
        return oAuth2Client;
      }
      
      // Fall back to file
      const token = JSON.parse(fs.readFileSync(config.paths.token));
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    } catch (err) {
      logger.error('Authentication required', { error: err.message });
      throw new Error('Authentication required. Please run the auth script first.');
    }
  } catch (error) {
    logger.error('Failed to authorize with Google', { error: error.message });
    throw error;
  }
}

/**
 * Create a human-readable time string
 */
function formatReadableTime(dateTime) {
  return dateTime.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Prepare a calendar event resource object
 */
function prepareEventResource(date, time, partySize, email, restaurantName, restaurantAddress, name) {
  // Create start and end times
  const startDateTime = new Date(`${date}T${time}`);
  console.log('startDateTime', startDateTime);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1-hour reservation
  
  // Format readable time
  const readableTime = formatReadableTime(startDateTime);
  console.log('readableTime', readableTime);
  return {
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
}

/**
 * Creates a Google Calendar event
 */
export async function createCalendarEvent(date, time, partySize, email, restaurantName, restaurantAddress, name) {
  try {
    const auth = await authorize();
    const calendar = google.calendar({ version: 'v3', auth });
    
    const event = prepareEventResource(
      date, time, partySize, email, restaurantName, restaurantAddress, name
    );
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    
    logger.info('Calendar event created', { eventId: response.data.id });
    return response.data;
  } catch (error) {
    logger.error('Failed to create calendar event', { error: error.message });
    throw error;
  }
}

/**
 * Updates an existing Google Calendar event
 */
export async function updateCalendarEvent(eventId, date, time, partySize, email, restaurantName, restaurantAddress, name) {
  try {
    const auth = await authorize();
    const calendar = google.calendar({ version: 'v3', auth });
    
    const event = prepareEventResource(
      date, time, partySize, email, restaurantName, restaurantAddress, name
    );

    // Update the event description to indicate it's an update
    event.description = event.description.replace('Reservation confirmed', 'Reservation updated');
    
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: event,
    });
    
    logger.info('Calendar event updated', { eventId });
    return response.data;
  } catch (error) {
    logger.error('Failed to update calendar event', { error: error.message, eventId });
    throw error;
  }
}

/**
 * Deletes a Google Calendar event
 */
export async function deleteCalendarEvent(eventId) {
  try {
    const auth = await authorize();
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    
    logger.info('Calendar event deleted', { eventId });
    return { success: true, eventId };
  } catch (error) {
    logger.error('Failed to delete calendar event', { error: error.message, eventId });
    throw error;
  }
}