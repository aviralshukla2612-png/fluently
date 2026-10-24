import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  GOAL_TYPES,
  GOAL_TYPE_CONFIG,
  validateGoalInput,
  getCalendarWeekRange,
  calculateGoalProgress,
  evaluateAllGoals,
} from "../src/lib/goals/goalManager.js";

import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_CATEGORIES,
  getAchievementById,
} from "../src/lib/achievements/achievementCatalog.js";

import {
  evaluateAchievements,
  calculateTotalPoints,
} from "../src/lib/achievements/achievementEngine.js";

import {
  generateWeeklyReview,
} from "../src/lib/learning/weeklyReview.js";

import {
  generateAdaptiveDailyPlan,
  evaluateAdaptivePlan,
} from "../src/lib/learning/dailyLearningPlan.js";

import {
  calculateStreak,
} from "../src/lib/learning/progressService.js";

import { userRepository } from "../src/lib/db/userRepository.js";

describe("Phase 8: Learning Goals, Milestones & Achievement System", () => {
  beforeEach(() => {
    userRepository._resetMemoryStore();
  });

  // ==========================================
  // SECTION 1: LEARNING GOALS
  // ==========================================
  describe("1. Goal Validation and Configuration", () => {
    test("1.1: Validates valid daily and weekly goal configurations", () => {
      const valid1 = validateGoalInput({
        goalType: GOAL_TYPES.DAILY_MINUTES,
        targetValue: 20,
      });
      assert.equal(valid1.isValid, true);
      assert.equal(valid1.errors.length, 0);

      const valid2 = validateGoalInput({
        goalType: GOAL_TYPES.SKILL_ACTIVITIES,
        targetValue: 5,
        skill: "speaking",
      });
      assert.equal(valid2.isValid, true);
    });

    test("1.2: Rejects invalid target values below minimum or above maximum", () => {
      const tooLow = validateGoalInput({
        goalType: GOAL_TYPES.DAILY_MINUTES,
        targetValue: 2, // min is 5
      });
      assert.equal(tooLow.isValid, false);
      assert.ok(tooLow.errors.some((e) => e.field === "targetValue"));

      const tooHigh = validateGoalInput({
        goalType: GOAL_TYPES.WEEKLY_DAYS,
        targetValue: 10, // max is 7 days in a week
      });
      assert.equal(tooHigh.isValid, false);
      assert.ok(tooHigh.errors.some((e) => e.field === "targetValue"));
    });

    test("1.3: Rejects unknown goal types and missing skill when required", () => {
      const unknown = validateGoalInput({
        goalType: "unknown_metric",
        targetValue: 10,
      });
      assert.equal(unknown.isValid, false);

      const missingSkill = validateGoalInput({
        goalType: GOAL_TYPES.SKILL_ACTIVITIES,
        targetValue: 5,
        skill: "flying", // invalid skill
      });
      assert.equal(missingSkill.isValid, false);
    });
  });

  describe("2. Goal Progress Calculations", () => {
    const testActivities = [
      // Today (2026-10-22)
      { id: "a1", module: "speaking", status: "completed", durationSeconds: 600, timestamp: "2026-10-22T09:00:00Z" }, // 10 min
      { id: "a2", module: "grammar", status: "completed", durationSeconds: 300, timestamp: "2026-10-22T10:00:00Z" },  // 5 min
      // Earlier this week (2026-10-20)
      { id: "a3", module: "dictation", status: "completed", durationSeconds: 600, timestamp: "2026-10-20T14:00:00Z" }, // 10 min
      // Earlier this week (2026-10-19)
      { id: "a4", module: "vocabulary", status: "completed", durationSeconds: 300, timestamp: "2026-10-19T11:00:00Z" }, // 5 min
      // Incomplete activity (must NOT count)
      { id: "a5", module: "speaking", status: "in_progress", durationSeconds: 1200, timestamp: "2026-10-22T12:00:00Z" },
    ];

    test("2.1: Calculates daily minutes goal progress using only today's verified completed drills", () => {
      const goal = {
        id: "g1",
        goalType: GOAL_TYPES.DAILY_MINUTES,
        targetValue: 15,
        targetUnit: "minutes",
        status: "active",
      };

      const progress = calculateGoalProgress(goal, testActivities, new Date("2026-10-22T15:00:00Z"));
      // Today's completed activities: a1 (600s = 10m) + a2 (300s = 5m) = 15m
      assert.equal(progress.current, 15);
      assert.equal(progress.target, 15);
      assert.equal(progress.percentage, 100);
      assert.equal(progress.isCompleted, true);
    });

    test("2.2: Calculates weekly minutes goal progress across calendar week", () => {
      const goal = {
        id: "g2",
        goalType: GOAL_TYPES.WEEKLY_MINUTES,
        targetValue: 60,
        targetUnit: "minutes",
        status: "active",
      };

      const progress = calculateGoalProgress(goal, testActivities, new Date("2026-10-22T15:00:00Z"));
      // Week total: 10 + 5 + 10 + 5 = 30 min
      assert.equal(progress.current, 30);
      assert.equal(progress.target, 60);
      assert.equal(progress.percentage, 50);
      assert.equal(progress.isCompleted, false);
    });

    test("2.3: Calculates weekly practice days consistency goal", () => {
      const goal = {
        id: "g3",
        goalType: GOAL_TYPES.WEEKLY_DAYS,
        targetValue: 4,
        targetUnit: "days",
        status: "active",
      };

      const progress = calculateGoalProgress(goal, testActivities, new Date("2026-10-22T15:00:00Z"));
      // Distinct days with completed activity: 2026-10-19, 2026-10-20, 2026-10-22 = 3 days
      assert.equal(progress.current, 3);
      assert.equal(progress.target, 4);
      assert.equal(progress.percentage, 75);
      assert.equal(progress.isCompleted, false);
    });

    test("2.4: Calculates skill-specific completed activity goal", () => {
      const goal = {
        id: "g4",
        goalType: GOAL_TYPES.SKILL_ACTIVITIES,
        skill: "speaking",
        targetValue: 2,
        targetUnit: "drills",
        status: "active",
      };

      const progress = calculateGoalProgress(goal, testActivities, new Date("2026-10-22T15:00:00Z"));
      // Completed speaking this week: a1 (1 drill; a5 is incomplete)
      assert.equal(progress.current, 1);
      assert.equal(progress.target, 2);
      assert.equal(progress.percentage, 50);
      assert.equal(progress.isCompleted, false);
    });

    test("2.5: Caps visual percentage at 100% while reporting actual excess value", () => {
      const goal = {
        id: "g5",
        goalType: GOAL_TYPES.DAILY_MINUTES,
        targetValue: 10,
        targetUnit: "minutes",
        status: "active",
      };

      const progress = calculateGoalProgress(goal, testActivities, new Date("2026-10-22T15:00:00Z"));
      // 15 min achieved vs 10 min target
      assert.equal(progress.current, 15);
      assert.equal(progress.target, 10);
      assert.equal(progress.percentage, 100);
      assert.equal(progress.isCompleted, true);
    });

    test("2.6: Handles empty activity history cleanly", () => {
      const goal = {
        id: "g6",
        goalType: GOAL_TYPES.DAILY_ACTIVITIES,
        targetValue: 5,
        targetUnit: "drills",
        status: "active",
      };

      const progress = calculateGoalProgress(goal, [], new Date("2026-10-22T15:00:00Z"));
      assert.equal(progress.current, 0);
      assert.equal(progress.percentage, 0);
      assert.equal(progress.isCompleted, false);
    });

    test("2.7: Paused goals report zero or preserved status without completing", () => {
      const goal = {
        id: "g7",
        goalType: GOAL_TYPES.DAILY_MINUTES,
        targetValue: 10,
        status: "paused",
      };

      const progress = calculateGoalProgress(goal, testActivities, new Date("2026-10-22T15:00:00Z"));
      assert.equal(progress.isCompleted, false);
    });
  });

  // ==========================================
  // SECTION 2: ACHIEVEMENTS & MILESTONES
  // ==========================================
  describe("3. Achievement Catalog and Evaluation", () => {
    test("3.1: Catalog has valid schema with all required categories and points", () => {
      assert.ok(ACHIEVEMENT_CATALOG.length >= 12);
      for (const item of ACHIEVEMENT_CATALOG) {
        assert.ok(item.id, "Missing id");
        assert.ok(item.name, "Missing name");
        assert.ok(item.description, "Missing description");
        assert.ok(item.category, "Missing category");
        assert.ok(item.icon, "Missing icon");
        assert.ok(item.tier, "Missing tier");
        assert.ok(typeof item.points === "number" && item.points > 0, "Points must be positive");
        assert.equal(typeof item.evaluator, "function", "Evaluator must be function");
      }
    });

    test("3.2: First Practice unlocks after completing 1 activity", () => {
      const act1 = [{ id: "act1", module: "speaking", status: "completed" }];
      const result = evaluateAchievements(act1, null, { currentStreak: 1 }, []);

      const firstPractice = result.achievements.find((a) => a.id === "first_practice");
      assert.ok(firstPractice);
      assert.equal(firstPractice.isUnlocked, true);
      assert.ok(result.newlyUnlocked.some((a) => a.id === "first_practice"));
    });

    test("3.3: Locked achievements remain locked and compute partial progress", () => {
      const acts = [
        { id: "a1", module: "grammar", status: "completed" },
        { id: "a2", module: "grammar", status: "completed" },
      ];
      const result = evaluateAchievements(acts, null, { currentStreak: 1 }, []);

      // grammar_5 requires 5 grammar lessons
      const grammar5 = result.achievements.find((a) => a.id === "grammar_5");
      assert.ok(grammar5);
      assert.equal(grammar5.isUnlocked, false);
      assert.equal(grammar5.current, 2);
      assert.equal(grammar5.target, 5);
      assert.equal(grammar5.progress, 40); // 2/5 = 40%
    });

    test("3.4: Streak achievements unlock based on verified streak count", () => {
      const result = evaluateAchievements([], null, { currentStreak: 7, longestStreak: 7 }, []);

      const streak3 = result.achievements.find((a) => a.id === "streak_3");
      const streak7 = result.achievements.find((a) => a.id === "streak_7");
      const streak14 = result.achievements.find((a) => a.id === "streak_14");

      assert.equal(streak3.isUnlocked, true);
      assert.equal(streak7.isUnlocked, true);
      assert.equal(streak14.isUnlocked, false);
      assert.equal(streak14.progress, 50); // 7/14 = 50%
    });

    test("3.5: Already unlocked achievements are not flagged as newlyUnlocked (idempotency)", () => {
      const existingUnlock = [
        { achievementId: "first_practice", unlockedAt: "2026-10-01T00:00:00Z", points: 10 },
      ];
      const acts = [{ id: "a1", module: "speaking", status: "completed" }];

      const result = evaluateAchievements(acts, null, { currentStreak: 1 }, existingUnlock);
      const firstPractice = result.achievements.find((a) => a.id === "first_practice");

      assert.equal(firstPractice.isUnlocked, true);
      assert.equal(firstPractice.unlockedAt, "2026-10-01T00:00:00Z");
      // Must NOT be in newlyUnlocked
      assert.equal(result.newlyUnlocked.length, 0);
    });

    test("3.6: Correctly sums total verified achievement points", () => {
      const achievements = [
        { isUnlocked: true, points: 25 },
        { isUnlocked: true, points: 50 },
        { isUnlocked: false, points: 100 },
      ];
      assert.equal(calculateTotalPoints(achievements), 75);
    });

    test("3.7: Flawless Syntax unlocks when grammar score is >= 90%", () => {
      const acts = [
        { id: "g1", module: "grammar", status: "completed", score: 85 },
        { id: "g2", module: "grammar", status: "completed", score: 95 },
      ];
      const result = evaluateAchievements(acts, null, { currentStreak: 1 }, []);
      const flawless = result.achievements.find((a) => a.id === "grammar_perfection");
      assert.equal(flawless.isUnlocked, true);
    });
  });

  // ==========================================
  // SECTION 3: LEARNING STREAKS
  // ==========================================
  describe("4. Streak Continuity and Date Boundaries", () => {
    test("4.1: Single practice day produces currentStreak of 1", () => {
      const activities = [
        { id: "a1", status: "completed", timestamp: "2026-10-22T08:00:00Z" },
      ];
      const streak = calculateStreak(activities, new Date("2026-10-22T10:00:00Z"));
      assert.equal(streak.currentStreak, 1);
      assert.equal(streak.hasPracticedToday, true);
      assert.equal(streak.longestStreak, 1);
    });

    test("4.2: Consecutive days unbroken streak calculation", () => {
      const activities = [
        { id: "a1", status: "completed", timestamp: "2026-10-22T10:00:00Z" },
        { id: "a2", status: "completed", timestamp: "2026-10-21T10:00:00Z" },
        { id: "a3", status: "completed", timestamp: "2026-10-20T10:00:00Z" },
      ];
      const streak = calculateStreak(activities, new Date("2026-10-22T12:00:00Z"));
      assert.equal(streak.currentStreak, 3);
      assert.equal(streak.longestStreak, 3);
    });

    test("4.3: Missed day breaks current streak but preserves longest streak", () => {
      const activities = [
        // Today
        { id: "a1", status: "completed", timestamp: "2026-10-22T10:00:00Z" },
        // Yesterday (2026-10-21) missed!
        // 3 consecutive days earlier
        { id: "a2", status: "completed", timestamp: "2026-10-20T10:00:00Z" },
        { id: "a3", status: "completed", timestamp: "2026-10-19T10:00:00Z" },
        { id: "a4", status: "completed", timestamp: "2026-10-18T10:00:00Z" },
      ];
      const streak = calculateStreak(activities, new Date("2026-10-22T12:00:00Z"));
      assert.equal(streak.currentStreak, 1);
      assert.equal(streak.longestStreak, 3);
    });

    test("4.4: Multiple activities on the same calendar day count as 1 practice day", () => {
      const activities = [
        { id: "a1", status: "completed", timestamp: "2026-10-22T08:00:00Z" },
        { id: "a2", status: "completed", timestamp: "2026-10-22T12:00:00Z" },
        { id: "a3", status: "completed", timestamp: "2026-10-22T18:00:00Z" },
      ];
      const streak = calculateStreak(activities, new Date("2026-10-22T20:00:00Z"));
      assert.equal(streak.currentStreak, 1);
      assert.equal(streak.activeDaysCount, 1);
    });
  });

  // ==========================================
  // SECTION 4: WEEKLY LEARNING REVIEW
  // ==========================================
  describe("5. Weekly Learning Review Engine", () => {
    test("5.1: Accurately summarizes completed activities and active duration for the target week", () => {
      const activities = [
        { id: "w1", module: "speaking", status: "completed", score: 80, durationSeconds: 600, timestamp: "2026-10-21T10:00:00Z" },
        { id: "w2", module: "grammar", status: "completed", score: 90, durationSeconds: 300, timestamp: "2026-10-22T11:00:00Z" },
        // Activity from 2 weeks ago (should NOT be in current week)
        { id: "old", module: "dictation", status: "completed", score: 70, durationSeconds: 600, timestamp: "2026-10-01T10:00:00Z" },
      ];

      const review = generateWeeklyReview(activities, { referenceDate: "2026-10-22" });

      assert.equal(review.overview.hasActivity, true);
      assert.equal(review.overview.totalCompletedActivities, 2);
      assert.equal(review.overview.totalPracticeMinutes, 15); // 900s = 15m
      assert.equal(review.overview.activeDaysCount, 2);
    });

    test("5.2: Detects improving and declining skills when compared against prior week", () => {
      const activities = [
        // Current week (week of 2026-10-19 to 2026-10-25)
        { id: "c1", module: "grammar", status: "completed", score: 90, durationSeconds: 300, timestamp: "2026-10-20T10:00:00Z" },
        { id: "c2", module: "speaking", status: "completed", score: 70, durationSeconds: 300, timestamp: "2026-10-21T10:00:00Z" },
        // Prior week (week of 2026-10-12 to 2026-10-18)
        { id: "p1", module: "grammar", status: "completed", score: 75, durationSeconds: 300, timestamp: "2026-10-14T10:00:00Z" },
        { id: "p2", module: "speaking", status: "completed", score: 85, durationSeconds: 300, timestamp: "2026-10-15T10:00:00Z" },
      ];

      const review = generateWeeklyReview(activities, { referenceDate: "2026-10-22" });

      assert.equal(review.skillSummaries.grammar.trend, "improving"); // 90 vs 75 (+15%)
      assert.equal(review.skillSummaries.speaking.trend, "declining"); // 70 vs 85 (-15%)
      assert.ok(review.analysis.improvements.some((i) => i.module === "grammar"));
      assert.ok(review.analysis.declines.some((d) => d.module === "speaking"));
    });

    test("5.3: Honest empty state for empty calendar week", () => {
      const review = generateWeeklyReview([], { referenceDate: "2026-10-22" });
      assert.equal(review.overview.hasActivity, false);
      assert.equal(review.overview.totalCompletedActivities, 0);
      assert.equal(review.overview.totalPracticeMinutes, 0);
      assert.equal(review.analysis.improvements.length, 0);
    });

    test("5.4: Supports historical weekOffset inspection", () => {
      const activities = [
        { id: "p1", module: "grammar", status: "completed", score: 85, durationSeconds: 300, timestamp: "2026-10-14T10:00:00Z" },
      ];

      // offset 1 is previous week
      const reviewPrev = generateWeeklyReview(activities, { referenceDate: "2026-10-22", weekOffset: 1 });
      assert.equal(reviewPrev.overview.hasActivity, true);
      assert.equal(reviewPrev.overview.totalCompletedActivities, 1);
    });
  });

  // ==========================================
  // SECTION 5: GOAL-AWARE ADAPTIVE PLANNER
  // ==========================================
  describe("6. Goal-Aware Adaptive Daily Plan", () => {
    test("6.1: Respects active user goals by boosting goal-relevant skill tasks", () => {
      const goals = [
        {
          id: "g1",
          goalType: GOAL_TYPES.SKILL_ACTIVITIES,
          skill: "speaking",
          status: "active",
        },
      ];

      const planWithGoal = generateAdaptiveDailyPlan({
        activities: [],
        weaknesses: [],
        targetMinutes: 15,
        goals,
        referenceDate: "2026-10-22",
      });

      // Speaking drill should be included and prioritized
      const speakingTask = planWithGoal.tasks.find((t) => t.module === "speaking");
      assert.ok(speakingTask, "Plan must include speaking task matching active goal");
      assert.ok(speakingTask.reason.includes("goal") || speakingTask.priority === "high");
    });

    test("6.2: Backward compatibility: preserves starter plan when no goals exist", () => {
      const defaultPlan = generateAdaptiveDailyPlan({
        activities: [],
        weaknesses: [],
        targetMinutes: 15,
        referenceDate: "2026-10-22",
      });

      assert.equal(defaultPlan.isStarterPlan, true);
      assert.ok(defaultPlan.tasks.length >= 2);
    });

    test("6.3: Avoids duplicate tasks and preserves daily budget limits", () => {
      const plan = generateAdaptiveDailyPlan({
        activities: [],
        weaknesses: [],
        targetMinutes: 10,
        goals: [{ goalType: GOAL_TYPES.DAILY_MINUTES, targetValue: 10, status: "active" }],
        referenceDate: "2026-10-22",
      });

      const taskIds = plan.tasks.map((t) => t.id);
      const uniqueTaskIds = new Set(taskIds);
      assert.equal(taskIds.length, uniqueTaskIds.size, "No duplicate tasks allowed");
      assert.ok(plan.estimatedMinutes <= 15, "Estimated minutes must respect budget");
    });
  });

  // ==========================================
  // SECTION 6: REPOSITORY PERSISTENCE & USER ISOLATION
  // ==========================================
  describe("7. Repository Layer & User Data Isolation", () => {
    test("7.1: User can create, read, update, and delete goals", async () => {
      const userId = "user_test_1";

      const created = await userRepository.createLearningGoal({
        userId,
        goalType: GOAL_TYPES.DAILY_MINUTES,
        targetValue: 25,
        targetUnit: "minutes",
        status: "active",
      });

      assert.ok(created.id);
      assert.equal(created.userId, userId);
      assert.equal(created.targetValue, 25);

      // Read goals
      const goals = await userRepository.getLearningGoals(userId);
      assert.equal(goals.length, 1);
      assert.equal(goals[0].id, created.id);

      // Update goal
      const updated = await userRepository.updateLearningGoal(created.id, userId, {
        status: "paused",
      });
      assert.equal(updated.status, "paused");

      // Delete goal
      const deleted = await userRepository.deleteLearningGoal(created.id, userId);
      assert.equal(deleted, true);

      const afterDelete = await userRepository.getLearningGoals(userId);
      assert.equal(afterDelete.length, 0);
    });

    test("7.2: User A cannot read, modify, or delete User B's goals (Strict Isolation)", async () => {
      const userA = "user_alpha";
      const userB = "user_beta";

      const goalA = await userRepository.createLearningGoal({
        userId: userA,
        goalType: GOAL_TYPES.DAILY_MINUTES,
        targetValue: 20,
      });

      // User B tries to read User A's goals
      const goalsB = await userRepository.getLearningGoals(userB);
      assert.equal(goalsB.length, 0);

      // User B tries to update User A's goal
      const hackedUpdate = await userRepository.updateLearningGoal(goalA.id, userB, {
        targetValue: 99,
      });
      assert.equal(hackedUpdate, null, "Cross-user update must return null");

      // User B tries to delete User A's goal
      const hackedDelete = await userRepository.deleteLearningGoal(goalA.id, userB);
      assert.equal(hackedDelete, false, "Cross-user delete must return false");

      // Verify User A's goal remains intact
      const goalsA = await userRepository.getLearningGoals(userA);
      assert.equal(goalsA.length, 1);
      assert.equal(goalsA[0].targetValue, 20);
    });

    test("7.3: User achievement persistence prevents duplicate awards", async () => {
      const userId = "user_achiever";

      // First unlock
      const unlock1 = await userRepository.unlockUserAchievement({
        userId,
        achievementId: "first_practice",
        points: 10,
      });
      assert.ok(unlock1.id);
      assert.equal(unlock1.achievementId, "first_practice");

      // Has unlocked check
      const hasUnlocked = await userRepository.hasUserUnlockedAchievement(userId, "first_practice");
      assert.equal(hasUnlocked, true);

      // Duplicate unlock attempt (same user and achievement)
      const duplicateUnlock = await userRepository.unlockUserAchievement({
        userId,
        achievementId: "first_practice",
        points: 10,
      });
      assert.equal(duplicateUnlock.id, unlock1.id, "Must return existing record without creating duplicate");

      const achievements = await userRepository.getUserAchievements(userId);
      assert.equal(achievements.length, 1, "Only 1 record must exist");
    });
  });
});
