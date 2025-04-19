/**
 * Calendar routes
 * Defines all endpoints related to Google Calendar functionality
 */
import express from 'express';
import { 
  createEvent, 
  updateEvent, 
  deleteEvent,
  getUserEvents
} from '../controllers/calendarController.js';

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
router.post('/events', createEvent);

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
router.put('/events/:eventId', updateEvent);

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
router.delete('/events/:eventId', deleteEvent);

/**
 * @api {get} /calendar/users/:userId/events Get all events for a user
 * @apiName GetUserEvents
 * @apiGroup Calendar
 * 
 * @apiParam {String} userId The ID of the user
 * 
 * @apiSuccess {Array} events List of calendar events for the user
 * 
 * @apiError {Object} error Error message
 */
router.get('/users/:userId/events', getUserEvents);

export default router;