/**
 * Shadowly / Lingova — Unified Learning Progress Service
 * Phase 5 Progress Tracking Engine
 *
 * Implements deterministic activity recording, streak calculation,
 * module metrics, and weekly activity aggregation.
 */

import {
  getItem,
  setItem,
  STORAGE_KEYS,
  MAX_ACTIVITIES,
} from "./storage.js";

export const VALID_MODULES = ["speaking", "dictation", "grammar", "vocabulary", "conversation", "mock_exam"];
export const VALID_STATUSES = ["completed", "in_progress", "abandoned"];

/**
 * Validate activity schema
 */
export function validateActivity(record) {
  if (!record || typeof record !== "object") {
    return { valid: false, error: "Record must be a valid non-null object" };
  }

  if (!VALID_MODULES.includes(record.module)) {
    return {
      valid: false,
      error: `Invalid module "${record.module}". Must be one of: ${VALID_MODULES.join(", ")}`,
    };
  }

  if (record.status && !VALID_STATUSES.includes(record.status)) {
    return {
      valid: false,
      error: `Invalid status "${record.status}". Must be one of: ${VALID_STATUSES.join(", ")}`,
    };
  }

  if (
    record.score !== undefined &&
    record.score !== null &&
    (typeof record.score !== "number" || isNaN(record.score) || record.score < 0 || record.score > 100)
  ) {
    return {
      valid: false,
      error: "Score must be null or a numeric value between 0 and 100",
    };
  }

  return { valid: true };
}

/**
 * Format a Date to local YYYY-MM-DD
 */
export function toLocalDateString(date = null) {
  const target = date !== null && date !== undefined ? date : (typeof window !== "undefined" ? new Date() : "2026-01-01");
  const d = target instanceof Date ? target : new Date(target);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Record a learning activity in persistent storage
 */
export function recordActivity(activityInput) {
  const validation = validateActivity(activityInput);
  if (!validation.valid) {
    throw new Error(`[ProgressService] Invalid activity: ${validation.error}`);
  }

  const existingActivities = getItem(STORAGE_KEYS.ACTIVITIES, []);
  const safeList = Array.isArray(existingActivities) ? existingActivities : [];

  const activityRecord = {
    id: activityInput.id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    module: activityInput.module,
    exerciseId: String(activityInput.exerciseId || "default"),
    timestamp: activityInput.timestamp || new Date().toISOString(),
    status: activityInput.status || "completed",
    score: typeof activityInput.score === "number" ? Math.round(activityInput.score * 10) / 10 : null,
    duration: typeof activityInput.duration === "number" ? Math.max(0, Math.round(activityInput.duration)) : null,
    difficulty: activityInput.difficulty || "intermediate",
    metadata: activityInput.metadata && typeof activityInput.metadata === "object" ? activityInput.metadata : {},
  };

  // Prevent immediate accidental duplicate submissions (e.g. same exercise within 1 second with identical score)
  const isDuplicate = safeList.some(
    (a) =>
      a.exerciseId === activityRecord.exerciseId &&
      a.module === activityRecord.module &&
      a.score === activityRecord.score &&
      Math.abs(new Date(a.timestamp).getTime() - new Date(activityRecord.timestamp).getTime()) < 1000
  );

  if (isDuplicate) {
    return activityRecord;
  }

  const updatedList = [...safeList, activityRecord];

  // Keep bounded history size
  const boundedList =
    updatedList.length > MAX_ACTIVITIES
      ? updatedList.slice(updatedList.length - MAX_ACTIVITIES)
      : updatedList;

  setItem(STORAGE_KEYS.ACTIVITIES, boundedList);

  // Non-blocking cloud synchronization when user is authenticated
  if (typeof window !== "undefined" && typeof fetch === "function") {
    const isUserLoggedIn = getItem(STORAGE_KEYS.IS_LOGGED_IN, false);
    if (isUserLoggedIn) {
      fetch("/api/user/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityRecord),
      })
        .then((res) => {
          if (res.status === 401) {
            setItem(STORAGE_KEYS.IS_LOGGED_IN, false);
          }
        })
        .catch(() => {
          // Safely retained locally; can be synced anytime via syncLocalData()
        });
    }
  }

  return activityRecord;
}

/**
 * Get all activities with optional filters
 */
export function getActivities(filter = {}) {
  const activities = getItem(STORAGE_KEYS.ACTIVITIES, []);
  if (!Array.isArray(activities)) return [];

  return activities.filter((act) => {
    if (filter.module && act.module !== filter.module) return false;
    if (filter.exerciseId && act.exerciseId !== filter.exerciseId) return false;
    if (filter.status && act.status !== filter.status) return false;
    if (filter.since) {
      const sinceTime = new Date(filter.since).getTime();
      if (new Date(act.timestamp).getTime() < sinceTime) return false;
    }
    return true;
  });
}

export const recordLearningActivity = recordActivity;
export const getLearningActivities = getActivities;

/**
 * Deterministic streak calculation based on local calendar dates
 */
export function calculateStreak(activities = [], referenceDate = null) {
  const refDate = referenceDate !== null && referenceDate !== undefined
    ? referenceDate
    : new Date();
  if (!Array.isArray(activities) || activities.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      hasPracticedToday: false,
      activeDaysCount: 0,
    };
  }

  // Filter to valid completed activities with valid dates
  const qualifyingActivities = activities.filter(
    (act) => act.status === "completed" && act.timestamp
  );

  if (qualifyingActivities.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      hasPracticedToday: false,
      activeDaysCount: 0,
    };
  }

  // Group unique local calendar dates (sorted chronologically)
  const uniqueDateStrings = Array.from(
    new Set(
      qualifyingActivities
        .map((act) => toLocalDateString(act.timestamp))
        .filter(Boolean)
    )
  ).sort();

  const activeDaysCount = uniqueDateStrings.length;

  const todayStr = toLocalDateString(refDate);
  const refDateObj = new Date(refDate);
  const yesterdayObj = new Date(refDateObj);
  yesterdayObj.setDate(refDateObj.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterdayObj);

  const hasPracticedToday = uniqueDateStrings.includes(todayStr);
  const hasPracticedYesterday = uniqueDateStrings.includes(yesterdayStr);

  // Calculate current streak
  let currentStreak = 0;
  if (hasPracticedToday || hasPracticedYesterday) {
    let checkDate = new Date(hasPracticedToday ? refDateObj : yesterdayObj);
    while (true) {
      const checkStr = toLocalDateString(checkDate);
      if (uniqueDateStrings.includes(checkStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest historical streak
  let longestStreak = 0;
  let runningStreak = 0;
  let prevDate = null;

  for (const dateStr of uniqueDateStrings) {
    const currentDate = new Date(dateStr + "T00:00:00");
    if (!prevDate) {
      runningStreak = 1;
    } else {
      const diffMs = currentDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        runningStreak++;
      } else if (diffDays > 1) {
        runningStreak = 1;
      }
    }
    prevDate = currentDate;
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
  }

  return {
    currentStreak,
    longestStreak,
    hasPracticedToday,
    activeDaysCount,
  };
}

/**
 * Calculate comprehensive learning statistics
 */
export function calculateModuleStats(activities = []) {
  const safeList = Array.isArray(activities) ? activities : [];

  const completed = safeList.filter((a) => a.status === "completed");

  const byModule = {
    speaking: completed.filter((a) => a.module === "speaking"),
    dictation: completed.filter((a) => a.module === "dictation"),
    grammar: completed.filter((a) => a.module === "grammar"),
    vocabulary: completed.filter((a) => a.module === "vocabulary"),
    conversation: completed.filter((a) => a.module === "conversation"),
  };

  const getAverageScore = (list) => {
    const scored = list.filter((a) => typeof a.score === "number");
    if (scored.length === 0) return null;
    const sum = scored.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round((sum / scored.length) * 10) / 10;
  };

  // Distinct exercises completed per module
  const distinctSpeaking = new Set(byModule.speaking.map((a) => a.exerciseId)).size;
  const distinctDictation = new Set(byModule.dictation.map((a) => a.exerciseId)).size;
  const distinctGrammar = new Set(byModule.grammar.map((a) => a.exerciseId)).size;
  const distinctVocab = new Set(byModule.vocabulary.map((a) => a.exerciseId)).size;
  const distinctConversation = new Set(byModule.conversation.map((a) => a.exerciseId)).size;

  return {
    totalCompletedActivities: completed.length,
    speaking: {
      totalAttempts: byModule.speaking.length,
      distinctSentences: distinctSpeaking,
      averageScore: getAverageScore(byModule.speaking),
    },
    dictation: {
      totalAttempts: byModule.dictation.length,
      distinctSentences: distinctDictation,
      averageScore: getAverageScore(byModule.dictation),
      perfectCount: byModule.dictation.filter((a) => a.score === 100).length,
    },
    grammar: {
      totalCompleted: byModule.grammar.length,
      distinctLessons: distinctGrammar,
      averageScore: getAverageScore(byModule.grammar),
    },
    vocabulary: {
      totalReviews: byModule.vocabulary.length,
      distinctWordsPracticed: distinctVocab,
      averageScore: getAverageScore(byModule.vocabulary),
    },
    conversation: {
      totalSessions: byModule.conversation.length,
      distinctScenarios: distinctConversation,
      totalExchanges: byModule.conversation.reduce(
        (acc, curr) => acc + (curr.metadata?.exchangesCount || curr.metadata?.messageCount || 0),
        0
      ),
    },
  };
}

/**
 * Generate weekly activity breakdown for the past 7 days
 */
export function getWeeklyActivity(activities = [], referenceDate = null) {
  const refDate = referenceDate !== null && referenceDate !== undefined
    ? referenceDate
    : (typeof window !== "undefined" ? new Date() : new Date("2026-01-01"));
  const safeList = Array.isArray(activities) ? activities : [];
  const completed = safeList.filter((a) => a.status === "completed");

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result = [];

  // Generate 7 days ending at referenceDate
  for (let i = 6; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateString(d);
    const dayLabel = daysOfWeek[d.getDay()];

    const count = completed.filter(
      (act) => toLocalDateString(act.timestamp) === dateStr
    ).length;

    result.push({
      day: dayLabel,
      date: dateStr,
      count,
      height: "0%", // Will be normalized below
    });
  }

  // Determine maximum count for relative height scaling (min max of 5 so small numbers look nice)
  const maxCount = Math.max(5, ...result.map((r) => r.count));

  result.forEach((item) => {
    if (item.count === 0) {
      item.height = "8%"; // Minimal visible baseline
    } else {
      const percentage = Math.min(100, Math.round((item.count / maxCount) * 100));
      item.height = `${Math.max(16, percentage)}%`;
    }
  });

  return result;
}

/**
 * Clear all progress records (useful for debugging/resetting)
 */
export function clearAllProgress() {
  setItem(STORAGE_KEYS.ACTIVITIES, []);
  setItem(STORAGE_KEYS.VOCAB_PROGRESS, {});
  setItem(STORAGE_KEYS.VOCAB_SAVED, []);
  setItem(STORAGE_KEYS.GRAMMAR_PROGRESS, {});
  setItem(STORAGE_KEYS.DAILY_PLAN, null);
}
