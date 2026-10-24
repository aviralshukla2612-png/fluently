import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  computeLearningAnalytics,
  calculateAverageScore,
  calculateTotalDurationSeconds,
  computePerformanceTrend,
  TRACKED_SKILLS,
  SKILL_METADATA,
} from "../src/lib/learning/learningAnalytics.js";

import {
  detectWeaknesses,
  determineWeaknessStatus,
  determineSeverity,
  determineConfidence,
} from "../src/lib/learning/weaknessDetector.js";

import {
  generateRecommendations,
} from "../src/lib/learning/learningRecommendations.js";

import {
  generateAdaptiveDailyPlan,
  evaluateAdaptivePlan,
  ALLOWED_TIME_BUDGETS,
  DEFAULT_TIME_BUDGET,
} from "../src/lib/learning/dailyLearningPlan.js";

import {
  buildInsightsPrompt,
  generateDeterministicInsightsFallback,
} from "../src/lib/ai/learningInsightsPrompt.js";

import { userRepository } from "../src/lib/db/userRepository.js";

describe("Phase 7: Personalized Learning Intelligence Engine Suite", () => {
  beforeEach(() => {
    userRepository._resetMemoryStore();
  });

  // ==========================================
  // SECTION 1: LEARNING ANALYTICS
  // ==========================================
  describe("1. Learning Analytics Calculation", () => {
    test("Test 1.1: Empty learning history returns clean zeroed state without errors", () => {
      const analytics = computeLearningAnalytics([], { referenceDate: "2026-10-22" });

      assert.equal(analytics.summary.totalCompletedActivities, 0);
      assert.equal(analytics.summary.totalDurationMinutes, 0);
      assert.equal(analytics.summary.overallAverageScore, null);
      assert.equal(analytics.summary.currentStreak, 0);
      assert.equal(analytics.summary.hasSufficientData, false);

      for (const skillKey of TRACKED_SKILLS) {
        const skill = analytics.skills[skillKey];
        assert.ok(skill);
        assert.equal(skill.attempts, 0);
        assert.equal(skill.averageScore, null);
        assert.equal(skill.status, "insufficient_data");
      }
    });

    test("Test 1.2: Pronunciation is strictly labeled as text-match, not acoustic phonetics", () => {
      assert.equal(SKILL_METADATA.speaking.isAcoustic, false);
      assert.match(SKILL_METADATA.speaking.name, /Text-Match/i);
      assert.match(SKILL_METADATA.speaking.disclaimer, /speech recognition text alignment/i);

      const analytics = computeLearningAnalytics([
        {
          id: "act-1",
          module: "speaking",
          exerciseId: "sent-01",
          score: 85,
          duration: 30,
          status: "completed",
          timestamp: "2026-10-22T10:00:00Z",
        },
      ]);

      assert.equal(analytics.skills.speaking.isAcoustic, false);
      assert.ok(analytics.skills.speaking.disclaimer);
    });

    test("Test 1.3: Separates activity counts and averages by module without cross-contamination", () => {
      const sampleActivities = [
        { id: "1", module: "speaking", score: 80, duration: 40, status: "completed", timestamp: "2026-10-22T10:00:00Z" },
        { id: "2", module: "speaking", score: 90, duration: 50, status: "completed", timestamp: "2026-10-22T10:05:00Z" },
        { id: "3", module: "grammar", score: 60, duration: 120, status: "completed", timestamp: "2026-10-22T10:10:00Z" },
        { id: "4", module: "dictation", score: 100, duration: 60, status: "completed", timestamp: "2026-10-22T10:15:00Z" },
      ];

      const analytics = computeLearningAnalytics(sampleActivities, { referenceDate: "2026-10-22" });

      assert.equal(analytics.summary.totalCompletedActivities, 4);
      assert.equal(analytics.skills.speaking.attempts, 2);
      assert.equal(analytics.skills.speaking.averageScore, 85);
      assert.equal(analytics.skills.grammar.attempts, 1);
      assert.equal(analytics.skills.grammar.averageScore, 60);
      assert.equal(analytics.skills.dictation.attempts, 1);
      assert.equal(analytics.skills.dictation.averageScore, 100);
      assert.equal(analytics.skills.vocabulary.attempts, 0);
      assert.equal(analytics.skills.vocabulary.averageScore, null);
    });

    test("Test 1.4: Performance trend compares current window against prior period", () => {
      const currentWindow = [
        { score: 90 },
        { score: 95 },
      ];
      const previousWindow = [
        { score: 70 },
        { score: 75 },
      ];

      const trend = computePerformanceTrend(currentWindow, previousWindow);
      assert.equal(trend.direction, "improving");
      assert.equal(trend.status, "active");
      assert.equal(trend.change, 20);

      // Declining trend
      const decliningTrend = computePerformanceTrend(previousWindow, currentWindow);
      assert.equal(decliningTrend.direction, "declining");
      assert.equal(decliningTrend.change, -20);

      // Insufficient data trend
      const emptyTrend = computePerformanceTrend([], previousWindow);
      assert.equal(emptyTrend.direction, "insufficient_data");
      assert.equal(emptyTrend.status, "insufficient_data");
    });

    test("Test 1.5: Safely handles malformed records, null scores, and missing timestamps", () => {
      const dirtyActivities = [
        null,
        {},
        { module: "grammar", score: null, duration: null, status: "completed", timestamp: null },
        { module: "dictation", score: NaN, duration: "invalid", status: "completed", timestamp: "not-a-date" },
        { module: "speaking", score: 88, duration: 45, status: "completed", timestamp: "2026-10-22T08:00:00Z" },
      ];

      const analytics = computeLearningAnalytics(dirtyActivities, { referenceDate: "2026-10-22" });
      assert.ok(analytics);
      assert.equal(analytics.skills.speaking.averageScore, 88);
      assert.equal(analytics.skills.speaking.totalDurationSeconds, 45);
    });
  });

  // ==========================================
  // SECTION 2: WEAKNESS DETECTION
  // ==========================================
  describe("2. Weakness Detection Engine", () => {
    test("Test 2.1: Single isolated mistake is marked as insufficient_data or low confidence", () => {
      const singleMistakeActivities = [
        {
          id: "act-g1",
          module: "grammar",
          exerciseId: "gram-b-past-simple",
          score: 50,
          status: "completed",
          timestamp: "2026-10-22T10:00:00Z",
          metadata: { lessonTitle: "Past Simple", questionsCount: 4, correctCount: 2 },
        },
      ];

      const weaknesses = detectWeaknesses(singleMistakeActivities);
      assert.equal(weaknesses.length, 1);
      assert.equal(weaknesses[0].status, "insufficient_data");
      assert.equal(weaknesses[0].confidence, "low");
      assert.equal(weaknesses[0].attemptCount, 1);
    });

    test("Test 2.2: Repeated grammar mistakes across attempts are flagged with high confidence", () => {
      const repeatedGrammarActivities = [
        {
          id: "act-g1",
          module: "grammar",
          exerciseId: "gram-b-past-simple",
          score: 50,
          status: "completed",
          timestamp: "2026-10-20T10:00:00Z",
          metadata: { lessonTitle: "Past Simple", questionsCount: 4, correctCount: 2 },
        },
        {
          id: "act-g2",
          module: "grammar",
          exerciseId: "gram-b-past-simple",
          score: 40,
          status: "completed",
          timestamp: "2026-10-21T10:00:00Z",
          metadata: { lessonTitle: "Past Simple", questionsCount: 4, correctCount: 1 },
        },
        {
          id: "act-g3",
          module: "grammar",
          exerciseId: "gram-b-past-simple",
          score: 50,
          status: "completed",
          timestamp: "2026-10-22T10:00:00Z",
          metadata: { lessonTitle: "Past Simple", questionsCount: 4, correctCount: 2 },
        },
        {
          id: "act-g4",
          module: "grammar",
          exerciseId: "gram-b-past-simple",
          score: 55,
          status: "completed",
          timestamp: "2026-10-22T14:00:00Z",
          metadata: { lessonTitle: "Past Simple", questionsCount: 4, correctCount: 2 },
        },
      ];

      const weaknesses = detectWeaknesses(repeatedGrammarActivities);
      assert.equal(weaknesses.length, 1);
      assert.equal(weaknesses[0].skill, "grammar");
      assert.equal(weaknesses[0].category, "Past Simple");
      assert.equal(weaknesses[0].confidence, "high");
      assert.equal(weaknesses[0].status, "persistent");
      assert.equal(weaknesses[0].severity, "high");
      assert.ok(weaknesses[0].evidence.includes("Past Simple") || weaknesses[0].evidence.includes("mistake"));
    });

    test("Test 2.3: Frequently missed vocabulary words rated 'again' or 'hard' are detected", () => {
      const vocabActivities = [
        {
          id: "v1",
          module: "vocabulary",
          exerciseId: "ephemeral",
          score: 40,
          status: "completed",
          timestamp: "2026-10-21T09:00:00Z",
          metadata: { word: "ephemeral", rating: "again", isCorrect: false },
        },
        {
          id: "v2",
          module: "vocabulary",
          exerciseId: "ephemeral",
          score: 50,
          status: "completed",
          timestamp: "2026-10-22T09:00:00Z",
          metadata: { word: "ephemeral", rating: "hard", isCorrect: false },
        },
      ];

      const weaknesses = detectWeaknesses(vocabActivities);
      const vocabWeakness = weaknesses.find((w) => w.skill === "vocabulary");
      assert.ok(vocabWeakness);
      assert.equal(vocabWeakness.targetWord, "ephemeral");
      assert.equal(vocabWeakness.errorCount, 2);
      assert.equal(vocabWeakness.status, "repeated");
      assert.equal(vocabWeakness.severity, "high");
    });

    test("Test 2.4: Learner improving score over time is categorized as improving", () => {
      const status = determineWeaknessStatus({
        attemptCount: 3,
        errorCount: 1,
        scores: [40, 60, 85],
      });
      assert.equal(status, "improving");
    });
  });

  // ==========================================
  // SECTION 3: RECOMMENDATIONS
  // ==========================================
  describe("3. Recommendations Engine", () => {
    test("Test 3.1: Weaknesses map deterministically to verified application routes", () => {
      const weaknesses = [
        {
          id: "w-gram",
          skill: "grammar",
          category: "Past Simple",
          exerciseId: "gram-b-past-simple",
          destination: "/grammar?lesson=gram-b-past-simple",
          severity: "high",
          errorCount: 3,
          evidence: "Observed 3 errors in Past Simple.",
        },
        {
          id: "w-dict",
          skill: "dictation",
          category: "Listening Comprehension",
          destination: "/dictation",
          severity: "high",
          errorCount: 2,
          evidence: "Average accuracy is 55%.",
        },
      ];

      const recommendations = generateRecommendations(weaknesses);
      assert.equal(recommendations.length, 2);

      const validRoutes = ["/grammar", "/dictation", "/say-it", "/vocabulary", "/conversation"];
      for (const rec of recommendations) {
        assert.ok(rec.title);
        assert.ok(rec.explanation);
        assert.ok(rec.supportingEvidence);
        assert.ok(validRoutes.some((route) => rec.destination.startsWith(route)), `Destination ${rec.destination} must be a valid route`);
      }
    });

    test("Test 3.2: High-performing learner receives progression challenge recommendation", () => {
      const analytics = {
        summary: {
          overallAverageScore: 92,
          totalCompletedActivities: 15,
        },
      };

      const recommendations = generateRecommendations([], analytics);
      const conversationRec = recommendations.find((r) => r.targetSkill === "conversation");
      assert.ok(conversationRec);
      assert.equal(conversationRec.destination, "/conversation");
    });

    test("Test 3.3: Empty weaknesses provide balanced beginner starter recommendations", () => {
      const recommendations = generateRecommendations([], null);
      assert.ok(recommendations.length >= 3);
      const skills = recommendations.map((r) => r.targetSkill);
      assert.ok(skills.includes("speaking"));
      assert.ok(skills.includes("dictation"));
      assert.ok(skills.includes("grammar"));
    });
  });

  // ==========================================
  // SECTION 4: ADAPTIVE DAILY PLAN
  // ==========================================
  describe("4. Adaptive Daily Learning Plan", () => {
    test("Test 4.1: Plan strictly respects chosen time budget (5, 10, 15, 20, 30 min)", () => {
      for (const budget of ALLOWED_TIME_BUDGETS) {
        const plan = generateAdaptiveDailyPlan({
          activities: [],
          weaknesses: [],
          targetMinutes: budget,
          referenceDate: "2026-10-22",
        });

        assert.equal(plan.targetMinutes, budget);
        assert.ok(plan.tasks.length >= 1, `Budget of ${budget}m must have at least 1 task`);
        assert.ok(
          plan.estimatedMinutes <= budget + 1,
          `Plan estimated minutes (${plan.estimatedMinutes}m) should respect budget of ${budget}m`
        );
      }
    });

    test("Test 4.2: Tasks have unique IDs, valid routes, and no duplicates", () => {
      const plan = generateAdaptiveDailyPlan({
        activities: [],
        weaknesses: [],
        targetMinutes: 20,
        referenceDate: "2026-10-22",
      });

      const ids = plan.tasks.map((t) => t.id);
      const uniqueIds = new Set(ids);
      assert.equal(ids.length, uniqueIds.size, "Task IDs must be strictly unique");

      for (const task of plan.tasks) {
        assert.ok(task.title);
        assert.ok(task.href);
        assert.ok(task.href.startsWith("/"));
        assert.ok(task.estimatedMinutes > 0);
      }
    });

    test("Test 4.3: Evaluates real completion against recorded activities today", () => {
      const plan = generateAdaptiveDailyPlan({
        activities: [],
        weaknesses: [],
        targetMinutes: 15,
        referenceDate: "2026-10-22",
      });

      // Initially 0 completed
      const eval0 = evaluateAdaptivePlan(plan, [], "2026-10-22");
      assert.equal(eval0.completedCount, 0);
      assert.equal(eval0.percentage, 0);

      // Complete speaking and dictation today
      const todayActivities = [
        { module: "speaking", status: "completed", timestamp: "2026-10-22T10:00:00Z" },
        { module: "dictation", status: "completed", timestamp: "2026-10-22T11:00:00Z" },
      ];

      const evalToday = evaluateAdaptivePlan(plan, todayActivities, "2026-10-22");
      assert.ok(evalToday.completedCount >= 1);
      assert.ok(evalToday.percentage > 0);
      assert.ok(evalToday.completedMinutes > 0);
    });

    test("Test 4.4: Flags starter plan when learning history is empty", () => {
      const plan = generateAdaptiveDailyPlan({
        activities: [],
        weaknesses: [],
        targetMinutes: 15,
      });

      assert.equal(plan.isStarterPlan, true);
    });
  });

  // ==========================================
  // SECTION 5: AI TUTOR INSIGHTS & FALLBACK
  // ==========================================
  describe("5. AI Tutor Insights & Guardrails", () => {
    test("Test 5.1: Deterministic insights fallback provides inspiring, verified feedback", () => {
      const analytics = {
        summary: {
          totalCompletedActivities: 8,
          currentStreak: 4,
          overallAverageScore: 82,
          totalDurationMinutes: 35,
        },
      };

      const fallback = generateDeterministicInsightsFallback({ analytics, weaknesses: [] });
      assert.equal(fallback.source, "deterministic_engine");
      assert.ok(fallback.summary.includes("8 learning exercise"));
      assert.ok(fallback.summary.includes("4 day"));
      assert.ok(fallback.encouragement.includes("4-day streak"));
      assert.ok(fallback.focusTip);
    });

    test("Test 5.2: Ollama insights prompt includes strictly bounded data without inventing numbers", () => {
      const analytics = {
        summary: {
          totalCompletedActivities: 12,
          currentStreak: 3,
          overallAverageScore: 78,
          totalDurationMinutes: 45,
        },
      };

      const weaknesses = [
        {
          category: "Past Simple",
          evidence: "Observed 3 errors across 4 attempts.",
        },
      ];

      const prompt = buildInsightsPrompt({ analytics, weaknesses, language: "en" });
      assert.ok(prompt.includes("Completed activities: 12"));
      assert.ok(prompt.includes("Current streak: 3 day(s)"));
      assert.ok(prompt.includes("Overall average score: 78%"));
      assert.ok(prompt.includes("Past Simple"));
    });
  });

  // ==========================================
  // SECTION 6: USER OWNERSHIP & SECURITY
  // ==========================================
  describe("6. User Ownership & Data Isolation", () => {
    test("Test 6.1: User A activities are strictly isolated from User B", async () => {
      const userA = await userRepository.createUser({
        email: "alice@test.com",
        passwordHash: "hash123",
        displayName: "Alice",
      });

      const userB = await userRepository.createUser({
        email: "bob@test.com",
        passwordHash: "hash123",
        displayName: "Bob",
      });

      // Record activity for User A
      await userRepository.recordLearningActivity(userA.id, {
        module: "grammar",
        exerciseId: "gram-b-past-simple",
        score: 95,
        duration: 120,
        status: "completed",
      });

      // Query User A
      const actsA = await userRepository.getLearningActivities(userA.id);
      assert.equal(actsA.items.length, 1);
      assert.equal(actsA.items[0].module, "grammar");

      // Query User B (must be 0)
      const actsB = await userRepository.getLearningActivities(userB.id);
      assert.equal(actsB.items.length, 0);
    });

    test("Test 6.2: User daily plans are isolated and do not overwrite other users", async () => {
      const userA = await userRepository.createUser({
        email: "charlie@test.com",
        passwordHash: "hash123",
        displayName: "Charlie",
      });

      const userB = await userRepository.createUser({
        email: "diana@test.com",
        passwordHash: "hash123",
        displayName: "Diana",
      });

      await userRepository.upsertDailyPlan(userA.id, {
        planDate: "2026-10-22",
        tasks: [{ id: "t1", module: "speaking" }],
      });

      const planA = await userRepository.getDailyPlan(userA.id, "2026-10-22");
      assert.ok(planA);

      const planB = await userRepository.getDailyPlan(userB.id, "2026-10-22");
      assert.equal(planB, null);
    });
  });
});
