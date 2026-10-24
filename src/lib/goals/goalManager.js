/**
 * Shadowly — Learning Goals Engine
 * Phase 8 Learning Engagement & Milestones
 *
 * Implements deterministic goal creation, validation, progress calculation,
 * and status transitions using verified learning activity records.
 */

import { toLocalDateString } from "../learning/progressService.js";

export const GOAL_TYPES = {
  DAILY_MINUTES: "daily_minutes",
  WEEKLY_MINUTES: "weekly_minutes",
  DAILY_ACTIVITIES: "daily_activities",
  WEEKLY_ACTIVITIES: "weekly_activities",
  WEEKLY_DAYS: "weekly_days",
  SKILL_ACTIVITIES: "skill_activities",
};

export const SUPPORTED_SKILLS = [
  "speaking",
  "dictation",
  "grammar",
  "vocabulary",
  "conversation",
];

export const GOAL_TYPE_CONFIG = {
  daily_minutes: {
    name: "Daily Practice Time",
    unit: "minutes",
    period: "daily",
    defaultTarget: 15,
    min: 5,
    max: 180,
    description: "Total active practice minutes completed in a single day.",
  },
  weekly_minutes: {
    name: "Weekly Practice Time",
    unit: "minutes",
    period: "weekly",
    defaultTarget: 60,
    min: 15,
    max: 1200,
    description: "Total active practice minutes completed across the current week.",
  },
  daily_activities: {
    name: "Daily Completed Drills",
    unit: "activities",
    period: "daily",
    defaultTarget: 4,
    min: 1,
    max: 50,
    description: "Number of verified completed exercises in a single day.",
  },
  weekly_activities: {
    name: "Weekly Completed Drills",
    unit: "activities",
    period: "weekly",
    defaultTarget: 20,
    min: 3,
    max: 200,
    description: "Number of verified completed exercises across the current week.",
  },
  weekly_days: {
    name: "Weekly Consistency",
    unit: "days",
    period: "weekly",
    defaultTarget: 5,
    min: 1,
    max: 7,
    description: "Number of distinct calendar days with completed learning activity.",
  },
  skill_activities: {
    name: "Skill-Specific Drills",
    unit: "activities",
    period: "weekly",
    defaultTarget: 5,
    min: 1,
    max: 50,
    description: "Weekly drills focused on a specific core competency.",
  },
};

/**
 * Validate goal input payload
 */
export function validateGoalInput(input) {
  if (!input || typeof input !== "object") {
    const error = "Goal payload must be a non-null object.";
    return { valid: false, isValid: false, error, errors: [{ field: "payload", message: error }] };
  }

  const { goalType, targetValue, skill } = input;

  if (!goalType || !GOAL_TYPE_CONFIG[goalType]) {
    const error = `Invalid goal type "${goalType}". Must be one of: ${Object.keys(GOAL_TYPE_CONFIG).join(", ")}`;
    return {
      valid: false,
      isValid: false,
      error,
      errors: [{ field: "goalType", message: error }],
    };
  }

  const config = GOAL_TYPE_CONFIG[goalType];
  const numValue = Number(targetValue);

  if (isNaN(numValue) || !Number.isInteger(numValue) || numValue < config.min || numValue > config.max) {
    const error = `Target value for ${config.name} must be an integer between ${config.min} and ${config.max} ${config.unit}.`;
    return {
      valid: false,
      isValid: false,
      error,
      errors: [{ field: "targetValue", message: error }],
    };
  }

  if (goalType === GOAL_TYPES.SKILL_ACTIVITIES) {
    if (!skill || !SUPPORTED_SKILLS.includes(skill)) {
      const error = `Skill-specific goal requires a valid skill: ${SUPPORTED_SKILLS.join(", ")}.`;
      return {
        valid: false,
        isValid: false,
        error,
        errors: [{ field: "skill", message: error }],
      };
    }
  } else if (skill && !SUPPORTED_SKILLS.includes(skill)) {
    const error = `Invalid skill "${skill}". Must be one of: ${SUPPORTED_SKILLS.join(", ")}`;
    return {
      valid: false,
      isValid: false,
      error,
      errors: [{ field: "skill", message: error }],
    };
  }

  return { valid: true, isValid: true, errors: [] };
}

/**
 * Get start and end dates for the calendar week containing referenceDate (Monday - Sunday)
 */
export function getCalendarWeekRange(referenceDate = null) {
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const day = ref.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    startStr: toLocalDateString(monday),
    endStr: toLocalDateString(sunday),
    startTime: monday.getTime(),
    endTime: sunday.getTime(),
  };
}

/**
 * Calculate progress for a specific learning goal based on actual activities
 *
 * @param {Object} goal - Goal record
 * @param {Array} activities - List of completed activities
 * @param {Date|string} referenceDate - Reference date
 * @returns {Object} Goal progress object
 */
export function calculateGoalProgress(goal, activities = [], referenceDate = null) {
  if (!goal || !goal.goalType) {
    return {
      current: 0,
      target: 0,
      percentage: 0,
      isCompleted: false,
      status: "not_started",
      unit: "units",
    };
  }

  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const todayStr = toLocalDateString(refDate);
  const weekRange = getCalendarWeekRange(refDate);

  const safeActivities = Array.isArray(activities)
    ? activities.filter((a) => a && typeof a === "object" && a.status === "completed" && a.timestamp)
    : [];

  let current = 0;
  const target = Number(goal.targetValue) || 1;

  if (goal.goalType === GOAL_TYPES.DAILY_MINUTES) {
    const todayActs = safeActivities.filter((a) => toLocalDateString(a.timestamp) === todayStr);
    const totalSec = todayActs.reduce((acc, curr) => acc + (Number(curr.durationSeconds ?? curr.duration) || 0), 0);
    current = Math.round((totalSec / 60) * 10) / 10;
  } else if (goal.goalType === GOAL_TYPES.WEEKLY_MINUTES) {
    const weekActs = safeActivities.filter((a) => {
      const t = new Date(a.timestamp).getTime();
      return t >= weekRange.startTime && t <= weekRange.endTime;
    });
    const totalSec = weekActs.reduce((acc, curr) => acc + (Number(curr.durationSeconds ?? curr.duration) || 0), 0);
    current = Math.round((totalSec / 60) * 10) / 10;
  } else if (goal.goalType === GOAL_TYPES.DAILY_ACTIVITIES) {
    const todayActs = safeActivities.filter((a) => toLocalDateString(a.timestamp) === todayStr);
    current = todayActs.length;
  } else if (goal.goalType === GOAL_TYPES.WEEKLY_ACTIVITIES) {
    const weekActs = safeActivities.filter((a) => {
      const t = new Date(a.timestamp).getTime();
      return t >= weekRange.startTime && t <= weekRange.endTime;
    });
    current = weekActs.length;
  } else if (goal.goalType === GOAL_TYPES.WEEKLY_DAYS) {
    const weekActs = safeActivities.filter((a) => {
      const t = new Date(a.timestamp).getTime();
      return t >= weekRange.startTime && t <= weekRange.endTime;
    });
    const uniqueDays = new Set(weekActs.map((a) => toLocalDateString(a.timestamp)));
    current = uniqueDays.size;
  } else if (goal.goalType === GOAL_TYPES.SKILL_ACTIVITIES) {
    const weekActs = safeActivities.filter((a) => {
      if (goal.skill && a.module !== goal.skill) return false;
      const t = new Date(a.timestamp).getTime();
      return t >= weekRange.startTime && t <= weekRange.endTime;
    });
    current = weekActs.length;
  }

  const percentage = Math.min(100, Math.round((current / target) * 100));
  const isCompleted = goal.status !== "paused" && current >= target;

  let computedStatus = "not_started";
  if (goal.status === "paused") {
    computedStatus = "paused";
  } else if (isCompleted) {
    computedStatus = "completed";
  } else if (current > 0) {
    computedStatus = "in_progress";
  }

  return {
    goalId: goal.id,
    goalType: goal.goalType,
    skill: goal.skill || null,
    current,
    target,
    percentage,
    isCompleted,
    status: computedStatus,
    targetUnit: goal.targetUnit || GOAL_TYPE_CONFIG[goal.goalType]?.unit || "units",
  };
}

/**
 * Evaluate progress for a list of goals
 */
export function evaluateAllGoals(goals = [], activities = [], referenceDate = null) {
  if (!Array.isArray(goals)) return [];

  return goals.map((goal) => {
    const progress = calculateGoalProgress(goal, activities, referenceDate);
    const config = GOAL_TYPE_CONFIG[goal.goalType] || {};

    return {
      ...goal,
      title: config.name || "Learning Goal",
      description: config.description || "",
      progress,
    };
  });
}
