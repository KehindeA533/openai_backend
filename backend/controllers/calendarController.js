/**
 * Calendar controller to handle calendar-related HTTP requests
 */
import { 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from '../services/calendarService.js';
import eventStore from '../services/eventStore.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Validate required fields for event creation
 */
function validateEventFields(fields, required) {
  const missing = required.filter(field => !fields[field]);
  if (missing.length > 0) {
    throw new ApiError(`Missing required fields: ${missing.join(', ')}`, 400);
  }
}

/**
 * Create a new calendar event
 */
export async function createEvent(req, res, next) {
  try {
    // Extract required parameters from request body
    const { 
      date, 
      time, 
      partySize, 
      email, 
      restaurantName, 
      restaurantAddress, 
      name 
    } = req.body;

    // Validate required fields
    validateEventFields(
      req.body, 
      ['date', 'time', 'partySize', 'email', 'restaurantName', 'restaurantAddress', 'name']
    );

    // Create the calendar event
    const createdEvent = await createCalendarEvent(
      date, time, partySize, email, restaurantName, restaurantAddress, name
    );
    
    if (createdEvent && createdEvent.id) {
      // Store the event ID for later use
      eventStore.saveEvent(createdEvent.id, { 
        date, time, partySize, email, restaurantName, restaurantAddress, name 
      });
      
      logger.info('Calendar event created successfully', { eventId: createdEvent.id });
      return res.status(201).json(createdEvent);
    } else {
      throw new ApiError('Failed to create event', 500);
    }
  } catch (error) {
    logger.error('Calendar event creation failed', { error: error.message });
    next(error);
  }
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(req, res, next) {
  try {
    const { eventId } = req.params;
    const { ...updates } = req.body;

    // Validate required fields
    validateEventFields(
      { eventId }, 
      ['eventId']
    );

    // Get existing event data
    const eventData = eventStore.getEvent(eventId);
    if (!eventData) {
      throw new ApiError('Event not found', 404);
    }
    
    // Update the event
    const updatedEvent = await updateCalendarEvent(
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
    eventStore.saveEvent(eventId, {
      ...eventData,
      ...updates
    });
    
    logger.info('Calendar event updated successfully', { eventId });
    return res.status(200).json(updatedEvent);
  } catch (error) {
    logger.error('Calendar event update failed', { error: error.message });
    next(error);
  }
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(req, res, next) {
  try {
    const { eventId } = req.params;

    // Validate required fields
    validateEventFields(
      { eventId }, 
      ['eventId']
    );

    // Get existing event data
    const eventData = eventStore.getEvent(eventId);
    if (!eventData) {
      throw new ApiError('Event not found', 404);
    }
    
    // Delete the event from Google Calendar
    const result = await deleteCalendarEvent(eventId);
    
    // Remove the event from our store
    eventStore.removeEvent(eventId);
    
    logger.info('Calendar event deleted successfully', { eventId });
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Calendar event deletion failed', { error: error.message });
    next(error);
  }
}

/**
 * Get all calendar events
 */
export async function getAllEvents(req, res, next) {
  try {
    const events = eventStore.getAllEvents();
    return res.status(200).json(events);
  } catch (error) {
    logger.error('Failed to get events', { error: error.message });
    next(error);
  }
}