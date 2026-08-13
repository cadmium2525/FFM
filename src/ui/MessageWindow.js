import { getMessageSpeedTiming } from '../core/Settings.js';

const MAX_QUEUE_LENGTH = 6;

export class MessageWindow {
  constructor(windowEl, textEl) {
    this.windowEl = windowEl;
    this.textEl = textEl;
    this.hideTimer = null;
    this.advanceTimer = null;
    this.queue = [];
    this.isShowing = false;
  }

  show(text) {
    if (!text) return;
    this.queue.push(String(text));
    if (this.queue.length > MAX_QUEUE_LENGTH) this.queue.splice(0, this.queue.length - MAX_QUEUE_LENGTH);
    if (!this.isShowing) this.showNext();
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
    this.windowEl.classList.add('hidden');
  }

  reset() {
    clearTimeout(this.hideTimer);
    clearTimeout(this.advanceTimer);
    this.queue.length = 0;
    this.isShowing = false;
    this.textEl.textContent = '';
    this.windowEl.classList.remove('message-enter');
    this.windowEl.classList.add('hidden');
  }
}
