"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  getItem,
  subscribeToStorage,
  STORAGE_KEYS,
} from "./storage.js";
import {
  recordActivity,
  calculateStreak,
  calculateModuleStats,
  getWeeklyActivity,
} from "./progressService.js";

/**
 * React hook to consume and reactively update learning progress
 */
export function useProgress() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activities, setActivities] = useState([]);
  const [, startTransition] = useTransition();

  const loadData = useCallback(() => {
    const storedActivities = getItem(STORAGE_KEYS.ACTIVITIES, []);
    const safeActivities = Array.isArray(storedActivities) ? storedActivities : [];
    startTransition(() => {
      setActivities(safeActivities);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to storage changes across components and browser windows
    const unsubscribe = subscribeToStorage((key) => {
      if (!key || key === STORAGE_KEYS.ACTIVITIES) {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const logActivity = useCallback((activityInput) => {
    try {
      const record = recordActivity(activityInput);
      loadData();
      return record;
    } catch (err) {
      console.error("[useProgress] Failed to record activity:", err);
      return null;
    }
  }, [loadData]);

  // Derived metrics (safe before client load with sensible initial defaults)
  const streak = isLoaded
    ? calculateStreak(activities)
    : { currentStreak: 0, longestStreak: 0, hasPracticedToday: false, activeDaysCount: 0 };
  const stats = calculateModuleStats(activities);
  const weeklyActivity = isLoaded ? getWeeklyActivity(activities) : [];

  return {
    isLoaded,
    activities,
    streak,
    stats,
    weeklyActivity,
    logActivity,
    refreshProgress: loadData,
  };
}
