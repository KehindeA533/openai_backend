// Simple in-memory store for calendar event IDs
const eventStore = {
  events: new Map(),
  
  saveEvent(userId, eventId, eventData = {}) {
    this.events.set(`${userId}_${eventId}`, { eventId, ...eventData });
  },
  
  getEvent(userId, eventId) {
    return this.events.get(`${userId}_${eventId}`);
  },
  
  getAllUserEvents(userId) {
    return Array.from(this.events.entries())
      .filter(([key]) => key.startsWith(`${userId}_`))
      .map(([_, value]) => value);
  },
  
  removeEvent(userId, eventId) {
    this.events.delete(`${userId}_${eventId}`);
  }
};

export default eventStore; 