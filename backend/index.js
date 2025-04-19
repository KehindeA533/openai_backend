// Import event store functionality
import eventStore from './eventStore.js';
import { 
  createGoogleCalendarEvent, 
  updateGoogleCalendarEvent, 
  deleteGoogleCalendarEvent 
} from './googleCalendarAPI.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

/**
 * Creates a calendar event and stores it in the event store
 */
export async function handleCalendarEventCreation(userId, date, time, partySize, email, restaurantName, restaurantAddress, name) {
  try {
    const createdEvent = await createGoogleCalendarEvent(
      date, time, partySize, email, restaurantName, restaurantAddress, name
    );
    
    if (createdEvent && createdEvent.id) {
      // Store the event ID for later use
      eventStore.saveEvent(userId, createdEvent.id, { 
        date, time, partySize, email, restaurantName, restaurantAddress, name 
      });
      return createdEvent;
    }
  } catch (error) {
    console.error('Calendar event creation failed:', error);
    throw error;
  }
}

/**
 * Updates a calendar event using the stored event ID
 */
export async function handleCalendarEventUpdate(userId, eventId, updates) {
  try {
    const eventData = eventStore.getEvent(userId, eventId);
    if (!eventData) {
      throw new Error('Event not found in store');
    }
    
    const updatedEvent = await updateGoogleCalendarEvent(
      eventId,
      updates.date || eventData.date,
      updates.time || eventData.time,
      updates.partySize || eventData.partySize,
      updates.email || eventData.email,
      updates.restaurantName || eventData.restaurantName,
      updates.restaurantAddress || eventData.restaurantAddress,
      updates.name || eventData.name
    );
    
    // Update the stored event data
    eventStore.saveEvent(userId, eventId, {
      ...eventData,
      ...updates
    });
    
    return updatedEvent;
  } catch (error) {
    console.error('Calendar event update failed:', error);
    throw error;
  }
}

/**
 * Deletes a calendar event using the stored event ID
 */
export async function handleCalendarEventDeletion(userId, eventId) {
  try {
    const eventData = eventStore.getEvent(userId, eventId);
    if (!eventData) {
      throw new Error('Event not found in store');
    }
    
    // Delete the event from Google Calendar
    const result = await deleteGoogleCalendarEvent(eventId);
    
    // Remove the event from our store
    eventStore.removeEvent(userId, eventId);
    
    return result;
  } catch (error) {
    console.error('Calendar event deletion failed:', error);
    throw error;
  }
}

// Export the Google Calendar API functions for direct use if needed
export { 
  createGoogleCalendarEvent, 
  updateGoogleCalendarEvent, 
  deleteGoogleCalendarEvent,
  testCalendarEndpoints
};

// Test Calendar API Endpoints
async function testCalendarEndpoints() {
  try {
    const BASE_URL = 'http://localhost:3000'; // Server is running on port 3000
    const userId = 'test_user_' + Date.now(); // Generate unique user ID for testing
    const API_KEY = process.env.API_KEYS?.split(',')[0]; // Get the first API key from env
    
    if (!API_KEY) {
      console.error('❌ No API key found in environment variables (API_KEYS)');
      return;
    }
    
    console.log('⏳ Testing Calendar API Endpoints...\n');
    
    // 1. Create a calendar event
    console.log('1️⃣ Testing CREATE event endpoint:');
    const createResponse = await fetch(`${BASE_URL}/calendar/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        userId,
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
    console.log(`Response status: ${createResponse.status}`);
    
    if (createResponse.ok) {
      console.log('✅ Successfully created event');
      console.log(`Event ID: ${createResult.id}`);
      
      const eventId = createResult.id;
      
      // 2. Update the calendar event
      console.log('\n2️⃣ Testing UPDATE event endpoint:');
      const updateResponse = await fetch(`${BASE_URL}/calendar/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          userId,
          date: '2025-06-02', // Changed date
          partySize: 6,       // Changed party size
        })
      });
      
      // Parse response
      const updateResult = await updateResponse.json();
      console.log(`Response status: ${updateResponse.status}`);
      
      if (updateResponse.ok) {
        console.log('✅ Successfully updated event');
        
        // 3. Delete the calendar event
        console.log('\n3️⃣ Testing DELETE event endpoint:');
        const deleteResponse = await fetch(`${BASE_URL}/calendar/events/${eventId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
          },
          body: JSON.stringify({
            userId,
          })
        });
        
        // Parse response
        const deleteResult = await deleteResponse.json();
        console.log(`Response status: ${deleteResponse.status}`);
        
        if (deleteResponse.ok) {
          console.log('✅ Successfully deleted event');
        } else {
          console.error('❌ Failed to delete event:', deleteResult.error);
        }
      } else {
        console.error('❌ Failed to update event:', updateResult.error);
      }
    } else {
      console.error('❌ Failed to create event:', createResult.error);
    }
    
    console.log('\n✨ Calendar API endpoint testing completed');
  } catch (error) {
    console.error('❌ Error testing calendar endpoints:', error.message);
  }
}

// Run the test function if this module is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Running calendar endpoint tests...');
  testCalendarEndpoints().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}