/**
 * Shadowly / Lingova — Spaced Review Scheduler Heuristic
 * Phase 5 Deterministic Review Engine
 *
 * NOTE: This is a simple deterministic scheduling heuristic for client-side
 * practice intervals (Again: 0d, Hard: 1d, Good: 3d, Easy: 7d), not a
 * validated clinical implementation of SuperMemo SM-2 or FSRS.
 */

import { getItem, setItem, STORAGE_KEYS } from "./storage.js";
import { toLocalDateString } from "./progressService.js";

export const REVIEW_INTERVAL_RULES = {
  again: 0, // due today
  hard: 1,  // due tomorrow
  good: 3,  // due in 3 days
  easy: 7,  // due in 7 days
};

export const REVIEW_STATUSES = {
  NEW: "new",
  LEARNING: "learning",
  REVIEWING: "reviewing",
  MASTERED: "mastered",
};

/**
 * Calculate the next review schedule for a word given a recall rating
 */
export function calculateNextReview(currentState = null, rating = "good", referenceDate = null) {
  const validRating = ["again", "hard", "good", "easy"].includes(rating) ? rating : "good";
  const targetDate = referenceDate !== null && referenceDate !== undefined
    ? referenceDate
    : (typeof window !== "undefined" ? new Date() : "2026-01-01");
  const refDate = targetDate instanceof Date ? targetDate : new Date(targetDate);

  const prevReviewCount = currentState?.reviewCount || 0;
  const prevInterval = currentState?.intervalDays || 0;
  const prevConsecutive = currentState?.consecutiveCorrect || 0;

  let intervalDays = REVIEW_INTERVAL_RULES[validRating];
  let consecutiveCorrect = prevConsecutive;

  if (validRating === "again") {
    intervalDays = 0;
    consecutiveCorrect = 0;
  } else if (validRating === "hard") {
    intervalDays = prevInterval > 0 ? Math.max(1, Math.round(prevInterval * 1.2)) : 1;
    consecutiveCorrect = prevConsecutive + 1;
  } else if (validRating === "good") {
    intervalDays = prevInterval > 0 ? Math.max(3, Math.round(prevInterval * 2.0)) : 3;
    consecutiveCorrect = prevConsecutive + 1;
  } else if (validRating === "easy") {
    intervalDays = prevInterval > 0 ? Math.max(7, Math.round(prevInterval * 2.5)) : 7;
    consecutiveCorrect = prevConsecutive + 2;
  }

  // Calculate calendar next review date in local format
  const nextDate = new Date(refDate);
  nextDate.setDate(refDate.getDate() + intervalDays);
  const nextReviewDateStr = toLocalDateString(nextDate);

  // Derive descriptive status
  let status = REVIEW_STATUSES.LEARNING;
  if (intervalDays >= 7 || consecutiveCorrect >= 4) {
    status = REVIEW_STATUSES.MASTERED;
  } else if (intervalDays >= 3 || consecutiveCorrect >= 2) {
    status = REVIEW_STATUSES.REVIEWING;
  }

  return {
    wordId: currentState?.wordId || null,
    intervalDays,
    lastReviewed: toLocalDateString(refDate),
    nextReviewDate: nextReviewDateStr,
    reviewCount: prevReviewCount + 1,
    consecutiveCorrect,
    lastRating: validRating,
    status,
  };
}

/**
 * Check if a word is due for review today or overdue
 */
export function isWordDue(wordState, referenceDate = null) {
  if (!wordState || !wordState.nextReviewDate) return true; // Unscheduled words are due
  const refDate = referenceDate !== null && referenceDate !== undefined
    ? referenceDate
    : (typeof window !== "undefined" ? new Date() : "2026-01-01");
  const todayStr = toLocalDateString(refDate);
  return wordState.nextReviewDate <= todayStr;
}

/**
 * Get all word review states from persistent storage
 */
export function getAllWordReviews() {
  const reviews = getItem(STORAGE_KEYS.VOCAB_PROGRESS, {});
  return reviews && typeof reviews === "object" ? reviews : {};
}

/**
 * Get review state for a specific word
 */
export function getWordReviewState(wordId) {
  const all = getAllWordReviews();
  return all[wordId] || null;
}

/**
 * Record a review for a word in storage
 */
export function saveWordReview(wordId, rating, referenceDate = null) {
  const all = getAllWordReviews();
  const current = all[wordId] || { wordId, intervalDays: 0, reviewCount: 0, consecutiveCorrect: 0 };
  const updated = calculateNextReview(current, rating, referenceDate);
  updated.wordId = wordId;

  all[wordId] = updated;
  setItem(STORAGE_KEYS.VOCAB_PROGRESS, all);
  return updated;
}

/**
 * Filter dataset words that are due today
 */
export function getDueWords(wordsDataset = [], referenceDate = null) {
  if (!Array.isArray(wordsDataset)) return [];
  const allReviews = getAllWordReviews();

  return wordsDataset.filter((word) => {
    const state = allReviews[word.id];
    return isWordDue(state, referenceDate);
  });
}

/**
 * Get IDs of bookmarked / saved words
 */
export function getSavedWordIds() {
  const saved = getItem(STORAGE_KEYS.VOCAB_SAVED, []);
  return Array.isArray(saved) ? saved : [];
}

/**
 * Toggle bookmark / save status for a word
 */
export function toggleSaveWord(wordId) {
  const current = getSavedWordIds();
  const exists = current.includes(wordId);
  const updated = exists ? current.filter((id) => id !== wordId) : [...current, wordId];
  setItem(STORAGE_KEYS.VOCAB_SAVED, updated);
  return !exists;
}
