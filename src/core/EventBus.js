/**
 * EventBus - minimal pub/sub used to decouple battle logic from UI rendering.
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);
    return () => this.off(eventName, callback);
  }

  off(eventName, callback) {
    this.listeners.get(eventName)?.delete(callback);
  }

  emit(eventName, payload) {
    this.listeners.get(eventName)?.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EventBus] listener for "${eventName}" threw:`, err);
      }
    });
  }
}

// Shared singleton bus for the whole app.
export const eventBus = new EventBus();
