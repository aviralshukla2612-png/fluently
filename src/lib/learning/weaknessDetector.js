/**
 * Shadowly — Weakness Detector Engine
 * Phase 7 Learning Intelligence
 *
 * Scans verified learning activity records to identify repeated grammar mistakes,
 * frequently missed vocabulary, low dictation accuracy, and speaking text-matching challenges.
 *
 * Follows strict evidence-based rules:
 * - Does not invent mistakes or weaknesses.
 * - Single mistakes are flagged as 'insufficient_data' rather than persistent weaknesses.
 * - Confidences and severities are derived strictly from attempt counts and error rates.
 */

import { GRAMMAR_LESSONS } from "../../data/grammar/lessons.js";
import { DICTATION_EXERCISES } from "../../data/dictation/exercises.js";

/**
 * Helper to safely extract metadata from DB (which can be a string) or localStorage
 */
export function parseMetadata(meta) {
  if (!meta) return {};
  if (typeof meta === "string") {
    try {
      return JSON.parse(meta);
    } catch {
      return {};
    }
  }
  return typeof meta === "object" ? meta : {};
}

/**
 * Determine weakness status based on attempt history and trends
 */
export function determineWeaknessStatus({ attemptCount, errorCount, scores = [] }) {
  if (attemptCount <= 1) {
    return "insufficient_data";
  }

  // Check if learner is noticeably improving
  if (scores.length >= 2) {
    const recentScore = scores[scores.length - 1];
    const initialScore = scores[0];
    if (recentScore >= 75 && recentScore - initialScore >= 15) {
      return "improving";
    }
  }

  if (errorCount >= 4 || (attemptCount >= 4 && errorCount / attemptCount >= 0.5)) {
    return "persistent";
  }

  if (errorCount >= 2) {
    return "repeated";
  }

  return "new";
}

/**
 * Determine severity based on error rate and attempt volume
 */
export function determineSeverity({ errorRate, attemptCount }) {
  if ((attemptCount >= 2 && errorRate >= 0.6) || (attemptCount >= 3 && errorRate >= 0.45)) {
    return "high";
  }
  if (attemptCount >= 2 && errorRate >= 0.35) {
    return "medium";
  }
  return "low";
}

/**
 * Determine confidence based on available evidence volume
 */
export function determineConfidence({ attemptCount }) {
  if (attemptCount >= 4) return "high";
  if (attemptCount >= 2) return "medium";
  return "low";
}

/**
 * Analyze grammar activities for recurring weaknesses
 */
function analyzeGrammarWeaknesses(grammarActivities = []) {
  const weaknesses = [];
  const byExercise = {};

  for (const act of grammarActivities) {
    const key = act.exerciseId || "unknown";
    if (!byExercise[key]) byExercise[key] = [];
    byExercise[key].push(act);
  }

  for (const [exerciseId, list] of Object.entries(byExercise)) {
    // Sort chronologically
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let errorCount = 0;
    const scores = [];
    let lessonTitle = null;

    for (const act of list) {
      const meta = parseMetadata(act.metadata);
      if (meta.lessonTitle) lessonTitle = meta.lessonTitle;

      const score = typeof act.score === "number" ? act.score : null;
      if (score !== null) scores.push(score);

      // Check for errors from metadata or score
      if (typeof meta.questionsCount === "number" && typeof meta.correctCount === "number") {
        const errors = Math.max(0, meta.questionsCount - meta.correctCount);
        errorCount += errors;
      } else if (score !== null && score < 75) {
        errorCount += 1;
      }
    }

    const attemptCount = list.length;
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

    // Resolve title from lessons dataset if not in metadata
    if (!lessonTitle) {
      const lessonObj = GRAMMAR_LESSONS.find((l) => l.id === exerciseId);
      lessonTitle = lessonObj ? lessonObj.title : `Grammar Lesson (${exerciseId})`;
    }

    const errorRate = avgScore !== null ? (100 - avgScore) / 100 : (errorCount / Math.max(1, attemptCount * 3));

    // Only flag if there are observed errors or low score
    if (errorCount > 0 || (avgScore !== null && avgScore < 75)) {
      const status = determineWeaknessStatus({ attemptCount, errorCount, scores });
      const severity = determineSeverity({ errorRate, attemptCount });
      const confidence = determineConfidence({ attemptCount });
      const latestAct = list[list.length - 1];

      weaknesses.push({
        id: `weakness_grammar_${exerciseId}`,
        skill: "grammar",
        category: lessonTitle,
        exerciseId,
        destination: `/grammar?lesson=${exerciseId}`,
        errorCount,
        attemptCount,
        averageScore: avgScore,
        errorRate: Math.round(errorRate * 100),
        latestOccurrence: latestAct.timestamp,
        status,
        severity,
        confidence,
        evidence: `Observed ${errorCount} mistake${errorCount === 1 ? "" : "s"} across ${attemptCount} attempt${attemptCount === 1 ? "" : "s"} (avg score: ${avgScore ?? "N/A"}%).`,
      });
    }
  }

  return weaknesses;
}

/**
 * Analyze vocabulary activities for repeatedly missed words
 */
function analyzeVocabularyWeaknesses(vocabActivities = []) {
  const weaknesses = [];
  const byWord = {};

  for (const act of vocabActivities) {
    const meta = parseMetadata(act.metadata);
    const word = meta.word || act.exerciseId || "unknown";
    if (word === "unknown" || word === "default") continue;

    if (!byWord[word]) byWord[word] = [];
    byWord[word].push(act);
  }

  for (const [word, list] of Object.entries(byWord)) {
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let errorCount = 0;
    const scores = [];

    for (const act of list) {
      const meta = parseMetadata(act.metadata);
      const isIncorrect =
        meta.rating === "again" ||
        meta.rating === "hard" ||
        meta.isCorrect === false ||
        (typeof act.score === "number" && act.score < 60);

      if (isIncorrect) {
        errorCount += 1;
      }
      if (typeof act.score === "number") {
        scores.push(act.score);
      }
    }

    const attemptCount = list.length;
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

    const errorRate = errorCount / Math.max(1, attemptCount);

    if (errorCount > 0) {
      const status = determineWeaknessStatus({ attemptCount, errorCount, scores });
      const severity = determineSeverity({ errorRate, attemptCount });
      const confidence = determineConfidence({ attemptCount });
      const latestAct = list[list.length - 1];

      weaknesses.push({
        id: `weakness_vocab_${encodeURIComponent(word.toLowerCase())}`,
        skill: "vocabulary",
        category: `Word Recall: "${word}"`,
        targetWord: word,
        destination: "/vocabulary",
        errorCount,
        attemptCount,
        averageScore: avgScore,
        errorRate: Math.round(errorRate * 100),
        latestOccurrence: latestAct.timestamp,
        status,
        severity,
        confidence,
        evidence: `Rated 'Again' or 'Hard' ${errorCount} time${errorCount === 1 ? "" : "s"} across ${attemptCount} review session${attemptCount === 1 ? "" : "s"}.`,
      });
    }
  }

  return weaknesses;
}

/**
 * Analyze dictation activities for listening comprehension weaknesses
 */
function analyzeDictationWeaknesses(dictationActivities = []) {
  const weaknesses = [];
  if (dictationActivities.length === 0) return weaknesses;

  const lowScoreAttempts = dictationActivities.filter(
    (a) => typeof a.score === "number" && a.score < 70
  );

  if (lowScoreAttempts.length === 0) return weaknesses;

  const attemptCount = dictationActivities.length;
  const errorCount = lowScoreAttempts.length;
  const scores = dictationActivities.map((a) => a.score).filter((s) => typeof s === "number");
  const avgScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  const errorRate = errorCount / Math.max(1, attemptCount);
  const status = determineWeaknessStatus({ attemptCount, errorCount, scores });
  const severity = determineSeverity({ errorRate, attemptCount });
  const confidence = determineConfidence({ attemptCount });

  const sorted = dictationActivities.slice().sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  weaknesses.push({
    id: "weakness_dictation_listening",
    skill: "dictation",
    category: "Listening Comprehension & Transcription",
    destination: "/dictation",
    errorCount,
    attemptCount,
    averageScore: avgScore,
    errorRate: Math.round(errorRate * 100),
    latestOccurrence: sorted[0].timestamp,
    status,
    severity,
    confidence,
    evidence: `Average transcription accuracy is ${avgScore ?? "N/A"}% with ${errorCount} attempt${errorCount === 1 ? "" : "s"} falling below the 70% threshold.`,
  });

  return weaknesses;
}

/**
 * Analyze speaking activities for text-match accuracy challenges
 */
function analyzeSpeakingWeaknesses(speakingActivities = []) {
  const weaknesses = [];
  if (speakingActivities.length === 0) return weaknesses;

  const lowScoreAttempts = speakingActivities.filter(
    (a) => typeof a.score === "number" && a.score < 70
  );

  if (lowScoreAttempts.length === 0) return weaknesses;

  const attemptCount = speakingActivities.length;
  const errorCount = lowScoreAttempts.length;
  const scores = speakingActivities.map((a) => a.score).filter((s) => typeof s === "number");
  const avgScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  const errorRate = errorCount / Math.max(1, attemptCount);
  const status = determineWeaknessStatus({ attemptCount, errorCount, scores });
  const severity = determineSeverity({ errorRate, attemptCount });
  const confidence = determineConfidence({ attemptCount });

  const sorted = speakingActivities.slice().sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  weaknesses.push({
    id: "weakness_speaking_accuracy",
    skill: "speaking",
    category: "Speaking Text Alignment & Pace",
    destination: "/say-it",
    errorCount,
    attemptCount,
    averageScore: avgScore,
    errorRate: Math.round(errorRate * 100),
    latestOccurrence: sorted[0].timestamp,
    status,
    severity,
    confidence,
    evidence: `Average speech recognition text-match is ${avgScore ?? "N/A"}% across ${attemptCount} attempts (${errorCount} below 70%).`,
  });

  return weaknesses;
}

/**
 * Detect all weaknesses across learning activities
 *
 * @param {Array} activities - List of completed learning activity records
 * @returns {Array} List of detected weaknesses sorted by severity and recency
 */
export function detectWeaknesses(activities = []) {
  if (!Array.isArray(activities) || activities.length === 0) {
    return [];
  }

  const completed = activities.filter((a) => a.status === "completed");

  const grammarActs = completed.filter((a) => a.module === "grammar");
  const vocabActs = completed.filter((a) => a.module === "vocabulary");
  const dictationActs = completed.filter((a) => a.module === "dictation");
  const speakingActs = completed.filter((a) => a.module === "speaking");

  const grammarWeaknesses = analyzeGrammarWeaknesses(grammarActs);
  const vocabWeaknesses = analyzeVocabularyWeaknesses(vocabActs);
  const dictationWeaknesses = analyzeDictationWeaknesses(dictationActs);
  const speakingWeaknesses = analyzeSpeakingWeaknesses(speakingActs);

  const allWeaknesses = [
    ...grammarWeaknesses,
    ...vocabWeaknesses,
    ...dictationWeaknesses,
    ...speakingWeaknesses,
  ];

  // Severity ranking: high = 3, medium = 2, low = 1
  const severityWeight = { high: 3, medium: 2, low: 1 };

  return allWeaknesses.sort((a, b) => {
    const diff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
    if (diff !== 0) return diff;
    return new Date(b.latestOccurrence).getTime() - new Date(a.latestOccurrence).getTime();
  });
}
