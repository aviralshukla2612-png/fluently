import test from "node:test";
import assert from "node:assert/strict";
import {
  validateActivity,
  recordActivity,
  getActivities,
  calculateStreak,
  calculateModuleStats,
  getWeeklyActivity,
  toLocalDateString,
  clearAllProgress,
} from "../src/lib/learning/progressService.js";
import { safeJsonParse } from "../src/lib/learning/storage.js";

test("Phase 5 Progress Engine Tests", async (t) => {
  await t.test("Test 1: Activity validation enforces required module and valid score bounds", () => {
    // Missing / invalid module
    assert.equal(validateActivity(null).valid, false);
    assert.equal(validateActivity({ module: "invalid_mod" }).valid, false);

    // Negative score
    assert.equal(validateActivity({ module: "speaking", score: -5 }).valid, false);

    // Score over 100
    assert.equal(validateActivity({ module: "speaking", score: 105 }).valid, false);

    // Valid records
    assert.equal(validateActivity({ module: "speaking", score: 85 }).valid, true);
    assert.equal(validateActivity({ module: "dictation", score: 100 }).valid, true);
    assert.equal(validateActivity({ module: "grammar", score: null }).valid, true);
    assert.equal(validateActivity({ module: "vocabulary", score: 0 }).valid, true);
  });

  await t.test("Test 2: Activity recording normalizes record and assigns unique ID and timestamp", () => {
    clearAllProgress();
    const recorded = recordActivity({
      module: "dictation",
      exerciseId: "drill-1",
      score: 94.67,
      difficulty: "beginner",
    });

    assert.ok(recorded.id.startsWith("act_"));
    assert.equal(recorded.module, "dictation");
    assert.equal(recorded.exerciseId, "drill-1");
    assert.equal(recorded.score, 94.7);
    assert.equal(recorded.status, "completed");
    assert.ok(recorded.timestamp);

    const retrieved = getActivities();
    assert.equal(retrieved.length, 1);
    assert.equal(retrieved[0].id, recorded.id);
  });

  await t.test("Test 3: Accidental duplicate submission within 1 second is de-duplicated", () => {
    clearAllProgress();
    const fixedTimestamp = new Date().toISOString();
    const first = recordActivity({
      module: "dictation",
      exerciseId: "drill-2",
      score: 90,
      timestamp: fixedTimestamp,
    });

    const duplicate = recordActivity({
      module: "dictation",
      exerciseId: "drill-2",
      score: 90,
      timestamp: fixedTimestamp,
    });

    assert.equal(first.exerciseId, duplicate.exerciseId);
    assert.equal(getActivities().length, 1);
  });

  await t.test("Test 4: Streak calculation handles empty, single-day, and multi-day consecutive practice", () => {
    const today = new Date("2026-10-22T10:00:00");

    // Empty list
    const emptyStreak = calculateStreak([], today);
    assert.equal(emptyStreak.currentStreak, 0);
    assert.equal(emptyStreak.hasPracticedToday, false);

    // Practiced today only
    const singleDay = [
      { status: "completed", timestamp: "2026-10-22T08:30:00Z" },
    ];
    const singleStreak = calculateStreak(singleDay, today);
    assert.equal(singleStreak.currentStreak, 1);
    assert.equal(singleStreak.hasPracticedToday, true);

    // Consecutive 4 days including today
    const fourDays = [
      { status: "completed", timestamp: "2026-10-19T10:00:00Z" },
      { status: "completed", timestamp: "2026-10-20T10:00:00Z" },
      { status: "completed", timestamp: "2026-10-21T10:00:00Z" },
      { status: "completed", timestamp: "2026-10-22T10:00:00Z" },
    ];
    const streakResult = calculateStreak(fourDays, today);
    assert.equal(streakResult.currentStreak, 4);
    assert.equal(streakResult.longestStreak, 4);

    // Practiced yesterday, not yet today -> streak is still 3!
    const yesterdayOnly = [
      { status: "completed", timestamp: "2026-10-19T10:00:00Z" },
      { status: "completed", timestamp: "2026-10-20T10:00:00Z" },
      { status: "completed", timestamp: "2026-10-21T10:00:00Z" },
    ];
    const aliveStreak = calculateStreak(yesterdayOnly, today);
    assert.equal(aliveStreak.currentStreak, 3);
    assert.equal(aliveStreak.hasPracticedToday, false);

    // Broken streak (gap of 2 days)
    const brokenStreak = [
      { status: "completed", timestamp: "2026-10-18T10:00:00Z" },
      { status: "completed", timestamp: "2026-10-19T10:00:00Z" },
      // gap: 20, 21 missing
    ];
    const brokenResult = calculateStreak(brokenStreak, today);
    assert.equal(brokenResult.currentStreak, 0);
    assert.equal(brokenResult.longestStreak, 2);
  });

  await t.test("Test 5: Module statistics aggregate separate metrics without false conflation", () => {
    const sampleActivities = [
      { module: "speaking", exerciseId: "s1", status: "completed", score: 80 },
      { module: "speaking", exerciseId: "s2", status: "completed", score: 90 },
      { module: "dictation", exerciseId: "d1", status: "completed", score: 100 },
      { module: "grammar", exerciseId: "g1", status: "completed", score: 75 },
      { module: "vocabulary", exerciseId: "v1", status: "completed", score: 100 },
      { module: "speaking", exerciseId: "s3", status: "abandoned", score: null }, // uncompleted
    ];

    const stats = calculateModuleStats(sampleActivities);
    assert.equal(stats.totalCompletedActivities, 5);
    assert.equal(stats.speaking.totalAttempts, 2);
    assert.equal(stats.speaking.averageScore, 85);
    assert.equal(stats.dictation.totalAttempts, 1);
    assert.equal(stats.dictation.perfectCount, 1);
    assert.equal(stats.dictation.averageScore, 100);
    assert.equal(stats.grammar.distinctLessons, 1);
    assert.equal(stats.vocabulary.totalReviews, 1);
  });

  await t.test("Test 6: Weekly activity produces 7 days ending at reference date", () => {
    const refDate = new Date("2026-10-22T12:00:00");
    const sampleActivities = [
      { module: "speaking", status: "completed", timestamp: "2026-10-22T08:00:00" },
      { module: "dictation", status: "completed", timestamp: "2026-10-22T09:00:00" },
      { module: "grammar", status: "completed", timestamp: "2026-10-21T10:00:00" },
    ];

    const weekly = getWeeklyActivity(sampleActivities, refDate);
    assert.equal(weekly.length, 7);
    assert.equal(weekly[6].date, toLocalDateString(refDate));
    assert.equal(weekly[6].count, 2);
    assert.equal(weekly[5].count, 1);
    assert.equal(weekly[4].count, 0);
  });

  await t.test("Test 7: Safe JSON parse gracefully recovers from corrupted data", () => {
    const fallback = { safe: true };
    assert.deepEqual(safeJsonParse(null, fallback), fallback);
    assert.deepEqual(safeJsonParse("not a json string at all", fallback), fallback);
    assert.deepEqual(safeJsonParse("{ broken json: 123", fallback), fallback);
    assert.deepEqual(safeJsonParse('{"valid": true}', fallback), { valid: true });
  });
});
