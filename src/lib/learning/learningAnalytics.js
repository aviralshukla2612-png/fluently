/**
 * Shadowly — Learning Analytics Engine
 * Phase 7 Learning Intelligence
 *
 * Computes deterministic skill mastery metrics, 7-day vs 30-day performance trends,
 * time spent, and activity distributions from verified learning activity records.
 *
 * NOTE: Pronunciation assessments are strictly labeled as "Speaking Text-Match Accuracy"
 * because the system performs text alignment and WER, not acoustic phonetic analysis.
 */

import { toLocalDateString, calculateStreak } from "./progressService.js";

export const TRACKED_SKILLS = [
  "speaking",
  "dictation",
  "grammar",
  "vocabulary",
  "conversation",
];

export const SKILL_METADATA = {
  speaking: {
    id: "speaking",
    name: "Speaking (Text-Match)",
    category: "Speech & Fluency",
    description: "Speech recognition text-matching accuracy and shadowing repetition.",
    isAcoustic: false,
    disclaimer: "Scored by speech recognition text alignment, not acoustic phonetics.",
    defaultDurationMinutes: 3,
  },
  dictation: {
    id: "dictation",
    name: "Listening & Dictation",
    category: "Listening Comprehension",
    description: "Auditory recognition, spelling precision, and word boundary accuracy.",
    isAcoustic: true,
    disclaimer: null,
    defaultDurationMinutes: 4,
  },
  grammar: {
    id: "grammar",
    name: "Grammar & Structure",
    category: "Syntax & Usage",
    description: "Sentence patterns, tenses, verb agreements, and structural rules.",
    isAcoustic: false,
    disclaimer: null,
    defaultDurationMinutes: 5,
  },
  vocabulary: {
    id: "vocabulary",
    name: "Vocabulary Recall",
    category: "Lexical Retention",
    description: "Active word recall, spaced repetition retention, and meaning matching.",
    isAcoustic: false,
    disclaimer: null,
    defaultDurationMinutes: 3,
  },
  conversation: {
    id: "conversation",
    name: "AI Conversation",
    category: "Applied Communication",
    description: "Interactive turn-taking, open-ended dialogues, and contextual responses.",
    isAcoustic: false,
    disclaimer: null,
    defaultDurationMinutes: 6,
  },
};

/**
 * Filter activities within a given day window relative to referenceDate
 */
export function filterActivitiesByDays(activities = [], days = 7, referenceDate = null) {
  if (!Array.isArray(activities) || activities.length === 0) return [];
  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const startTime = refDate.getTime() - days * 24 * 60 * 60 * 1000;

  return activities.filter((act) => {
    if (!act || !act.timestamp) return false;
    const t = new Date(act.timestamp).getTime();
    if (isNaN(t)) return false;
    return t >= startTime && t <= refDate.getTime() + 60000;
  });
}

/**
 * Calculate average numeric score from an activity list
 */
export function calculateAverageScore(activities = []) {
  if (!Array.isArray(activities) || activities.length === 0) return null;
  const scored = activities.filter(
    (a) => a && typeof a.score === "number" && !isNaN(a.score) && a.score >= 0
  );
  if (scored.length === 0) return null;
  const sum = scored.reduce((acc, curr) => acc + curr.score, 0);
  return Math.round((sum / scored.length) * 10) / 10;
}

/**
 * Calculate total elapsed time in seconds from activity durations
 */
export function calculateTotalDurationSeconds(activities = []) {
  if (!Array.isArray(activities) || activities.length === 0) return 0;
  return activities.reduce((acc, curr) => {
    const dur = curr?.durationSeconds ?? curr?.duration;
    if (typeof dur === "number" && !isNaN(dur) && dur > 0) {
      return acc + Math.round(dur);
    }
    return acc;
  }, 0);
}

/**
 * Compute performance trend comparing recent window vs baseline window
 */
export function computePerformanceTrend(currentWindowActivities = [], previousWindowActivities = []) {
  const currentAvg = calculateAverageScore(currentWindowActivities);
  const previousAvg = calculateAverageScore(previousWindowActivities);

  if (currentAvg === null || previousAvg === null) {
    return {
      status: "insufficient_data",
      change: null,
      direction: "insufficient_data",
      currentScore: currentAvg,
      previousScore: previousAvg,
      message: "Insufficient historical data for trend calculation.",
    };
  }

  const change = Math.round((currentAvg - previousAvg) * 10) / 10;
  let direction = "stable";
  if (change >= 3) direction = "improving";
  else if (change <= -3) direction = "declining";

  return {
    status: "active",
    change,
    direction,
    currentScore: currentAvg,
    previousScore: previousAvg,
    message:
      direction === "improving"
        ? `Improving by +${change}% over previous period.`
        : direction === "declining"
        ? `Lower by ${change}% compared to previous period.`
        : "Performance remains stable.",
  };
}

/**
 * Generate a 7-day timeline for visual performance charts
 */
export function generateTimelineMetrics(activities = [], days = 7, referenceDate = null) {
  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const safeList = Array.isArray(activities) ? activities.filter((a) => a.status === "completed") : [];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const timeline = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateString(d);
    const dayLabel = daysOfWeek[d.getDay()];

    const dayActivities = safeList.filter(
      (a) => toLocalDateString(a.timestamp) === dateStr
    );

    const count = dayActivities.length;
    const avgScore = calculateAverageScore(dayActivities);
    const durationSec = calculateTotalDurationSeconds(dayActivities);

    timeline.push({
      date: dateStr,
      day: dayLabel,
      count,
      averageScore: avgScore,
      durationMinutes: Math.round((durationSec / 60) * 10) / 10,
    });
  }

  return timeline;
}

/**
 * Main Centralized Analytics Calculator
 *
 * @param {Array} activities - Raw learning activity objects (from DB or localStorage)
 * @param {Object} options - Options { referenceDate }
 * @returns {Object} Full learning analytics report
 */
export function computeLearningAnalytics(activities = [], options = {}) {
  const refDate = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const safeActivities = Array.isArray(activities)
    ? activities.filter((a) => a && typeof a === "object")
    : [];

  // Filter completed activities
  const completed = safeActivities.filter((a) => a.status === "completed");

  // Streak & Active Days
  const streakInfo = calculateStreak(completed, refDate);

  // Time windows
  const act7d = filterActivitiesByDays(completed, 7, refDate);
  const act14_7d = completed.filter((a) => {
    if (!a.timestamp) return false;
    const t = new Date(a.timestamp).getTime();
    const t7d = refDate.getTime() - 7 * 24 * 60 * 60 * 1000;
    const t14d = refDate.getTime() - 14 * 24 * 60 * 60 * 1000;
    return t >= t14d && t < t7d;
  });
  const act30d = filterActivitiesByDays(completed, 30, refDate);

  // Overall metrics
  const totalDurationSeconds = calculateTotalDurationSeconds(completed);
  const overallAverageScore = calculateAverageScore(completed);
  const recent7dAverageScore = calculateAverageScore(act7d);
  const recent30dAverageScore = calculateAverageScore(act30d);
  const overallTrend = computePerformanceTrend(act7d, act14_7d);

  // Per-skill breakdown
  const skills = {};
  for (const skillKey of TRACKED_SKILLS) {
    const meta = SKILL_METADATA[skillKey];
    const skillAll = completed.filter((a) => a.module === skillKey);
    const skill7d = act7d.filter((a) => a.module === skillKey);
    const skillPrior7d = act14_7d.filter((a) => a.module === skillKey);

    const attemptsCount = skillAll.length;
    const avgScore = calculateAverageScore(skillAll);
    const avgScore7d = calculateAverageScore(skill7d);
    const durationSeconds = calculateTotalDurationSeconds(skillAll);
    const trend = computePerformanceTrend(skill7d, skillPrior7d);

    const latestActivity = skillAll
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] || null;

    skills[skillKey] = {
      skill: skillKey,
      name: meta.name,
      category: meta.category,
      description: meta.description,
      isAcoustic: meta.isAcoustic,
      disclaimer: meta.disclaimer,
      attempts: attemptsCount,
      averageScore: avgScore,
      recent7dAverageScore: avgScore7d,
      totalDurationSeconds: durationSeconds,
      totalDurationMinutes: Math.round((durationSeconds / 60) * 10) / 10,
      lastPracticed: latestActivity ? latestActivity.timestamp : null,
      status: attemptsCount >= 2 ? "active" : attemptsCount === 1 ? "learning" : "insufficient_data",
      trend,
    };
  }

  // 7-day timeline for charts
  const timeline7d = generateTimelineMetrics(completed, 7, refDate);

  return {
    referenceDate: toLocalDateString(refDate),
    summary: {
      totalCompletedActivities: completed.length,
      totalDurationSeconds,
      totalDurationMinutes: Math.round((totalDurationSeconds / 60) * 10) / 10,
      overallAverageScore,
      recent7dAverageScore,
      recent30dAverageScore,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      hasPracticedToday: streakInfo.hasPracticedToday,
      activeDaysCount: streakInfo.activeDaysCount,
      overallTrend,
      hasSufficientData: completed.length >= 3,
    },
    skills,
    timeline7d,
  };
}
