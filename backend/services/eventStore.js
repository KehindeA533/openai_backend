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

  /**
   * Get events within a date range
   * @param {Date} startDate - Start date of the range
   * @param {Date} endDate - End date of the range
   * @returns {Array} Array of event objects within the date range
   */
  getEventsByDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
      return [];
    }

    return Array.from(this.events.values()).filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  /**
   * Get events for previous, current and next month
   * @returns {Object} Object containing events for previous, current and next month
   */
  getMonthlyEvents() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Calculate start and end dates for each month
    const previousMonth = new Date(currentYear, currentMonth - 1, 1);
    const previousMonthEnd = new Date(currentYear, currentMonth, 0);

    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);

    const nextMonth = new Date(currentYear, currentMonth + 1, 1);
    const nextMonthEnd = new Date(currentYear, currentMonth + 2, 0);

    return {
      previousMonth: this.getEventsByDateRange(previousMonth, previousMonthEnd),
      currentMonth: this.getEventsByDateRange(currentMonthStart, currentMonthEnd),
      nextMonth: this.getEventsByDateRange(nextMonth, nextMonthEnd)
    };
  }
}

// Create and export a singleton instance
const eventStore = new EventStore();
export default eventStore;