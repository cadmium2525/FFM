const SUSPEND_STORAGE_KEY = 'ff-crystal-rush-suspend-v1';

export const SUSPEND_SAVE_VERSION = 1;

function storageOrNull(storage) {
  try {
    return storage ?? globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
export function readSuspendSave(storage) {
  try {
    const target = storageOrNull(storage);
    if (!target) return null;
    const parsed = JSON.parse(target.getItem(SUSPEND_STORAGE_KEY) || 'null');
    if (!parsed || parsed.version !== SUSPEND_SAVE_VERSION) return null;
    if (!['battle', 'intermission'].includes(parsed.screen)) return null;
    if (!Number.isInteger(parsed.bossIndex) || !Array.isArray(parsed.livingParty)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSuspendSave(snapshot, storage) {
  try {
    const target = storageOrNull(storage);
    if (!target || !snapshot) return false;
    target.setItem(SUSPEND_STORAGE_KEY, JSON.stringify({
      ...snapshot,
      version: SUSPEND_SAVE_VERSION,
      savedAt: Date.now(),
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearSuspendSave(storage) {
  try {
    const target = storageOrNull(storage);
    if (!target) return false;
    target.removeItem(SUSPEND_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
