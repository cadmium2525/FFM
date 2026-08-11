/**
 * CTBEngine
 * ----------
 * Reproduces the core feel of FFX's Count/Charge Time Battle system:
 *  - Every unit accrues "CT" each tick, proportional to its Agility.
 *  - When a unit's CT crosses BASE_THRESHOLD, it becomes ready to act.
 *  - Acting consumes CT: the action's `ctbCost` multiplier decides how far
 *    the unit's CT drops below the threshold, i.e. how long until its next
 *    turn. Cheap/fast actions (Defend) barely delay the unit; heavy spells
 *    delay it a lot.
 *  - previewQueue() runs a side simulation (cloned CT values only) to show
 *    the upcoming turn order without mutating real battle state.
 */
import { effectiveAgility } from './StatusEngine.js';

export const BASE_THRESHOLD = 1000;

export class CTBEngine {
  constructor(units) {
    this.units = units;
  }

  aliveUnits() {
    return this.units.filter((u) => u.isAlive() && !u.removedFromBattle);
  }

  /**
   * Advances real CT values tick by tick until exactly one unit is ready,
   * then returns that unit. Ties are broken by whichever accumulated the
   * highest CT overshoot, then by Agility.
   */
  advanceToNextActor() {
    const alive = this.aliveUnits();
    if (alive.length === 0) return null;

    // Fast-forward: compute, per unit, how many ticks until threshold, then
    // jump straight to the smallest requirement instead of looping tick by tick.
    // (Still tick-accurate for tie-breaking.)
    let guard = 0;
    while (guard++ < 100000) {
      const ready = alive.filter((u) => u.ctValue >= BASE_THRESHOLD);
      if (ready.length > 0) {
        ready.sort((a, b) => (b.ctValue - a.ctValue) || (effectiveAgility(b) - effectiveAgility(a)));
        return ready[0];
      }
      // Jump forward by the minimum number of ticks needed for the fastest
      // unit-to-threshold gap, applied to everyone at once (equivalent to
      // simulating tick-by-tick, just faster).
      const ticksNeeded = alive.map((u) =>
        Math.ceil((BASE_THRESHOLD - u.ctValue) / Math.max(1, effectiveAgility(u)))
      );
      const jump = Math.max(1, Math.min(...ticksNeeded));
      alive.forEach((u) => {
        u.ctValue += Math.max(1, effectiveAgility(u)) * jump;
      });
    }
    return alive[0];
  }

  /** Consumes the acting unit's turn, applying the action's CTB cost. */
  consumeTurn(unit, ctbCost = 1.0) {
    unit.ctValue -= BASE_THRESHOLD * ctbCost;
    if (unit.ctValue < -BASE_THRESHOLD * 2) {
      // safety clamp so a single huge cost can't strand a unit forever
      unit.ctValue = -BASE_THRESHOLD * 2;
    }
  }

  /**
   * Predicts the next `count` actors without mutating real units.
   * Enemies are assumed to use a "normal" (1.0) cost action; this is only
   * a preview so perfect accuracy isn't required.
   */
  previewQueue(count = 8) {
    const clones = this.aliveUnits().map((u) => ({
      uid: u.uid,
      id: u.id,
      name: u.name,
      isEnemy: u.isEnemy,
      ct: u.ctValue,
      agi: Math.max(1, effectiveAgility(u)),
    }));
    if (clones.length === 0) return [];

    const queue = [];
    let guard = 0;
    while (queue.length < count && guard++ < 100000) {
      const ready = clones.filter((c) => c.ct >= BASE_THRESHOLD);
      if (ready.length === 0) {
        const ticksNeeded = clones.map((c) =>
          Math.ceil((BASE_THRESHOLD - c.ct) / Math.max(1, c.agi))
        );
        const jump = Math.max(1, Math.min(...ticksNeeded));
        clones.forEach((c) => {
          c.ct += c.agi * jump;
        });
        continue;
      }
      ready.sort((a, b) => (b.ct - a.ct) || (b.agi - a.agi));
      const actor = ready[0];
      queue.push({ uid: actor.uid, id: actor.id, name: actor.name, isEnemy: actor.isEnemy });
      actor.ct -= BASE_THRESHOLD * 1.0; // assume average-cost action for preview purposes
    }
    return queue;
  }
}
