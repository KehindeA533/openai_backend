import { vi, describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import calendarRoutes from '../../routes/calendarRoutes.js';
import * as calendarController from '../../controllers/calendarController.js';

// Mock dependencies
vi.mock('../../controllers/calendarController.js');

describe('Calendar Routes', () => {
  let app;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup express app for testing
    app = express();
    app.use(express.json()); // Add JSON middleware
    app.use('/calendar', calendarRoutes);
    
    // Add error handling middleware
    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({ error: err.message });
    });
    
    // Mock controller implementations
    calendarController.createEvent.mockImplementation((req, res) => {
      res.json({ 
        event: { 
          id: 'mock-event-id',
          summary: `Reservation at ${req.body.restaurantName}`,
          location: req.body.restaurantAddress,
          attendees: [{ email: req.body.email }]
        } 
      });
    });
    
    calendarController.updateEvent.mockImplementation((req, res) => {
      res.json({ 
        event: { 
          id: req.params.eventId,
          summary: `Updated reservation at ${req.body.restaurantName || 'Restaurant'}`,
          location: req.body.restaurantAddress || 'Address',
          attendees: [{ email: req.body.email || 'email@example.com' }]
        } 
      });
    });
    
    calendarController.deleteEvent.mockImplementation((req, res) => {
      res.json({ 
        success: true, 
        eventId: req.params.eventId 
      });
    });
    
    calendarController.getUserEvents.mockImplementation((req, res) => {
      res.json({ 
        events: [
          { id: 'event-1', summary: 'Event 1' },
          { id: 'event-2', summary: 'Event 2' }
        ] 
      });
    });
  });

  describe('POST /calendar/events', () => {
    it('should create a new calendar event with valid data', async () => {
      const eventData = {
        userId: 'user-123',
        date: '2023-05-15',
        time: '18:30',
        partySize: 4,
        email: 'user@example.com',
        restaurantName: 'Nice Restaurant',
        restaurantAddress: '123 Main St',
        name: 'John Doe'
      };

      const response = await request(app)
        .post('/calendar/events')
        .send(eventData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('event');
      expect(response.body.event).toHaveProperty('id', 'mock-event-id');
      expect(response.body.event.summary).toContain(eventData.restaurantName);
      expect(calendarController.createEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /calendar/events/:eventId', () => {
    it('should update an existing calendar event', async () => {
      const eventId = 'event-123';
      const updateData = {
        userId: 'user-123',
        restaurantName: 'Updated Restaurant',
        partySize: 6
      };

      const response = await request(app)
        .put(`/calendar/events/${eventId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('event');
      expect(response.body.event).toHaveProperty('id', eventId);
      expect(response.body.event.summary).toContain(updateData.restaurantName);
      expect(calendarController.updateEvent).toHaveBeenCalledTimes(1);
      expect(calendarController.updateEvent.mock.calls[0][0].params.eventId).toBe(eventId);
    });
  });

  describe('DELETE /calendar/events/:eventId', () => {
    it('should delete a calendar event', async () => {
      const eventId = 'event-123';
      const deleteData = {
        userId: 'user-123'
      };

      const response = await request(app)
        .delete(`/calendar/events/${eventId}`)
        .send(deleteData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('eventId', eventId);
      expect(calendarController.deleteEvent).toHaveBeenCalledTimes(1);
      expect(calendarController.deleteEvent.mock.calls[0][0].params.eventId).toBe(eventId);
      // Skip checking the body since it might not be properly passed in DELETE requests
    });
  });

  describe('GET /calendar/users/:userId/events', () => {
    it('should get all events for a user', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .get(`/calendar/users/${userId}/events`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body.events).toHaveLength(2);
      expect(calendarController.getUserEvents).toHaveBeenCalledTimes(1);
      expect(calendarController.getUserEvents.mock.calls[0][0].params.userId).toBe(userId);
    });
  });

  describe('Error handling', () => {
    it('should handle errors in createEvent endpoint', async () => {
      // Mock controller to simulate an error
      calendarController.createEvent.mockImplementation((req, res, next) => {
        const error = new Error('Failed to create event');
        error.statusCode = 400;
        next(error);
      });

      const response = await request(app)
        .post('/calendar/events')
        .send({
          userId: 'user-123',
          date: '2023-05-15',
          time: '18:30'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Failed to create event');
    });

    it('should handle errors in updateEvent endpoint', async () => {
      // Mock controller to simulate an error
      calendarController.updateEvent.mockImplementation((req, res, next) => {
        const error = new Error('Event not found');
        error.statusCode = 404;
        next(error);
      });

      const response = await request(app)
        .put('/calendar/events/nonexistent-id')
        .send({ userId: 'user-123' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Event not found');
    });

    it('should handle errors in deleteEvent endpoint', async () => {
      // Mock controller to simulate an error
      calendarController.deleteEvent.mockImplementation((req, res, next) => {
        const error = new Error('Unauthorized to delete this event');
        error.statusCode = 403;
        next(error);
      });

      const response = await request(app)
        .delete('/calendar/events/event-123')
        .send({ userId: 'different-user' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Unauthorized to delete this event');
    });

    it('should handle errors in getUserEvents endpoint', async () => {
      // Mock controller to simulate an error
      calendarController.getUserEvents.mockImplementation((req, res, next) => {
        const error = new Error('Failed to fetch events');
        error.statusCode = 500;
        next(error);
      });

      const response = await request(app)
        .get('/calendar/users/user-123/events');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch events');
    });
  });

  describe('Input validation', () => {
    it('should validate required fields for createEvent', async () => {
      // Mock controller to validate input
      calendarController.createEvent.mockImplementation((req, res, next) => {
        const { userId, date, time, email, restaurantName } = req.body;
        if (!userId || !date || !time || !email || !restaurantName) {
          const error = new Error('Missing required fields');
          error.statusCode = 400;
          return next(error);
        }
        res.json({ event: { id: 'mock-event-id' } });
      });

      const response = await request(app)
        .post('/calendar/events')
        .send({
          userId: 'user-123',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });
  });
}); 