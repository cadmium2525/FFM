/**
 * Lightweight status rules shared by CTB and the action resolver.
 * Statuses remain a Set on Unit for UI compatibility; durations live beside it.
 */
export const POSITIVE_STATUSES = Object.freeze([
  'protect', 'shell', 'haste', 'regen', 'reflect', 'float', 'image', 'barrier',
]);

export const INCAPACITATING_STATUSES = Object.freeze([
  'ko', 'petrify', 'stop', 'sleep', 'paralyze',
]);

export const CURABLE_STATUSES = Object.freeze([
  'poison', 'blind', 'silence', 'toad', 'mini', 'petrify', 'confuse',
  'paralyze', 'sleep', 'old', 'berserk', 'zombie', 'stop', 'slow', 'doom', 'sap',
]);

export const DEFAULT_STATUS_DURATIONS = Object.freeze({
  sleep: 3,
  paralyze: 2,
  stop: 2,
  confuse: 3,
  berserk: 4,
  protect: 6,
  shell: 6,
  haste: 6,
  slow: 6,
  reflect: 5,
  regen: 6,
  sap: 5,
  doom: 5,
  time_focus: 4,
});

export function normalizeElement(element) {
  return element === 'lightning' ? 'thunder' : element;
}

export function effectiveAgility(unit) {
  let value = Math.max(1, unit.agility ?? 1);
  if (unit.statuses?.has('haste')) value *= 1.5;
  if (unit.statuses?.has('slow')) value *= 0.65;
  if (unit.statuses?.has('old')) value *= 0.8;
  if (unit.statuses?.has('time_focus')) value *= 1.2;
  if (unit.statuses?.has('stop')) value = 0;
  return Math.max(0, Math.round(value));
}

export function isIncapacitated(unit) {
  if (!unit?.isAlive?.()) return true;
  return INCAPACITATING_STATUSES.some((status) => unit.statuses?.has(status));
}

export function canIssueCommand(unit) {
  return !isIncapacitated(unit) && !unit.statuses?.has('berserk') && !unit.statuses?.has('confuse');
}

export function canUseMagic(unit) {
  return unit?.isAlive?.() && !unit.statuses?.has('silence') && !unit.statuses?.has('toad');
}

export function statusTick(unit) {
  const results = [];
  if (!unit.isAlive()) return results;

  if (unit.statuses.has('poison')) {
    const amount = unit.applyDamage(Math.max(1, Math.floor(unit.maxHp / 16)));
    results.push({ type: 'status-damage', status: 'poison', targetUid: unit.uid, amount });
  }
  if (unit.statuses.has('sap') && unit.isAlive()) {
    const amount = unit.applyDamage(Math.max(1, Math.floor(unit.maxHp / 24)));
    results.push({ type: 'status-damage', status: 'sap', targetUid: unit.uid, amount });
  }
  if (unit.statuses.has('regen') && unit.isAlive()) {
    const amount = unit.applyHeal(Math.max(1, Math.floor(unit.maxHp / 12)));
    results.push({ type: 'status-heal', status: 'regen', targetUid: unit.uid, amount });
  }

  const expired = [];
  unit.statusDurations?.forEach((remaining, status) => {
    const next = remaining - 1;
    if (next <= 0) expired.push(status);
    else unit.statusDurations.set(status, next);
  });
  expired.forEach((status) => {
    if (status === 'doom' && unit.isAlive()) {
      unit.applyDamage(unit.hp);
      results.push({ type: 'doom', status, targetUid: unit.uid, amount: 0 });
    }
    unit.removeStatus(status);
    results.push({ type: 'status-expired', status, targetUid: unit.uid, amount: 0 });
  });

  return results;
}
