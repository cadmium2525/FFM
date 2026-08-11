import { eventBus } from './EventBus.js';

export const States = Object.freeze({
  TITLE: 'TITLE',
  MENU: 'MENU',
  BATTLE: 'BATTLE',
  INTERMISSION: 'INTERMISSION',
  VICTORY: 'VICTORY',
  GAMEOVER: 'GAMEOVER',
});

class GameStateManager {
  constructor() {
    this.current = States.TITLE;
    // Progress trackers shared across the whole run.
    this.bossIndex = 0;
    this.partyRuntime = null; // populated by main.js with live Unit stat carry-over
  }

  set(next) {
    const prev = this.current;
    this.current = next;
    eventBus.emit('state:changed', { prev, next });
  }

  is(state) {
    return this.current === state;
  }
}

export const GameState = new GameStateManager();
