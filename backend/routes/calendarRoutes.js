/**
 * Calendar routes
 * Defines all endpoints related to Google Calendar functionality
 */
import express from 'express';
import { 
  createEvent, 
  updateEvent, 
  deleteEvent,
  getAllEvents,
  getMonthlyEvents
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
 * @api {put} /calendar/events/:name Update a calendar event
 * @apiName UpdateCalendarEvent
 * @apiGroup Calendar
 * 
 * @apiParam {String} name The name of the person who made the reservation
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
router.put('/events/:name', updateEvent);

/**
 * @api {delete} /calendar/events/:name Delete a calendar event
 * @apiName DeleteCalendarEvent
 * @apiGroup Calendar
 * 
 * @apiParam {String} name The name of the person who made the reservation
 * 
 * @apiSuccess {Object} result Success message with eventId
 * 
 * @apiError {Object} error Error message
 */
router.delete('/events/:name', deleteEvent);

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

/**
 * @api {get} /calendar/events/monthly Get events for previous, current and next month
 * @apiName GetMonthlyEvents
 * @apiGroup Calendar
 * 
 * @apiSuccess {Object} events Object containing events for previous, current and next month
 * @apiSuccess {Array} events.previousMonth Events from the previous month
 * @apiSuccess {Array} events.currentMonth Events from the current month
 * @apiSuccess {Array} events.nextMonth Events from the next month
 * 
 * @apiError {Object} error Error message
 */
router.get('/events/monthly', getMonthlyEvents);

export default router;