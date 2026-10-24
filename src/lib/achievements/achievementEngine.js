/**
 * Shadowly — Achievement Evaluation Engine
 * Phase 8 Learning Engagement & Milestones
 *
 * Deterministically evaluates achievement unlocks and milestone progress
 * based on verified learning activity and analytics history.
 */

import { ACHIEVEMENT_CATALOG } from "./achievementCatalog.js";
import { calculateStreak } from "../learning/progressService.js";
import { computeLearningAnalytics } from "../learning/learningAnalytics.js";

/**
 * Calculate total points earned from a list of achievements
 *
 * @param {Array} achievements - List of achievement objects
 * @returns {number} Sum of points for unlocked achievements
 */
export function calculateTotalPoints(achievements = []) {
  if (!Array.isArray(achievements)) return 0;
  return achievements.reduce((sum, a) => {
    return a && a.isUnlocked ? sum + (Number(a.points) || 0) : sum;
  }, 0);
}

/**
 * Evaluate all catalog achievements against user activity records
 * Supports both named parameter object or positional arguments:
 * (activities, analytics, streak, unlockedAchievements, referenceDate)
 */
export function evaluateAchievements(arg1 = {}, arg2 = null, arg3 = null, arg4 = [], arg5 = null) {
  let activities = [];
  let unlockedAchievements = [];
  let analytics = null;
  let streak = null;
  let referenceDate = null;

  if (Array.isArray(arg1)) {
    // Positional style: (activities, analytics, streak, unlockedAchievements, referenceDate)
    activities = arg1;
    analytics = arg2;
    streak = arg3;
    unlockedAchievements = Array.isArray(arg4) ? arg4 : [];
    referenceDate = arg5;
  } else if (arg1 && typeof arg1 === "object") {
    // Named object style: { activities, unlockedAchievements, analytics, streak, referenceDate }
    activities = arg1.activities || [];
    unlockedAchievements = arg1.unlockedAchievements || [];
    analytics = arg1.analytics || null;
    streak = arg1.streak || null;
    referenceDate = arg1.referenceDate || null;
  }
  const safeActivities = Array.isArray(activities)
    ? activities.filter((a) => a && typeof a === "object")
    : [];

  const computedStreak = streak || calculateStreak(safeActivities, referenceDate);
  const computedAnalytics = analytics || computeLearningAnalytics(safeActivities, { referenceDate });

  // Map of existing unlocked achievements: achievementId -> record
  const existingMap = new Map();
  if (Array.isArray(unlockedAchievements)) {
    for (const record of unlockedAchievements) {
      if (record && record.achievementId) {
        existingMap.set(record.achievementId, record);
      }
    }
  }

  const allAchievements = [];
  const newlyUnlocked = [];
  let totalPoints = 0;
  let maxPoints = 0;

  for (const item of ACHIEVEMENT_CATALOG) {
    maxPoints += item.points || 0;

    const existingRecord = existingMap.get(item.id);
    const evalResult = item.evaluator({
      activities: safeActivities,
      analytics: computedAnalytics,
      streak: computedStreak,
      referenceDate,
    });

    const isUnlocked = Boolean(existingRecord) || Boolean(evalResult.unlocked);
    const unlockedAt = existingRecord?.unlockedAt || (evalResult.unlocked ? new Date().toISOString() : null);

    if (isUnlocked) {
      totalPoints += item.points || 0;
    }

    if (!existingRecord && evalResult.unlocked) {
      newlyUnlocked.push({
        id: item.id,
        achievementId: item.id,
        name: item.name,
        description: item.description,
        points: item.points,
        category: item.category,
        tier: item.tier,
        icon: item.icon,
        unlockedAt,
      });
    }

    allAchievements.push({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      icon: item.icon,
      tier: item.tier,
      points: item.points,
      hidden: item.hidden && !isUnlocked,
      isUnlocked,
      unlockedAt,
      progress: isUnlocked ? 100 : evalResult.progress || 0,
      current: evalResult.current,
      target: evalResult.target,
      unit: evalResult.unit,
    });
  }

  const unlockedCount = allAchievements.filter((a) => a.isUnlocked).length;

  return {
    achievements: allAchievements,
    allAchievements,
    newlyUnlocked,
    unlockedCount,
    totalCount: ACHIEVEMENT_CATALOG.length,
    totalPoints,
    maxPoints,
    completionPercentage: Math.round((unlockedCount / ACHIEVEMENT_CATALOG.length) * 100),
  };
}
