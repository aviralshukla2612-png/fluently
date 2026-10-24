import test from "node:test";
import assert from "node:assert/strict";
import { VOCABULARY_DATASET } from "../src/data/vocabulary/words.js";
import {
  calculateNextReview,
  isWordDue,
  REVIEW_INTERVAL_RULES,
  REVIEW_STATUSES,
} from "../src/lib/learning/reviewScheduler.js";
import { toLocalDateString } from "../src/lib/learning/progressService.js";

test("Phase 5 Vocabulary Module Tests", async (t) => {
  await t.test("Test 1: Starter vocabulary dataset has comprehensive entries across tiers", () => {
    assert.ok(VOCABULARY_DATASET.length >= 10, "Should have at least 10 starter words");

    for (const item of VOCABULARY_DATASET) {
      assert.ok(item.id, "Word entry must have an ID");
      assert.ok(item.word, "Word entry must have word text");
      assert.ok(item.partOfSpeech, "Word entry must specify part of speech");
      assert.ok(item.meaning, "Word entry must have detailed meaning");
      assert.ok(item.simpleDefinition, "Word entry must have simple definition");
      assert.ok(item.exampleSentence, "Word entry must have example sentence");
      assert.ok(item.category, "Word entry must have a category");
    }
  });

  await t.test("Test 2: Review scheduler calculates correct deterministic intervals", () => {
    const refDate = new Date("2026-10-22T10:00:00");

    // Again -> 0 days (due today)
    const againResult = calculateNextReview(null, "again", refDate);
    assert.equal(againResult.intervalDays, 0);
    assert.equal(againResult.nextReviewDate, toLocalDateString(refDate));
    assert.equal(againResult.reviewCount, 1);
    assert.equal(againResult.status, REVIEW_STATUSES.LEARNING);

    // Hard -> 1 day (due tomorrow)
    const hardResult = calculateNextReview(null, "hard", refDate);
    assert.equal(hardResult.intervalDays, 1);
    assert.equal(hardResult.nextReviewDate, "2026-10-23");

    // Good -> 3 days (due in 3 days)
    const goodResult = calculateNextReview(null, "good", refDate);
    assert.equal(goodResult.intervalDays, 3);
    assert.equal(goodResult.nextReviewDate, "2026-10-25");

    // Easy -> 7 days (due in 7 days)
    const easyResult = calculateNextReview(null, "easy", refDate);
    assert.equal(easyResult.intervalDays, 7);
    assert.equal(easyResult.nextReviewDate, "2026-10-29");
    assert.equal(easyResult.status, REVIEW_STATUSES.MASTERED);
  });

  await t.test("Test 3: Repeated successful reviews progressively extend intervals", () => {
    const refDate = new Date("2026-10-22T10:00:00");
    const firstReview = calculateNextReview(null, "good", refDate);
    assert.equal(firstReview.intervalDays, 3);

    const secondDate = new Date("2026-10-25T10:00:00");
    const secondReview = calculateNextReview(firstReview, "good", secondDate);
    assert.equal(secondReview.intervalDays, 6);
    assert.equal(secondReview.reviewCount, 2);

    const thirdDate = new Date("2026-10-31T10:00:00");
    const thirdReview = calculateNextReview(secondReview, "easy", thirdDate);
    assert.ok(thirdReview.intervalDays >= 12);
    assert.equal(thirdReview.status, REVIEW_STATUSES.MASTERED);
  });

  await t.test("Test 4: Word is flagged as due when nextReviewDate is today or past", () => {
    const today = new Date("2026-10-22T12:00:00");

    // Unscheduled word is due
    assert.equal(isWordDue(null, today), true);
    assert.equal(isWordDue({}, today), true);

    // Scheduled for today is due
    assert.equal(isWordDue({ nextReviewDate: "2026-10-22" }, today), true);

    // Scheduled for yesterday (overdue) is due
    assert.equal(isWordDue({ nextReviewDate: "2026-10-21" }, today), true);

    // Scheduled for tomorrow is NOT due
    assert.equal(isWordDue({ nextReviewDate: "2026-10-23" }, today), false);
  });

  await t.test("Test 5: Vocabulary filtering isolates categories and difficulty levels", () => {
    const beginnerWords = VOCABULARY_DATASET.filter((w) => w.difficulty === "beginner");
    assert.ok(beginnerWords.length >= 2);
    for (const w of beginnerWords) {
      assert.equal(w.difficulty, "beginner");
    }

    const growthWords = VOCABULARY_DATASET.filter((w) => w.category === "Personal Growth");
    assert.ok(growthWords.length >= 2);
    for (const w of growthWords) {
      assert.equal(w.category, "Personal Growth");
    }
  });
});
