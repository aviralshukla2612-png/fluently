/**
 * Shadowly / Lingova — Client-side Unified Learning Storage
 * Phase 5 Storage Service
 *
 * Implements versioned, SSR-safe, fault-tolerant local persistence with
 * runtime validation, quota-exceeded pruning, and corrupt-data recovery.
 */

export const STORAGE_VERSION = "v1";

export const STORAGE_KEYS = {
  ACTIVITIES: `shadowly_activities_${STORAGE_VERSION}`,
  VOCAB_PROGRESS: `shadowly_vocab_progress_${STORAGE_VERSION}`,
  VOCAB_SAVED: `shadowly_vocab_saved_${STORAGE_VERSION}`,
  GRAMMAR_PROGRESS: `shadowly_grammar_progress_${STORAGE_VERSION}`,
  DAILY_PLAN: `shadowly_daily_plan_${STORAGE_VERSION}`,
  GOALS: `shadowly_goals_${STORAGE_VERSION}`,
  ACHIEVEMENTS: `shadowly_achievements_${STORAGE_VERSION}`,
  IS_LOGGED_IN: `shadowly_is_logged_in_${STORAGE_VERSION}`,
};

export const MAX_ACTIVITIES = 300;
export const PRUNE_BATCH_SIZE = 50;

// In-memory fallback map for Node tests and non-browser environments
const memoryFallback = new Map();

/**
 * Check if browser localStorage is available
 */
export function isStorageAvailable() {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const testKey = "__shadowly_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse(jsonString, fallback) {
  if (!jsonString || typeof jsonString !== "string") return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.warn("[Shadowly Storage] JSON parse failed, returning fallback:", err);
    return fallback;
  }
}

/**
 * Get item from storage with validation and fallback
 */
export function getItem(key, fallback = null) {
  if (!isStorageAvailable()) {
    return memoryFallback.has(key) ? memoryFallback.get(key) : fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return safeJsonParse(raw, fallback);
  } catch (err) {
    console.warn(`[Shadowly Storage] Failed to get item for key "${key}":`, err);
    return fallback;
  }
}

/**
 * Set item in storage with quota error handling
 */
export function setItem(key, value) {
  if (!isStorageAvailable()) {
    memoryFallback.set(key, value);
    dispatchStorageEvent(key, value);
    return true;
  }
  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    dispatchStorageEvent(key, value);
    return true;
  } catch (err) {
    // QuotaExceededError handling
    if (
      err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22
    ) {
      console.warn("[Shadowly Storage] Quota exceeded. Pruning older activities...");
      pruneOldActivities();
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        dispatchStorageEvent(key, value);
        return true;
      } catch (retryErr) {
        console.error("[Shadowly Storage] Retry failed after pruning:", retryErr);
        return false;
      }
    }
    console.error(`[Shadowly Storage] Failed to set item for key "${key}":`, err);
    return false;
  }
}

/**
 * Remove an item from storage
 */
export function removeItem(key) {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(key);
    dispatchStorageEvent(key, null);
  } catch (err) {
    console.warn(`[Shadowly Storage] Failed to remove key "${key}":`, err);
  }
}

/**
 * Prune oldest activities when storage limits are approached
 */
function pruneOldActivities() {
  const activities = getItem(STORAGE_KEYS.ACTIVITIES, []);
  if (Array.isArray(activities) && activities.length > PRUNE_BATCH_SIZE) {
    // Keep the newest items
    const trimmed = activities.slice(PRUNE_BATCH_SIZE);
    try {
      window.localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(trimmed));
    } catch {
      // If still fails, clear half
      const half = activities.slice(Math.floor(activities.length / 2));
      window.localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(half));
    }
  }
}

/**
 * Dispatch an in-window custom event so sibling components update reactively
 */
function dispatchStorageEvent(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("shadowly:storage_change", {
        detail: { key, value },
      })
    );
  } catch {
    // Ignore event dispatch errors in legacy or non-browser test environments
  }
}

/**
 * Subscribe to storage updates
 */
export function subscribeToStorage(callback) {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (event) => {
    callback(event.detail?.key, event.detail?.value);
  };

  const handleNativeStorage = (event) => {
    if (event.key && Object.values(STORAGE_KEYS).includes(event.key)) {
      callback(event.key, safeJsonParse(event.newValue, null));
    }
  };

  window.addEventListener("shadowly:storage_change", handleCustomEvent);
  window.addEventListener("storage", handleNativeStorage);

  return () => {
    window.removeEventListener("shadowly:storage_change", handleCustomEvent);
    window.removeEventListener("storage", handleNativeStorage);
  };
}
