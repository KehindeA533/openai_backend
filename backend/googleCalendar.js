// Google Calendar Express Routes
import express from 'express';
import { 
  createGoogleCalendarEvent, 
  updateGoogleCalendarEvent, 
  deleteGoogleCalendarEvent 
} from './googleCalendarAPI.js';
import eventStore from './eventStore.js';

const router = express.Router();

/**
 * @api {post} /calendar/events Create a new calendar event
 * @apiName CreateCalendarEvent
 * @apiGroup Calendar
 * 
 * @apiBody {String} userId User identifier
 * @apiBody {String} date Date in YYYY-MM-DD format
 * @apiBody {String} time Time in HH:MM format (24-hour)
 * @apiBody {Number} partySize Number of people in the reservation
 * @apiBody {String} email Contact email
 * @apiBody {String} restaurantName Name of the restaurant
 * @apiBody {String} restaurantAddress Address of the restaurant
 * @apiBody {String} name Name of the person making the reservation
 * 
 * @apiSuccess {Object} event Created calendar event object
 * 
 * @apiError {Object} error Error message
 */
router.post('/events', async (req, res) => {
  try {
    // Extract required parameters from request body
    const { 
      userId, 
      date, 
      time, 
      partySize, 
      email, 
      restaurantName, 
      restaurantAddress, 
      name 
    } = req.body;

    // Validate required fields
    if (!userId || !date || !time || !partySize || !email || !restaurantName || !restaurantAddress || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['userId', 'date', 'time', 'partySize', 'email', 'restaurantName', 'restaurantAddress', 'name']
      });
    }

    // Create the calendar event
    const createdEvent = await createGoogleCalendarEvent(
      date, time, partySize, email, restaurantName, restaurantAddress, name
    );
    
    if (createdEvent && createdEvent.id) {
      // Store the event ID for later use
      eventStore.saveEvent(userId, createdEvent.id, { 
        date, time, partySize, email, restaurantName, restaurantAddress, name 
      });
      
      return res.status(201).json(createdEvent);
    } else {
      return res.status(500).json({ error: 'Failed to create event' });
    }
  } catch (error) {
    console.error('Calendar event creation failed:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @api {put} /calendar/events/:eventId Update a calendar event
 * @apiName UpdateCalendarEvent
 * @apiGroup Calendar
 * 
 * @apiParam {String} eventId The ID of the event to update
 * 
 * @apiBody {String} userId User identifier
 * @apiBody {String} [date] Date in YYYY-MM-DD format
 * @apiBody {String} [time] Time in HH:MM format (24-hour)
 * @apiBody {Number} [partySize] Number of people in the reservation
 * @apiBody {String} [email] Contact email
 * @apiBody {String} [restaurantName] Name of the restaurant
 * @apiBody {String} [restaurantAddress] Address of the restaurant
 * @apiBody {String} [name] Name of the person making the reservation
 * 
 * @apiSuccess {Object} event Updated calendar event object
 * 
 * @apiError {Object} error Error message
 */
router.put('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId, ...updates } = req.body;

    // Validate required fields
    if (!userId || !eventId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['userId', 'eventId in URL parameter']
      });
    }

    // Get existing event data
    const eventData = eventStore.getEvent(userId, eventId);
    if (!eventData) {
      return res.status(404).json({ error: 'Event not found in store' });
    }
    
    // Update the event
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
    
    return res.status(200).json(updatedEvent);
  } catch (error) {
    console.error('Calendar event update failed:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @api {delete} /calendar/events/:eventId Delete a calendar event
 * @apiName DeleteCalendarEvent
 * @apiGroup Calendar
 * 
 * @apiParam {String} eventId The ID of the event to delete
 * 
 * @apiBody {String} userId User identifier
 * 
 * @apiSuccess {Object} result Success message with eventId
 * 
 * @apiError {Object} error Error message
 */
router.delete('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.body;

    // Validate required fields
    if (!userId || !eventId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['userId', 'eventId in URL parameter']
      });
    }

    // Get existing event data
    const eventData = eventStore.getEvent(userId, eventId);
    if (!eventData) {
      return res.status(404).json({ error: 'Event not found in store' });
    }
    
    // Delete the event from Google Calendar
    const result = await deleteGoogleCalendarEvent(eventId);
    
    // Remove the event from our store
    eventStore.removeEvent(userId, eventId);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Calendar event deletion failed:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router; 