const LOADOUT_STORAGE_KEY = 'ff-crystal-rush-loadouts-v1';

/**
 * Per-character equipment/ability/crystal-shard selections made in the
 * intermission (party formation) screen, persisted to localStorage so the
 * player doesn't have to re-specify them every time they start a new run.
 */
function loadAll() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOADOUT_STORAGE_KEY) || 'null');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

const loadoutState = loadAll();

function persist() {
  try {
    localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(loadoutState));
  } catch {
    // Loadout simply won't persist across sessions if storage is unavailable.
  }
}

export function getUnitLoadout(unitId) {
  return loadoutState[unitId] ?? null;
}

export function saveUnitLoadout(unitId, loadout) {
  if (!unitId) return;
  loadoutState[unitId] = {
    equipment: { ...(loadout.equipment ?? {}) },
    abilityId: loadout.abilityId ?? null,
    crystalShardId: loadout.crystalShardId ?? null,
  };
  persist();
}
