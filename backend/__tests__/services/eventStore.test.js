import { describe, it, expect, beforeEach } from 'vitest';
import eventStore from '../../services/eventStore.js';

describe('EventStore', () => {
  beforeEach(() => {
    // Reset the event store
    eventStore.events.clear();
    eventStore.nameToEventId.clear();
  });

  describe('saveEvent', () => {
    it('should save an event correctly', () => {
      const eventId = 'event123';
      const eventData = {
        date: '2023-12-25',
        time: '18:00',
        name: 'Test User'
      };

      const result = eventStore.saveEvent(eventId, eventData);
      expect(result).toBe(true);
      expect(eventStore.events.get(eventId)).toEqual({
        eventId,
        ...eventData
      });
      expect(eventStore.nameToEventId.get('Test User')).toBe(eventId);
    });

    it('should throw error if eventId is missing', () => {
      expect(() => eventStore.saveEvent()).toThrow('eventId is required');
    });

    it('should not save name mapping if name is missing', () => {
      const eventId = 'event123';
      const eventData = {
        date: '2023-12-25',
        time: '18:00'
      };

      eventStore.saveEvent(eventId, eventData);
      expect(eventStore.events.has(eventId)).toBe(true);
      expect(eventStore.nameToEventId.size).toBe(0);
    });

    it('should update name mapping when name changes', () => {
      const eventId = 'event123';
      const eventData = {
        date: '2023-12-25',
        time: '18:00',
        name: 'Test User'
      };

      // First save
      eventStore.saveEvent(eventId, eventData);
      expect(eventStore.nameToEventId.get('Test User')).toBe(eventId);

      // Update with new name
      const updatedData = {
        ...eventData,
        name: 'Updated User'
      };
      eventStore.saveEvent(eventId, updatedData);
      
      // Should update name mapping
      expect(eventStore.nameToEventId.has('Test User')).toBe(false);
      expect(eventStore.nameToEventId.get('Updated User')).toBe(eventId);
    });
  });

  describe('getEvent and getEventByName', () => {
    const eventId = 'event123';
    const eventData = {
      date: '2023-12-25',
      time: '18:00',
      name: 'Test User'
    };

    beforeEach(() => {
      eventStore.saveEvent(eventId, eventData);
    });

    it('should get event by ID', () => {
      const result = eventStore.getEvent(eventId);
      expect(result).toEqual({
        eventId,
        ...eventData
      });
    });

    it('should get event by name', () => {
      const result = eventStore.getEventByName('Test User');
      expect(result).toEqual({
        eventId,
        ...eventData
      });
    });

    it('should return null for non-existent ID', () => {
      expect(eventStore.getEvent('nonexistent')).toBeNull();
    });

    it('should return null for non-existent name', () => {
      expect(eventStore.getEventByName('Nonexistent User')).toBeNull();
    });

    it('should return null for null/undefined inputs', () => {
      expect(eventStore.getEvent()).toBeNull();
      expect(eventStore.getEventByName()).toBeNull();
    });
  });

  describe('getEventIdByName', () => {
    it('should get eventId by name', () => {
      const eventId = 'event123';
      const eventData = { name: 'Test User' };
      
      eventStore.saveEvent(eventId, eventData);
      expect(eventStore.getEventIdByName('Test User')).toBe(eventId);
    });

    it('should return null for non-existent name', () => {
      expect(eventStore.getEventIdByName('Nonexistent User')).toBeNull();
    });

    it('should return null for null/undefined name', () => {
      expect(eventStore.getEventIdByName()).toBeNull();
    });
  });

  describe('removeEvent and removeEventByName', () => {
    const eventId = 'event123';
    const eventData = {
      date: '2023-12-25',
      time: '18:00',
      name: 'Test User'
    };

    beforeEach(() => {
      eventStore.saveEvent(eventId, eventData);
    });

    it('should remove event by ID and clean up name mapping', () => {
      expect(eventStore.removeEvent(eventId)).toBe(true);
      expect(eventStore.events.has(eventId)).toBe(false);
      expect(eventStore.nameToEventId.has('Test User')).toBe(false);
    });

    it('should remove event by name and clean up main map', () => {
      expect(eventStore.removeEventByName('Test User')).toBe(true);
      expect(eventStore.nameToEventId.has('Test User')).toBe(false);
      expect(eventStore.events.has(eventId)).toBe(false);
    });

    it('should return false for non-existent ID', () => {
      expect(eventStore.removeEvent('nonexistent')).toBe(false);
    });

    it('should return false for non-existent name', () => {
      expect(eventStore.removeEventByName('Nonexistent User')).toBe(false);
    });

    it('should return false for null/undefined inputs', () => {
      expect(eventStore.removeEvent()).toBe(false);
      expect(eventStore.removeEventByName()).toBe(false);
    });
  });

  describe('getAllEvents', () => {
    it('should return all events', () => {
      eventStore.saveEvent('event1', { name: 'User 1' });
      eventStore.saveEvent('event2', { name: 'User 2' });
      
      const events = eventStore.getAllEvents();
      expect(events).toHaveLength(2);
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({ eventId: 'event1', name: 'User 1' }),
        expect.objectContaining({ eventId: 'event2', name: 'User 2' })
      ]));
    });

    it('should return empty array when no events exist', () => {
      expect(eventStore.getAllEvents()).toEqual([]);
    });
  });
}); 