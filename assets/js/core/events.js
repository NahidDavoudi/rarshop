/**
 * core/events.js — lightweight event bus
 */

const _handlers = {};

export const events = {
  on(eventName, callback) {
    if (!_handlers[eventName]) _handlers[eventName] = [];
    _handlers[eventName].push(callback);
    return () => events.off(eventName, callback);
  },

  off(eventName, callback) {
    if (!_handlers[eventName]) return;
    _handlers[eventName] = _handlers[eventName].filter((cb) => cb !== callback);
  },

  emit(eventName, data) {
    (_handlers[eventName] || []).forEach((cb) => {
      try { cb(data); } catch (_) { /* noop */ }
    });
  },
};

export default events;
