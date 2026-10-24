/**
 * Shadowly — Weekly Learning Review Engine
 * Phase 8 Learning Engagement & Milestones
 *
 * Aggregates weekly learning activity, computes comparative skill metrics,
 * identifies improvements, and proposes evidence-based focus recommendations.
 */

import { toLocalDateString, calculateStreak } from "./progressService.js";
import { calculateAverageScore, calculateTotalDurationSeconds } from "./learningAnalytics.js";
import { detectWeaknesses } from "./weaknessDetector.js";
import { generateRecommendations } from "./learningRecommendations.js";
import { getCalendarWeekRange } from "../goals/goalManager.js";

/**
 * Generate a complete weekly learning review report
 *
 * @param {Array} activities - All recorded activities
 * @param {Object} options
 * @param {Date|string} [options.referenceDate] - Target date for the week
 * @param {number} [options.weekOffset] - 0 for current week, 1 for previous week, etc.
 * @returns {Object} Weekly review report
 */
export function generateWeeklyReview(activities = [], options = {}) {
  const baseRef = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const offset = Number(options.weekOffset) || 0;

  // Shift reference date by offset weeks (7 days * offset)
  const targetDate = new Date(baseRef);
  targetDate.setDate(targetDate.getDate() - offset * 7);

  const currentWeekRange = getCalendarWeekRange(targetDate);

  // Previous week range for comparative metrics
  const prevWeekDate = new Date(targetDate);
  prevWeekDate.setDate(prevWeekDate.getDate() - 7);
  const prevWeekRange = getCalendarWeekRange(prevWeekDate);

  const safeActivities = Array.isArray(activities)
    ? activities.filter((a) => a && typeof a === "object" && a.status === "completed" && a.timestamp)
    : [];

  // Filter activities into current week and prior week
  const weekActivities = safeActivities.filter((a) => {
    const t = new Date(a.timestamp).getTime();
    return t >= currentWeekRange.startTime && t <= currentWeekRange.endTime;
  });

  const prevWeekActivities = safeActivities.filter((a) => {
    const t = new Date(a.timestamp).getTime();
    return t >= prevWeekRange.startTime && t <= prevWeekRange.endTime;
  });

  // Overview metrics
  const totalCompleted = weekActivities.length;
  const totalDurationSec = calculateTotalDurationSeconds(weekActivities);
  const totalMinutes = Math.round((totalDurationSec / 60) * 10) / 10;

  const uniqueDays = Array.from(new Set(weekActivities.map((a) => toLocalDateString(a.timestamp)))).sort();
  const practiceDaysCount = uniqueDays.length;

  const streakInfo = calculateStreak(safeActivities, targetDate);

  // Skill-level breakdowns
  const modules = ["speaking", "dictation", "grammar", "vocabulary", "conversation"];
  const skillSummaries = {};
  const improvements = [];
  const declines = [];
  const stable = [];

  for (const mod of modules) {
    const modActs = weekActivities.filter((a) => a.module === mod);
    const prevModActs = prevWeekActivities.filter((a) => a.module === mod);

    const count = modActs.length;
    const avgScore = calculateAverageScore(modActs);
    const prevAvgScore = calculateAverageScore(prevModActs);

    let trend = "insufficient_data";
    let scoreChange = null;

    if (avgScore !== null && prevAvgScore !== null) {
      scoreChange = Math.round((avgScore - prevAvgScore) * 10) / 10;
      if (scoreChange >= 3) {
        trend = "improving";
        improvements.push({ module: mod, change: scoreChange, currentScore: avgScore, previousScore: prevAvgScore });
      } else if (scoreChange <= -3) {
        trend = "declining";
        declines.push({ module: mod, change: scoreChange, currentScore: avgScore, previousScore: prevAvgScore });
      } else {
        trend = "stable";
        stable.push({ module: mod, change: scoreChange, currentScore: avgScore, previousScore: prevAvgScore });
      }
    }

    skillSummaries[mod] = {
      module: mod,
      drillsCount: count,
      averageScore: avgScore,
      previousAverageScore: prevAvgScore,
      scoreChange,
      trend,
    };
  }

  // Next week's suggested focus (from detected weaknesses)
  const detectedWeaknesses = detectWeaknesses(weekActivities.length > 0 ? weekActivities : safeActivities);
  const recommendations = generateRecommendations(detectedWeaknesses);
  const nextWeekFocus = recommendations.slice(0, 3);

  const hasActivity = totalCompleted > 0;

  return {
    weekRange: {
      startDate: currentWeekRange.startStr,
      endDate: currentWeekRange.endStr,
      label: `${currentWeekRange.startStr} to ${currentWeekRange.endStr}`,
      offset,
      isCurrentWeek: offset === 0,
    },
    overview: {
      hasActivity,
      totalCompletedActivities: totalCompleted,
      totalPracticeMinutes: totalMinutes,
      activeDaysCount: practiceDaysCount,
      activeDaysList: uniqueDays,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      priorWeekCompletedActivities: prevWeekActivities.length,
    },
    skillSummaries,
    analysis: {
      improvements,
      declines,
      stable,
      summaryText: hasActivity
        ? `You completed ${totalCompleted} learning drills across ${practiceDaysCount} day${practiceDaysCount === 1 ? "" : "s"} totaling ${totalMinutes} active minutes.`
        : "No learning activity was recorded during this calendar week.",
    },
    nextWeekFocus,
  };
}
