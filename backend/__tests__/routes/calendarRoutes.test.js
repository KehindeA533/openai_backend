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
          id: 'event-123', // Use a fixed eventId for testing
          summary: `Updated reservation at ${req.body.restaurantName || 'Restaurant'}`,
          location: req.body.restaurantAddress || 'Address',
          attendees: [{ email: req.body.email || 'email@example.com' }]
        } 
      });
    });
    
    calendarController.deleteEvent.mockImplementation((req, res) => {
      res.json({ 
        success: true, 
        eventId: 'event-123' // Use a fixed eventId for testing
      });
    });
    
    calendarController.getAllEvents.mockImplementation((req, res) => {
      res.json([ 
        { id: 'event-1', summary: 'Event 1' },
        { id: 'event-2', summary: 'Event 2' }
      ]);
    });
  });

  describe('POST /calendar/events', () => {
    it('should create a new calendar event with valid data', async () => {
      const eventData = {
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

  describe('PUT /calendar/events/:name', () => {
    it('should update an existing calendar event', async () => {
      const name = 'John Doe';
      const updateData = {
        restaurantName: 'Updated Restaurant',
        partySize: 6
      };

      const response = await request(app)
        .put(`/calendar/events/${encodeURIComponent(name)}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('event');
      expect(response.body.event).toHaveProperty('id', 'event-123');
      expect(response.body.event.summary).toContain(updateData.restaurantName);
      expect(calendarController.updateEvent).toHaveBeenCalledTimes(1);
      expect(calendarController.updateEvent.mock.calls[0][0].params.name).toBe(name);
    });
  });

  describe('DELETE /calendar/events/:name', () => {
    it('should delete a calendar event', async () => {
      const name = 'John Doe';

      const response = await request(app)
        .delete(`/calendar/events/${encodeURIComponent(name)}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('eventId', 'event-123');
      expect(calendarController.deleteEvent).toHaveBeenCalledTimes(1);
      expect(calendarController.deleteEvent.mock.calls[0][0].params.name).toBe(name);
    });
  });

  describe('GET /calendar/events', () => {
    it('should get all events', async () => {
      const response = await request(app)
        .get('/calendar/events');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(calendarController.getAllEvents).toHaveBeenCalledTimes(1);
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
        .put('/calendar/events/nonexistent-name')
        .send({});

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
        .delete('/calendar/events/John%20Doe');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Unauthorized to delete this event');
    });

    it('should handle errors in getAllEvents endpoint', async () => {
      // Mock controller to simulate an error
      calendarController.getAllEvents.mockImplementation((req, res, next) => {
        const error = new Error('Failed to fetch events');
        error.statusCode = 500;
        next(error);
      });

      const response = await request(app)
        .get('/calendar/events');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch events');
    });
  });

  describe('Input validation', () => {
    it('should validate required fields for createEvent', async () => {
      // Mock controller to validate input
      calendarController.createEvent.mockImplementation((req, res, next) => {
        const { date, time, email, restaurantName } = req.body;
        if (!date || !time || !email || !restaurantName) {
          const error = new Error('Missing required fields');
          error.statusCode = 400;
          return next(error);
        }
        res.json({ event: { id: 'mock-event-id' } });
      });

      const response = await request(app)
        .post('/calendar/events')
        .send({
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });
  });
}); 