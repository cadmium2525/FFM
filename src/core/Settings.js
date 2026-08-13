import { eventBus } from './EventBus.js';

const SETTINGS_STORAGE_KEY = 'ff-crystal-rush-settings-v1';

/**
 * Message window pacing presets. `holdMs` is how long a single message stays
 * on screen before advancing (or closing), `fastHoldMs` is the shortened
 * hold used when more messages are already queued up, and `betweenMs` is the
 * gap between one message closing and the next appearing.
 */
export const MESSAGE_SPEED_PRESETS = Object.freeze({
  slow: { label: 'おそい', holdMs: 1700, fastHoldMs: 1100, betweenMs: 140 },
  normal: { label: 'ふつう', holdMs: 900, fastHoldMs: 580, betweenMs: 55 },
  fast: { label: 'はやい', holdMs: 520, fastHoldMs: 320, betweenMs: 25 },
});

const DEFAULT_SETTINGS = Object.freeze({
  messageSpeed: 'normal',
});

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || 'null');
    if (!saved || !MESSAGE_SPEED_PRESETS[saved.messageSpeed]) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

const state = load();

function save() {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Settings simply won't persist across sessions if storage is unavailable.
  }
}

export function getMessageSpeed() {
  return state.messageSpeed;
}

export function getMessageSpeedTiming() {
  return MESSAGE_SPEED_PRESETS[state.messageSpeed] ?? MESSAGE_SPEED_PRESETS.normal;
}

export function setMessageSpeed(speed) {
  if (!MESSAGE_SPEED_PRESETS[speed]) return;
  state.messageSpeed = speed;
  save();
  eventBus.emit('settings:changed', { key: 'messageSpeed', value: speed });
}
