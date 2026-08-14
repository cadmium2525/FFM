import { getMessageSpeedTiming } from '../core/Settings.js';

const MAX_QUEUE_LENGTH = 80;

export class MessageWindow {
  constructor(windowEl, textEl) {
    this.windowEl = windowEl;
    this.textEl = textEl;
    this.hideTimer = null;
    this.advanceTimer = null;
    this.queue = [];
    this.isShowing = false;
    this.currentDeadline = 0;
  }

  show(text) {
    if (!text) return;
    this.queue.push(String(text));
    // An action may produce several result lines. Keep the whole action journal
    // visible instead of dropping its opening lines while the battle races on.
    if (this.queue.length > MAX_QUEUE_LENGTH) this.queue.splice(MAX_QUEUE_LENGTH);
    if (!this.isShowing) this.showNext();
    return this.remainingDurationMs();
  }

  showNext() {
    const text = this.queue.shift();
    if (!text) {
      this.hide();
      return;
    }
    this.isShowing = true;
    this.textEl.textContent = text;
    this.windowEl.classList.remove('hidden', 'message-enter');
    // Force a fresh transition when several combat messages arrive together.
    requestAnimationFrame(() => this.windowEl.classList.add('message-enter'));
    clearTimeout(this.hideTimer);
    // Read the current speed setting on every message so a mid-battle
    // change in Options takes effect immediately, without needing to
    // reset or recreate the message window.
    const { holdMs: HOLD_MS, fastHoldMs: FAST_HOLD_MS, betweenMs: BETWEEN_MESSAGES_MS } = getMessageSpeedTiming();
    const holdMs = this.queue.length ? FAST_HOLD_MS : HOLD_MS;
    this.currentDeadline = Date.now() + holdMs;
    this.hideTimer = setTimeout(() => {
      this.windowEl.classList.remove('message-enter');
      this.isShowing = false;
      if (this.queue.length) this.advanceTimer = setTimeout(() => this.showNext(), BETWEEN_MESSAGES_MS);
      else this.hide();
    }, holdMs);
  }

  hide() {
    clearTimeout(this.hideTimer);
    clearTimeout(this.advanceTimer);
    this.isShowing = false;
    this.currentDeadline = 0;
    this.windowEl.classList.add('hidden');
  }

  remainingDurationMs() {
    const timing = getMessageSpeedTiming();
    let remaining = this.isShowing ? Math.max(0, this.currentDeadline - Date.now()) : 0;
    if (this.isShowing && this.queue.length) remaining += timing.betweenMs;
    this.queue.forEach((_text, index) => {
      const remainingAfter = this.queue.length - index - 1;
      remaining += remainingAfter ? timing.fastHoldMs : timing.holdMs;
      if (remainingAfter) remaining += timing.betweenMs;
    });
    return remaining;
  }

  reset() {
    clearTimeout(this.hideTimer);
    clearTimeout(this.advanceTimer);
    this.queue.length = 0;
    this.isShowing = false;
    this.currentDeadline = 0;
    this.textEl.textContent = '';
    this.windowEl.classList.remove('message-enter');
    this.windowEl.classList.add('hidden');
  }
}
