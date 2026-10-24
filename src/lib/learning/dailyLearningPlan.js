/**
 * Shadowly — Adaptive Daily Learning Plan Engine
 * Phase 7 Learning Intelligence
 *
 * Generates an adaptive, time-budgeted daily learning plan prioritized by
 * verified learner weaknesses, recent activity, and user preferences.
 *
 * Supported Daily Time Budgets: 5, 10, 15, 20, 30 minutes (default: 15).
 */

import { REFERENCE_SENTENCES } from "../../data/sentences.js";
import { DICTATION_EXERCISES } from "../../data/dictation/exercises.js";
import { GRAMMAR_LESSONS } from "../../data/grammar/lessons.js";
import { VOCABULARY_DATASET } from "../../data/vocabulary/words.js";
import { toLocalDateString } from "./progressService.js";

export const ALLOWED_TIME_BUDGETS = [5, 10, 15, 20, 30];
export const DEFAULT_TIME_BUDGET = 15;

/**
 * Generate a deterministic integer hash from a date string and optional salt
 */
export function hashString(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generate an adaptive daily plan based on weaknesses, time budget, and activity history
 *
 * @param {Object} params
 * @param {Array} params.activities - Recent learning activities
 * @param {Array} params.weaknesses - Detected weaknesses from detectWeaknesses()
 * @param {number} params.targetMinutes - Learner's time budget (5, 10, 15, 20, 30)
 * @param {Date|string} params.referenceDate - Reference date (defaults to today)
 * @returns {Object} Adaptive daily plan
 */
export function generateAdaptiveDailyPlan({
  activities = [],
  weaknesses = [],
  goals = [],
  targetMinutes = DEFAULT_TIME_BUDGET,
  referenceDate = null,
} = {}) {
  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const dateStr = toLocalDateString(refDate);
  const seed = hashString(dateStr);

  const safeBudget = ALLOWED_TIME_BUDGETS.includes(Number(targetMinutes))
    ? Number(targetMinutes)
    : DEFAULT_TIME_BUDGET;

  const safeActivities = Array.isArray(activities) ? activities : [];
  const safeWeaknesses = Array.isArray(weaknesses) ? weaknesses : [];
  const safeGoals = Array.isArray(goals) ? goals.filter((g) => g && g.status === "active") : [];

  const goalSkills = new Set(safeGoals.map((g) => g.skill).filter(Boolean));

  const isStarterPlan = safeActivities.filter((a) => a.status === "completed").length < 2;

  // Curated datasets with fallbacks
  const speakingList = Array.isArray(REFERENCE_SENTENCES) && REFERENCE_SENTENCES.length > 0
    ? REFERENCE_SENTENCES
    : [{ id: "sent-01", text: "I would like to improve my English." }];

  const dictationList = Array.isArray(DICTATION_EXERCISES) && DICTATION_EXERCISES.length > 0
    ? DICTATION_EXERCISES
    : [{ id: "dict-b1", category: "Everyday Requests", text: "Could you please pass the water bottle?" }];

  const grammarList = Array.isArray(GRAMMAR_LESSONS) && GRAMMAR_LESSONS.length > 0
    ? GRAMMAR_LESSONS
    : [{ id: "gram-b-pres-simple", title: "Present Simple", difficulty: "beginner" }];

  const vocabList = Array.isArray(VOCABULARY_DATASET) && VOCABULARY_DATASET.length > 0
    ? VOCABULARY_DATASET
    : [{ id: "v-default", word: "Confidence" }];

  // Find top weaknesses by skill
  const grammarWeakness = safeWeaknesses.find((w) => w.skill === "grammar");
  const vocabWeakness = safeWeaknesses.find((w) => w.skill === "vocabulary");
  const dictationWeakness = safeWeaknesses.find((w) => w.skill === "dictation");
  const speakingWeakness = safeWeaknesses.find((w) => w.skill === "speaking");

  // Pick target grammar lesson (target weakness lesson if detected)
  let targetGrammar = null;
  if (grammarWeakness && grammarWeakness.exerciseId) {
    targetGrammar = grammarList.find((g) => g.id === grammarWeakness.exerciseId) || null;
  }
  if (!targetGrammar) {
    targetGrammar = grammarList[(seed + 2) % grammarList.length];
  }

  // Pick target speaking phrase
  const targetSpeaking = speakingList[seed % speakingList.length];

  // Pick target dictation exercise
  const targetDictation = dictationList[(seed + 1) % dictationList.length];

  // Pick target vocabulary words
  const vocab1 = vocabList[(seed + 3) % vocabList.length];
  const vocab2 = vocabList[(seed + 4) % vocabList.length];
  const vocab3 = vocabList[(seed + 5) % vocabList.length];

  const hasGrammarGoal = goalSkills.has("grammar");
  const hasSpeakingGoal = goalSkills.has("speaking");
  const hasDictationGoal = goalSkills.has("dictation");
  const hasVocabGoal = goalSkills.has("vocabulary");
  const hasConvGoal = goalSkills.has("conversation");

  // Candidate pool of potential tasks
  const candidateTasks = [
    {
      id: "task-grammar",
      module: "grammar",
      title: grammarWeakness ? `Master ${targetGrammar.title}` : "Grammar Core Practice",
      subtitle: `Lesson: ${targetGrammar.title}`,
      exerciseId: targetGrammar.id,
      href: `/grammar?lesson=${targetGrammar.id}`,
      estimatedMinutes: 5,
      priority: grammarWeakness || hasGrammarGoal ? "high" : "medium",
      reason: grammarWeakness
        ? `Focus Area: ${grammarWeakness.evidence}`
        : hasGrammarGoal
        ? "Active Goal: Aligned with your grammar target."
        : "Build structured accuracy with essential grammar rules.",
    },
    {
      id: "task-speaking",
      module: "speaking",
      title: "Speech Shadowing Repetition",
      subtitle: `Drill: "${targetSpeaking.text.slice(0, 32)}..."`,
      exerciseId: targetSpeaking.id,
      href: "/say-it",
      estimatedMinutes: 3,
      priority: speakingWeakness || hasSpeakingGoal ? "high" : "medium",
      reason: speakingWeakness
        ? `Focus Area: ${speakingWeakness.evidence}`
        : hasSpeakingGoal
        ? "Active Goal: Aligned with your speaking target."
        : "Improve pronunciation cadence and natural rhythm.",
    },
    {
      id: "task-dictation",
      module: "dictation",
      title: "Ear Training Dictation",
      subtitle: `Topic: ${targetDictation.category}`,
      exerciseId: targetDictation.id,
      href: "/dictation",
      estimatedMinutes: 4,
      priority: dictationWeakness || hasDictationGoal ? "high" : "medium",
      reason: dictationWeakness
        ? `Focus Area: ${dictationWeakness.evidence}`
        : hasDictationGoal
        ? "Active Goal: Aligned with your listening target."
        : "Train ear-to-word recognition and spelling accuracy.",
    },
    {
      id: "task-vocabulary",
      module: "vocabulary",
      title: vocabWeakness ? `Review Missed Words` : "Vocabulary Recall",
      subtitle: vocabWeakness && vocabWeakness.targetWord
        ? `Focus: "${vocabWeakness.targetWord}" + daily cards`
        : `Target words: ${vocab1.word}, ${vocab2.word}`,
      exerciseId: vocabWeakness ? vocabWeakness.targetWord : vocab1.id,
      href: "/vocabulary",
      estimatedMinutes: 3,
      priority: vocabWeakness || hasVocabGoal ? "high" : "medium",
      reason: vocabWeakness
        ? `Focus Area: ${vocabWeakness.evidence}`
        : hasVocabGoal
        ? "Active Goal: Aligned with your vocabulary target."
        : "Expand and reinforce active vocabulary recall.",
    },
    {
      id: "task-conversation",
      module: "conversation",
      title: "Interactive AI Conversation",
      subtitle: "Scenario: Daily Life & Routines",
      exerciseId: "daily-life",
      href: "/conversation",
      estimatedMinutes: 8,
      priority: hasConvGoal ? "high" : "medium",
      reason: hasConvGoal
        ? "Active Goal: Aligned with your conversation target."
        : "Apply vocabulary and grammar in an open interactive dialogue.",
    },
  ];

  // Sort candidates by priority (high > medium > low)
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  candidateTasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

  // Select tasks strictly respecting targetMinutes
  const selectedTasks = [];
  let currentTotalMinutes = 0;

  for (const task of candidateTasks) {
    // If adding task would exceed target budget (allowing max 1 minute margin for short budgets)
    if (currentTotalMinutes + task.estimatedMinutes <= safeBudget + 1) {
      selectedTasks.push(task);
      currentTotalMinutes += task.estimatedMinutes;
    }
  }

  // Ensure at least one task is included even for minimal budget
  if (selectedTasks.length === 0 && candidateTasks.length > 0) {
    selectedTasks.push(candidateTasks[0]);
    currentTotalMinutes += candidateTasks[0].estimatedMinutes;
  }

  return {
    planId: `plan_${dateStr}_${safeBudget}m`,
    date: dateStr,
    targetMinutes: safeBudget,
    estimatedMinutes: currentTotalMinutes,
    isStarterPlan,
    tasks: selectedTasks,
  };
}

/**
 * Check which tasks of an adaptive plan have been completed based on recorded activities
 *
 * @param {Object} plan - Generated plan object
 * @param {Array} activities - Completed learning activity records
 * @param {Date|string} referenceDate - Reference date
 * @returns {Object} Evaluated plan with task statuses, completed count, and percentages
 */
export function evaluateAdaptivePlan(plan, activities = [], referenceDate = null) {
  if (!plan || !Array.isArray(plan.tasks)) {
    return {
      tasksWithStatus: [],
      completedCount: 0,
      totalCount: 0,
      percentage: 0,
      completedMinutes: 0,
      remainingMinutes: 0,
    };
  }

  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const todayStr = toLocalDateString(refDate);

  const todayActivities = activities.filter(
    (act) => act.status === "completed" && toLocalDateString(act.timestamp) === todayStr
  );

  let completedMinutes = 0;

  const tasksWithStatus = plan.tasks.map((task) => {
    let isCompleted = false;

    if (task.module === "vocabulary") {
      isCompleted = todayActivities.some((act) => act.module === "vocabulary");
    } else {
      isCompleted = todayActivities.some((act) => act.module === task.module);
    }

    if (isCompleted) {
      completedMinutes += task.estimatedMinutes;
    }

    return {
      ...task,
      isCompleted,
    };
  });

  const completedCount = tasksWithStatus.filter((t) => t.isCompleted).length;
  const totalCount = tasksWithStatus.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const remainingMinutes = Math.max(0, (plan.estimatedMinutes || 0) - completedMinutes);

  return {
    tasksWithStatus,
    completedCount,
    totalCount,
    percentage,
    completedMinutes,
    remainingMinutes,
  };
}
