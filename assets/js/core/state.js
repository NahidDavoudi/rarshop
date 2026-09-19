/**
 * core/state.js — shared reactive state
 */

const _data = {};
const _subs = {};

export const state = {
  get(key) {
    return _data[key];
  },

  set(key, value) {
    _data[key] = value;
    (_subs[key] || []).forEach((cb) => {
      try { cb(value); } catch (_) { /* noop */ }
    });
  },

  on(key, callback) {
    if (!_subs[key]) _subs[key] = [];
    _subs[key].push(callback);
    return () => {
      _subs[key] = (_subs[key] || []).filter((cb) => cb !== callback);
    };
  },
};

export default state;
