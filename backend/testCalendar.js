/**
 * Test script for Calendar API endpoints
 * Can be run directly to verify calendar functionality
 */
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import config from './config/env.js';
import logger from './utils/logger.js';

/**
 * Test all calendar API endpoints
 */
async function testCalendarEndpoints() {
  try {
    // Use the configured port or default to 3000
    const BASE_URL = `http://localhost:${config.port}`;
    const API_KEY = config.apiKeys[0]; // Get the first API key from config
    
    if (!API_KEY) {
      logger.error('No API key found in configuration');
      return;
    }
    
    logger.info('Testing Calendar API Endpoints...');
    
    // 1. Create a calendar event
    logger.info('1. Testing CREATE event endpoint:');
    const createResponse = await fetch(`${BASE_URL}/calendar/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        date: '2025-06-01',
        time: '19:00',
        partySize: 4,
        email: 'test@example.com',
        restaurantName: 'Test Restaurant',
        restaurantAddress: '123 Test Street, Anytown, USA',
        name: 'Test User'
      })
    });
    
    // Parse response
    const createResult = await createResponse.json();
    logger.info(`Response status: ${createResponse.status}`);
    
    if (createResponse.ok) {
      logger.info('Successfully created event');
      logger.info(`Event ID: ${createResult.id}`);
      
      const eventId = createResult.id;
      
      // 2. Update the calendar event
      logger.info('2. Testing UPDATE event endpoint:');
      const updateResponse = await fetch(`${BASE_URL}/calendar/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          date: '2025-06-02', // Changed date
          partySize: 6,       // Changed party size
        })
      });
      
      // Parse response
      const updateResult = await updateResponse.json();
      logger.info(`Response status: ${updateResponse.status}`);
      
      if (updateResponse.ok) {
        logger.info('Successfully updated event');
        
        // 3. Get all events
        logger.info('3. Testing GET all events endpoint:');
        const getEventsResponse = await fetch(`${BASE_URL}/calendar/events`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
          }
        });
        
        // Parse response
        const getEventsResult = await getEventsResponse.json();
        logger.info(`Response status: ${getEventsResponse.status}`);
        
        if (getEventsResponse.ok) {
          logger.info(`Found ${getEventsResult.length} events`);
          
          // 4. Delete the calendar event
          logger.info('4. Testing DELETE event endpoint:');
          const deleteResponse = await fetch(`${BASE_URL}/calendar/events/${eventId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': API_KEY,
            }
          });
          
          // Parse response
          const deleteResult = await deleteResponse.json();
          logger.info(`Response status: ${deleteResponse.status}`);
          
          if (deleteResponse.ok) {
            logger.info('Successfully deleted event');
          } else {
            logger.error('Failed to delete event:', deleteResult.error);
          }
        } else {
          logger.error('Failed to get events:', getEventsResult.error);
        }
      } else {
        logger.error('Failed to update event:', updateResult.error);
      }
    } else {
      logger.error('Failed to create event:', createResult.error);
    }
    
    logger.info('Calendar API endpoint testing completed');
    return true;
  } catch (error) {
    logger.error('Error testing calendar endpoints:', error.message);
    throw error;
  }
}

// Run the test function if this module is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  logger.info('Running calendar endpoint tests...');
  testCalendarEndpoints().catch(error => {
    logger.error('Test failed:', error);
    process.exit(1);
  });
}

export default testCalendarEndpoints;