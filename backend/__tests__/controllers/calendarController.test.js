import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEvent, updateEvent, deleteEvent, getAllEvents } from '../../controllers/calendarController.js';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../../services/calendarService.js';
import eventStore from '../../services/eventStore.js';
import { ApiError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

// Mocking external dependencies
vi.mock('../../services/calendarService.js', () => ({
  createCalendarEvent: vi.fn(),
  updateCalendarEvent: vi.fn(),
  deleteCalendarEvent: vi.fn()
}));

vi.mock('../../services/eventStore.js', () => ({
  default: {
    saveEvent: vi.fn(),
    getEvent: vi.fn(),
    getEventByName: vi.fn(),
    getEventIdByName: vi.fn(),
    removeEvent: vi.fn(),
    removeEventByName: vi.fn(),
    getAllEvents: vi.fn()
  }
}));

vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('Calendar Controller', () => {
  // Mock request and response objects
  let req;
  let res;
  let next;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();

    // Setup request, response, and next function mocks
    req = {
      body: {},
      params: {}
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    next = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createEvent', () => {
    const validEventData = {
      date: '2023-12-25',
      time: '18:00',
      partySize: 4,
      email: 'user@example.com',
      restaurantName: 'Test Restaurant',
      restaurantAddress: '123 Test St',
      name: 'Dinner Reservation'
    };

    it('should create a calendar event successfully', async () => {
      // Arrange
      req.body = validEventData;
      const mockEventId = 'event123';
      createCalendarEvent.mockResolvedValue({ id: mockEventId, ...validEventData });

      // Act
      await createEvent(req, res, next);

      // Assert
      expect(createCalendarEvent).toHaveBeenCalledWith(
        validEventData.date,
        validEventData.time,
        validEventData.partySize,
        validEventData.email,
        validEventData.restaurantName,
        validEventData.restaurantAddress,
        validEventData.name
      );
      expect(eventStore.saveEvent).toHaveBeenCalledWith(
        mockEventId,
        expect.objectContaining({
          date: validEventData.date,
          time: validEventData.time,
          partySize: validEventData.partySize,
          email: validEventData.email,
          restaurantName: validEventData.restaurantName,
          restaurantAddress: validEventData.restaurantAddress,
          name: validEventData.name
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: mockEventId }));
      expect(logger.info).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      req.body = { ...validEventData, date: undefined };

      // Act
      await createEvent(req, res, next);

      // Assert
      expect(createCalendarEvent).not.toHaveBeenCalled();
      expect(eventStore.saveEvent).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return 500 when calendar service fails', async () => {
      // Arrange
      req.body = validEventData;
      createCalendarEvent.mockResolvedValue(null);

      // Act
      await createEvent(req, res, next);

      // Assert
      expect(createCalendarEvent).toHaveBeenCalled();
      expect(eventStore.saveEvent).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle service exceptions properly', async () => {
      // Arrange
      req.body = validEventData;
      const error = new Error('Service failure');
      createCalendarEvent.mockRejectedValue(error);

      // Act
      await createEvent(req, res, next);

      // Assert
      expect(createCalendarEvent).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateEvent', () => {
    const eventId = 'event123';
    const name = 'Dinner Reservation';
    const existingEvent = {
      eventId: eventId,
      date: '2023-12-25',
      time: '18:00',
      partySize: 4,
      email: 'user@example.com',
      restaurantName: 'Test Restaurant',
      restaurantAddress: '123 Test St',
      name: name
    };
    const updates = {
      time: '19:00',
      partySize: 6
    };

    it('should update a calendar event successfully using name', async () => {
      // Arrange
      req.params = { name };
      req.body = { ...updates };
      eventStore.getEventByName.mockReturnValue(existingEvent);
      updateCalendarEvent.mockResolvedValue({ id: eventId, ...existingEvent, ...updates });

      // Act
      await updateEvent(req, res, next);

      // Assert
      expect(eventStore.getEventByName).toHaveBeenCalledWith(name);
      expect(updateCalendarEvent).toHaveBeenCalledWith(
        eventId,
        existingEvent.date,
        updates.time,
        updates.partySize,
        existingEvent.email,
        existingEvent.restaurantName,
        existingEvent.restaurantAddress,
        existingEvent.name
      );
      expect(eventStore.saveEvent).toHaveBeenCalledWith(
        eventId,
        expect.objectContaining({
          ...existingEvent,
          ...updates
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it('should update with a new name successfully', async () => {
      // Arrange
      const newName = 'Updated Reservation';
      req.params = { name };
      req.body = { ...updates, name: newName };
      eventStore.getEventByName.mockReturnValue(existingEvent);
      updateCalendarEvent.mockResolvedValue({ 
        id: eventId, 
        ...existingEvent, 
        ...updates, 
        name: newName 
      });

      // Act
      await updateEvent(req, res, next);

      // Assert
      expect(eventStore.getEventByName).toHaveBeenCalledWith(name);
      expect(updateCalendarEvent).toHaveBeenCalledWith(
        eventId,
        existingEvent.date,
        updates.time,
        updates.partySize,
        existingEvent.email,
        existingEvent.restaurantName,
        existingEvent.restaurantAddress,
        newName
      );
      expect(eventStore.saveEvent).toHaveBeenCalledWith(
        eventId,
        expect.objectContaining({
          ...existingEvent,
          ...updates,
          name: newName
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 404 when event does not exist by name', async () => {
      // Arrange
      req.params = { name };
      req.body = { ...updates };
      eventStore.getEventByName.mockReturnValue(null);

      // Act
      await updateEvent(req, res, next);

      // Assert
      expect(eventStore.getEventByName).toHaveBeenCalledWith(name);
      expect(updateCalendarEvent).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404,
        message: 'Event not found'
      }));
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      req.params = {}; // Missing name

      // Act
      await updateEvent(req, res, next);

      // Assert
      expect(updateCalendarEvent).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle service exceptions properly', async () => {
      // Arrange
      req.params = { name };
      req.body = { ...updates };
      eventStore.getEventByName.mockReturnValue(existingEvent);
      const error = new Error('Service failure');
      updateCalendarEvent.mockRejectedValue(error);

      // Act
      await updateEvent(req, res, next);

      // Assert
      expect(updateCalendarEvent).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteEvent', () => {
    const eventId = 'event123';
    const name = 'Dinner Reservation';
    const existingEvent = {
      eventId: eventId,
      date: '2023-12-25',
      time: '18:00',
      partySize: 4,
      name: name
    };

    it('should delete a calendar event successfully using name', async () => {
      // Arrange
      req.params = { name };
      eventStore.getEventByName.mockReturnValue(existingEvent);
      deleteCalendarEvent.mockResolvedValue({ success: true });

      // Act
      await deleteEvent(req, res, next);

      // Assert
      expect(eventStore.getEventByName).toHaveBeenCalledWith(name);
      expect(deleteCalendarEvent).toHaveBeenCalledWith(eventId);
      expect(eventStore.removeEventByName).toHaveBeenCalledWith(name);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(logger.info).toHaveBeenCalled();
    });

    it('should return 404 when event does not exist by name', async () => {
      // Arrange
      req.params = { name };
      eventStore.getEventByName.mockReturnValue(null);

      // Act
      await deleteEvent(req, res, next);

      // Assert
      expect(eventStore.getEventByName).toHaveBeenCalledWith(name);
      expect(deleteCalendarEvent).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404,
        message: 'Event not found'
      }));
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      req.params = {}; // Missing name

      // Act
      await deleteEvent(req, res, next);

      // Assert
      expect(deleteCalendarEvent).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle service exceptions properly', async () => {
      // Arrange
      req.params = { name };
      eventStore.getEventByName.mockReturnValue(existingEvent);
      const error = new Error('Service failure');
      deleteCalendarEvent.mockRejectedValue(error);

      // Act
      await deleteEvent(req, res, next);

      // Assert
      expect(deleteCalendarEvent).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getAllEvents', () => {
    const events = [
      { id: 'event1', date: '2023-12-25' },
      { id: 'event2', date: '2023-12-26' }
    ];

    it('should return all events', async () => {
      // Arrange
      eventStore.getAllEvents.mockReturnValue(events);

      // Act
      await getAllEvents(req, res, next);

      // Assert
      expect(eventStore.getAllEvents).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(events);
    });

    it('should handle service exceptions properly', async () => {
      // Arrange
      const error = new Error('Service failure');
      eventStore.getAllEvents.mockImplementation(() => {
        throw error;
      });

      // Act
      await getAllEvents(req, res, next);

      // Assert
      expect(eventStore.getAllEvents).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
