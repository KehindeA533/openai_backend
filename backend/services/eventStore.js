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
   * @param {string} userId - User identifier
   * @param {string} eventId - Google Calendar event ID
   * @param {Object} eventData - Event details
   */
  saveEvent(userId, eventId, eventData = {}) {
    if (!userId || !eventId) {
      throw new Error('userId and eventId are required');
    }
    
    const key = this._generateKey(userId, eventId);
    this.events.set(key, { eventId, ...eventData });
    return true;
  }

  /**
   * Get an event from the store
   * @param {string} userId - User identifier
   * @param {string} eventId - Google Calendar event ID
   * @returns {Object|null} Event details or null if not found
   */
  getEvent(userId, eventId) {
    if (!userId || !eventId) {
      return null;
    }
    
    const key = this._generateKey(userId, eventId);
    return this.events.get(key) || null;
  }

  /**
   * Get all events for a user
   * @param {string} userId - User identifier
   * @returns {Array} Array of event objects
   */
  getAllUserEvents(userId) {
    if (!userId) {
      return [];
    }
    
    const prefix = `${userId}_`;
    return Array.from(this.events.entries())
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value);
  }

  /**
   * Remove an event from the store
   * @param {string} userId - User identifier
   * @param {string} eventId - Google Calendar event ID
   * @returns {boolean} Success indicator
   */
  removeEvent(userId, eventId) {
    if (!userId || !eventId) {
      return false;
    }
    
    const key = this._generateKey(userId, eventId);
    return this.events.delete(key);
  }

  /**
   * Generate a composite key for the events map
   * @private
   */
  _generateKey(userId, eventId) {
    return `${userId}_${eventId}`;
  }
}

// Create and export a singleton instance
const eventStore = new EventStore();
export default eventStore;