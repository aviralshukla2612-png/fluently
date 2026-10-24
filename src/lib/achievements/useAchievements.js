"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/useAuth.js";
import { useProgress } from "@/lib/learning/useProgress.js";
import { computeLearningAnalytics } from "@/lib/learning/learningAnalytics.js";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/learning/storage.js";
import { evaluateAchievements } from "@/lib/achievements/achievementEngine.js";

export function useAchievements() {
  const { isAuthenticated } = useAuth();
  const { activities, streak } = useProgress();
  const [data, setData] = useState({
    achievements: [],
    totalPoints: 0,
    unlockedCount: 0,
    totalCount: 0,
    newlyUnlocked: [],
  });
  const [activeToast, setActiveToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const analytics = useMemo(() => computeLearningAnalytics(activities), [activities]);

  const loadAchievements = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const res = await fetch("/api/learning/achievements", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setData(json);
          if (Array.isArray(json.newlyUnlocked) && json.newlyUnlocked.length > 0) {
            setActiveToast(json.newlyUnlocked[0]);
          }
        }
      } catch (err) {
        console.warn("[useAchievements] Cloud fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Guest local evaluation
      await Promise.resolve();
      const localUnlocked = getItem(STORAGE_KEYS.ACHIEVEMENTS, []);
      const evalResult = evaluateAchievements(activities, analytics, streak, localUnlocked);

      setData({
        achievements: evalResult.achievements,
        totalPoints: evalResult.totalPoints,
        unlockedCount: evalResult.unlockedCount,
        totalCount: evalResult.totalCount,
        newlyUnlocked: evalResult.newlyUnlocked,
      });

      if (evalResult.newlyUnlocked.length > 0) {
        // Save new unlocks locally for guest
        const updatedUnlocked = [
          ...localUnlocked,
          ...evalResult.newlyUnlocked.map((a) => ({
            achievementId: a.id,
            unlockedAt: a.unlockedAt,
            points: a.points,
          })),
        ];
        setItem(STORAGE_KEYS.ACHIEVEMENTS, updatedUnlocked);
        setActiveToast(evalResult.newlyUnlocked[0]);
      }

      setIsLoading(false);
    }
  }, [isAuthenticated, activities, analytics, streak]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await loadAchievements();
    };
    if (active) {
      run();
    }
    return () => {
      active = false;
    };
  }, [loadAchievements]);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  return {
    ...data,
    isLoading,
    activeToast,
    dismissToast,
    refreshAchievements: loadAchievements,
  };
}
