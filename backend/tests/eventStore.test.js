import { describe, it, expect, beforeEach, vi } from 'vitest';
import eventStore from '../services/eventStore.js';

describe('EventStore', () => {
  beforeEach(() => {
    // Clear all events before each test
    eventStore.events.clear();
    eventStore.nameToEventId.clear();
  });

  describe('getMonthlyEvents', () => {
    it('should return events for previous, current and next month', () => {
      // Mock current date to May 12, 2025
      const mockDate = new Date('2025-05-12');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      // Add test events
      const previousMonthEvent = {
        eventId: '1',
        date: '2025-04-15',
        time: '19:00',
        partySize: 2,
        email: 'test1@example.com',
        restaurantName: 'Test Restaurant',
        restaurantAddress: '123 Test St',
        name: 'John Doe'
      };

      const currentMonthEvent = {
        eventId: '2',
        date: '2025-05-20',
        time: '20:00',
        partySize: 4,
        email: 'test2@example.com',
        restaurantName: 'Test Restaurant',
        restaurantAddress: '123 Test St',
        name: 'Jane Smith'
      };

      const nextMonthEvent = {
        eventId: '3',
        date: '2025-06-10',
        time: '18:30',
        partySize: 3,
        email: 'test3@example.com',
        restaurantName: 'Test Restaurant',
        restaurantAddress: '123 Test St',
        name: 'Bob Wilson'
      };

      eventStore.saveEvent('1', previousMonthEvent);
      eventStore.saveEvent('2', currentMonthEvent);
      eventStore.saveEvent('3', nextMonthEvent);

      const result = eventStore.getMonthlyEvents();

      // Verify the structure of the response
      expect(result).toHaveProperty('previousMonth');
      expect(result).toHaveProperty('currentMonth');
      expect(result).toHaveProperty('nextMonth');

      // Verify the events are in the correct months
      expect(result.previousMonth).toHaveLength(1);
      expect(result.previousMonth[0].eventId).toBe('1');

      expect(result.currentMonth).toHaveLength(1);
      expect(result.currentMonth[0].eventId).toBe('2');

      expect(result.nextMonth).toHaveLength(1);
      expect(result.nextMonth[0].eventId).toBe('3');

      // Clean up
      vi.useRealTimers();
    });

    it('should handle empty event store', () => {
      const result = eventStore.getMonthlyEvents();

      expect(result.previousMonth).toHaveLength(0);
      expect(result.currentMonth).toHaveLength(0);
      expect(result.nextMonth).toHaveLength(0);
    });

    it('should handle events with invalid dates', () => {
      const invalidEvent = {
        eventId: '1',
        date: 'invalid-date',
        time: '19:00',
        partySize: 2,
        email: 'test@example.com',
        restaurantName: 'Test Restaurant',
        restaurantAddress: '123 Test St',
        name: 'John Doe'
      };

      eventStore.saveEvent('1', invalidEvent);

      const result = eventStore.getMonthlyEvents();

      expect(result.previousMonth).toHaveLength(0);
      expect(result.currentMonth).toHaveLength(0);
      expect(result.nextMonth).toHaveLength(0);
    });
  });
}); 