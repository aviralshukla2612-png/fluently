/**
 * Shadowly / Lingova — Deterministic Daily Learning Plan Engine
 * Phase 5 Daily Practice Generator
 *
 * Generates a stable, date-seeded 4-part daily practice regimen
 * combining speaking, dictation, grammar, and vocabulary.
 */

import { REFERENCE_SENTENCES } from "../../data/sentences.js";
import { DICTATION_EXERCISES } from "../../data/dictation/exercises.js";
import { GRAMMAR_LESSONS } from "../../data/grammar/lessons.js";
import { VOCABULARY_DATASET } from "../../data/vocabulary/words.js";
import { toLocalDateString } from "./progressService.js";

/**
 * Generate a deterministic integer hash from a date string
 */
export function hashDateString(dateStr = "") {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a stable daily plan for the given reference date
 */
export function generateDailyPlan(referenceDate = null) {
  const refDate = referenceDate !== null && referenceDate !== undefined
    ? referenceDate
    : (typeof window !== "undefined" ? new Date() : "2026-01-01");
  const dateStr = toLocalDateString(refDate);
  const seed = hashDateString(dateStr);

  const speakingList = Array.isArray(REFERENCE_SENTENCES) && REFERENCE_SENTENCES.length > 0
    ? REFERENCE_SENTENCES
    : [{ id: "s-default", text: "Practice natural English conversation today." }];

  const dictationList = Array.isArray(DICTATION_EXERCISES) && DICTATION_EXERCISES.length > 0
    ? DICTATION_EXERCISES
    : [{ id: "d-default", category: "Daily Listening", text: "Listen carefully and transcribe." }];

  const grammarList = Array.isArray(GRAMMAR_LESSONS) && GRAMMAR_LESSONS.length > 0
    ? GRAMMAR_LESSONS
    : [{ id: "g-default", title: "Present Simple", difficulty: "beginner" }];

  const vocabList = Array.isArray(VOCABULARY_DATASET) && VOCABULARY_DATASET.length > 0
    ? VOCABULARY_DATASET
    : [{ id: "v-default", word: "Confidence" }];

  const speaking = speakingList[seed % speakingList.length];
  const dictation = dictationList[(seed + 1) % dictationList.length];
  const grammar = grammarList[(seed + 2) % grammarList.length];
  const vocab1 = vocabList[(seed + 3) % vocabList.length];
  const vocab2 = vocabList[(seed + 4) % vocabList.length];
  const vocab3 = vocabList[(seed + 5) % vocabList.length];

  return {
    planId: `plan_${dateStr}`,
    date: dateStr,
    tasks: [
      {
        id: "task-speaking",
        module: "speaking",
        title: "Speaking Shadowing",
        subtitle: `Drill: "${speaking.text.slice(0, 32)}..."`,
        exerciseId: speaking.id,
        href: "/say-it",
        estimatedMinutes: 3,
      },
      {
        id: "task-dictation",
        module: "dictation",
        title: "Dictation Listening",
        subtitle: `Drill: ${dictation.category}`,
        exerciseId: dictation.id,
        href: "/dictation",
        estimatedMinutes: 4,
      },
      {
        id: "task-grammar",
        module: "grammar",
        title: "Grammar Unit",
        subtitle: `Lesson: ${grammar.title}`,
        exerciseId: grammar.id,
        href: "/grammar",
        estimatedMinutes: 5,
      },
      {
        id: "task-vocabulary",
        module: "vocabulary",
        title: "Vocabulary Recall",
        subtitle: `Target words: ${vocab1.word}, ${vocab2.word}, ${vocab3.word}`,
        exerciseId: vocab1.id,
        targetWordIds: [vocab1.id, vocab2.id, vocab3.id],
        href: "/vocabulary",
        estimatedMinutes: 3,
      },
    ],
  };
}

/**
 * Check which tasks of a daily plan have been completed based on recorded activities
 */
export function evaluatePlanProgress(plan, activities = [], referenceDate = null) {
  if (!plan || !Array.isArray(plan.tasks)) {
    return { tasksWithStatus: [], completedCount: 0, totalCount: 0, percentage: 0 };
  }

  const refDate = referenceDate !== null && referenceDate !== undefined
    ? referenceDate
    : (typeof window !== "undefined" ? new Date() : "2026-01-01");
  const todayStr = toLocalDateString(refDate);

  // Filter activities completed on the plan's date
  const todayActivities = activities.filter(
    (act) => act.status === "completed" && toLocalDateString(act.timestamp) === todayStr
  );

  const tasksWithStatus = plan.tasks.map((task) => {
    let isCompleted = false;

    if (task.module === "vocabulary") {
      // Completed if any vocabulary review occurred today
      isCompleted = todayActivities.some((act) => act.module === "vocabulary");
    } else {
      // Completed if any activity in this module (or matching exercise) was completed today
      isCompleted = todayActivities.some((act) => act.module === task.module);
    }

    return {
      ...task,
      isCompleted,
    };
  });

  const completedCount = tasksWithStatus.filter((t) => t.isCompleted).length;
  const totalCount = tasksWithStatus.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    tasksWithStatus,
    completedCount,
    totalCount,
    percentage,
  };
}

// Re-export adaptive daily plan engine from Phase 7
export {
  generateAdaptiveDailyPlan,
  evaluateAdaptivePlan,
  ALLOWED_TIME_BUDGETS,
  DEFAULT_TIME_BUDGET,
} from "./dailyLearningPlan.js";
