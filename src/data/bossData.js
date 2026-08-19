/**
 * Bosses fought in sequence. `size` only affects the placeholder sprite scale.
 * `ai` is a simple behaviour tag consumed by BattleManager's enemy AI step.
 *
 * Data now lives in src/data/bosses.json + src/data/stages.json (edited via
 * the /admin tool and committed to GitHub); this file just derives the
 * course order from stage "1-1" for backward compatibility with the rest
 * of main.js, which still addresses bosses by array index. See the
 * "Boss / stage data architecture" section in README.md before editing
 * anything under src/data/ — there's a JSON-source / generated-.js split
 * that's easy to get backwards.
 */
import { bossRegistryById } from './bosses.js';
import { stages } from './stages.js';

const activeStage = stages[0];

export const bossData = activeStage.bossSequence.map((id) => bossRegistryById[id]);

export { bossRegistryById, stages };

export const elementNames = {
  fire: 'ほのお',
  ice: 'こおり',
  water: 'みず',
  thunder: 'いかずち',
  wind: 'かぜ',
  earth: 'つち',
  holy: 'せいれい',
  poison: 'どく',
};

