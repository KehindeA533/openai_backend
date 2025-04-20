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
    this.nameToEventId = new Map(); // New map to store name -> eventId mappings
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
    
    // Check if there's an existing event with this ID
    const existingEvent = this.events.get(eventId);
    
    // If the existing event has a different name, remove the old name mapping
    if (existingEvent && existingEvent.name && 
        eventData.name && existingEvent.name !== eventData.name) {
      this.nameToEventId.delete(existingEvent.name);
    }
    
    // Store in primary map
    this.events.set(eventId, { eventId, ...eventData });
    
    // If name exists, store in name-to-eventId map
    if (eventData.name) {
      this.nameToEventId.set(eventData.name, eventId);
    }
    
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
   * Get an event by name
   * @param {string} name - Name of the person for the reservation
   * @returns {Object|null} Event details or null if not found
   */
  getEventByName(name) {
    if (!name) {
      return null;
    }
    
    const eventId = this.nameToEventId.get(name);
    if (!eventId) {
      return null;
    }
    
    return this.getEvent(eventId);
  }

  /**
   * Get eventId from name
   * @param {string} name - Name of the person for the reservation
   * @returns {string|null} EventId or null if not found
   */
  getEventIdByName(name) {
    if (!name) {
      return null;
    }
    
    return this.nameToEventId.get(name) || null;
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
    
    // Get the event to find its name
    const event = this.events.get(eventId);
    if (event && event.name) {
      // Remove from name map
      this.nameToEventId.delete(event.name);
    }
    
    // Remove from main map
    return this.events.delete(eventId);
  }

  /**
   * Remove an event by name
   * @param {string} name - Name of the person for the reservation
   * @returns {boolean} Success indicator
   */
  removeEventByName(name) {
    if (!name) {
      return false;
    }
    
    const eventId = this.nameToEventId.get(name);
    if (!eventId) {
      return false;
    }
    
    // Remove from name map
    this.nameToEventId.delete(name);
    
    // Remove from main map
    return this.events.delete(eventId);
  }
}

// Create and export a singleton instance
const eventStore = new EventStore();
export default eventStore;