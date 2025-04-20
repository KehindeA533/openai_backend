/**
 * In-memory store for calendar events
 * 
 * Note: In a production environment, this should be replaced with a persistent database
 */

/**
 * EventStore class for managing calendar events in memory
 */
class EventStore {
  constructor() {
    this.events = new Map();
  }

  /**
   * Save an event to the store
   * @param {string} eventId - Google Calendar event ID
   * @param {Object} eventData - Event details
   */
  saveEvent(eventId, eventData = {}) {
    if (!eventId) {
      throw new Error('eventId is required');
    }
    
    this.events.set(eventId, { eventId, ...eventData });
    return true;
  }

  /**
   * Get an event from the store
   * @param {string} eventId - Google Calendar event ID
   * @returns {Object|null} Event details or null if not found
   */
  getEvent(eventId) {
    if (!eventId) {
      return null;
    }
    
    return this.events.get(eventId) || null;
  }

  /**
   * Get all events
   * @returns {Array} Array of event objects
   */
  getAllEvents() {
    return Array.from(this.events.values());
  }

  /**
   * Remove an event from the store
   * @param {string} eventId - Google Calendar event ID
   * @returns {boolean} Success indicator
   */
  removeEvent(eventId) {
    if (!eventId) {
      return false;
    }
    
    return this.events.delete(eventId);
  }
}

// Create and export a singleton instance
const eventStore = new EventStore();
export default eventStore;