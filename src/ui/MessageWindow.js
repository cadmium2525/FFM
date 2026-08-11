const HOLD_MS = 1800;

export class MessageWindow {
  constructor(windowEl, textEl) {
    this.windowEl = windowEl;
    this.textEl = textEl;
    this.hideTimer = null;
  }

  show(text) {
    this.textEl.textContent = text;
    this.windowEl.classList.remove('hidden');
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.hide(), HOLD_MS);
  }

  hide() {
    this.windowEl.classList.add('hidden');
  }
}
