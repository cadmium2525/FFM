const POSITION_STORAGE_KEY = 'ff-crystal-rush-ability-positions-v1';

function loadPositions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(POSITION_STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}
const positions = loadPositions();

function keyFor(unitId, surface, abilityId = '') {
  return `${surface}:${unitId || 'unknown'}:${abilityId || 'default'}`;
}

export function getAbilityListPosition(unitId, surface = 'battle', abilityId = '') {
  const value = Number(positions[keyFor(unitId, surface, abilityId)] ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function saveAbilityListPosition(unitId, surface, scrollTop, abilityId = '') {
  if (!unitId) return;
  positions[keyFor(unitId, surface, abilityId)] = Math.max(0, Math.round(Number(scrollTop) || 0));
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // The UI remains usable when persistent storage is unavailable.
  }
}
