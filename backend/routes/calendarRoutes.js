/**
 * Calendar routes
 * Defines all endpoints related to Google Calendar functionality
 */
import express from 'express';
import { 
  createEvent, 
  updateEvent, 
  deleteEvent,
  getAllEvents
} from '../controllers/calendarController.js';

const router = express.Router();

/**
 * @api {post} /calendar/events Create a new calendar event
 * @apiName CreateCalendarEvent
 * @apiGroup Calendar
 * 
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
 * @apiSuccess {Object} result Success message with eventId
 * 
 * @apiError {Object} error Error message
 */
router.delete('/events/:eventId', deleteEvent);

/**
 * @api {get} /calendar/events Get all calendar events
 * @apiName GetAllEvents
 * @apiGroup Calendar
 * 
 * @apiSuccess {Array} events List of all calendar events
 * 
 * @apiError {Object} error Error message
 */
router.get('/events', getAllEvents);

export default router;