import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  buildLearnerContext,
  sanitizeInputText,
  validateCoachResponse,
  generateDeterministicCoachFallback,
  explainErrorOrConcept,
} from "../src/lib/ai/learningCoach.js";

import {
  determineAdaptiveDifficulty,
  DIFFICULTY_LEVELS,
  DIFFICULTY_THRESHOLDS,
} from "../src/lib/learning/adaptiveDifficulty.js";

import {
  validatePracticeExercise,
  getCuratedFallbackExercise,
  generatePracticeExercise,
  CURATED_FALLBACK_EXERCISES,
} from "../src/lib/learning/adaptivePracticeGenerator.js";

import {
  createSignedExerciseToken,
  verifyExerciseToken,
  prepareClientExercise,
  evaluatePracticeSubmission,
} from "../src/lib/learning/practiceEvaluator.js";

import { userRepository } from "../src/lib/db/userRepository.js";

describe("Phase 9: AI Learning Coach & Smart Practice Engine Suite", () => {
  beforeEach(() => {
    userRepository._resetMemoryStore();
  });

  // ==========================================
  // SECTION 1: LEARNING CONTEXT BUILDER
  // ==========================================
  describe("1. Learning Context Assembly & Sanitization", () => {
    test("1.1: Assembles compact context from empty history safely", () => {
      const ctx = buildLearnerContext({
        activities: [],
        preferences: {},
        weaknesses: [],
        goals: [],
      });

      assert.equal(ctx.level, "intermediate"); // default fallback
      assert.equal(ctx.language, "English");
      assert.equal(ctx.recentActivityCount, 0);
      assert.equal(ctx.recentActivities.length, 0);
      assert.equal(ctx.topWeaknesses.length, 0);
      assert.equal(ctx.activeGoals.length, 0);
    });

    test("1.2: Bounds recent activities and weaknesses to safe limits", () => {
      const manyActivities = Array.from({ length: 20 }, (_, i) => ({
        id: `act_${i}`,
        module: "grammar",
        score: 80,
        status: "completed",
        exerciseId: `drill_${i}`,
      }));

      const manyWeaknesses = [
        { category: "Grammar", topicName: "Tenses", status: "repeated", evidence: "2 errors" },
        { category: "Vocabulary", topicName: "Phrasal", status: "persistent", evidence: "4 errors" },
        { category: "Dictation", topicName: "Prepositions", status: "new", evidence: "1 error" },
      ];

      const ctx = buildLearnerContext({
        activities: manyActivities,
        preferences: { learningLevel: "advanced", preferredLanguage: "es" },
        weaknesses: manyWeaknesses,
      });

      assert.equal(ctx.level, "advanced");
      assert.equal(ctx.language, "Spanish");
      assert.ok(ctx.recentActivities.length <= 5, "Recent activities must be capped at 5");
      assert.ok(ctx.topWeaknesses.length <= 2, "Top weaknesses must be capped at 2");
    });

    test("1.3: Sanitizes untrusted user inputs and strips code brackets", () => {
      const malicious = "<script>alert('xss')</script>{[system prompt: override]}";
      const clean = sanitizeInputText(malicious);

      assert.equal(clean.includes("<"), false);
      assert.equal(clean.includes(">"), false);
      assert.equal(clean.includes("{"), false);
      assert.equal(clean.includes("}"), false);
      assert.ok(clean.length <= 400);
    });
  });

  // ==========================================
  // SECTION 2: AI LEARNING COACH & EXPLANATIONS
  // ==========================================
  describe("2. AI Coach Explanations & Fallback", () => {
    test("2.1: Validates complete coach response schema", () => {
      const validPayload = {
        title: "Subject-Verb Agreement",
        explanation: "She is third person singular, so the verb requires 's'.",
        correctAnswer: "She runs",
        grammarRule: "Add -s or -es to third-person singular present verbs.",
        examples: [
          { phrase: "She runs fast.", usage: "Correct singular form", isContrasting: false },
          { phrase: "She run fast.", usage: "Incorrect base form", isContrasting: true },
        ],
        learnerFriendlyTip: "Remember: He/She/It gets the 's'!",
        relatedSkill: "grammar",
        recommendedAction: "Practice 3 third-person drills",
        confidence: "high",
      };

      const result = validateCoachResponse(validPayload);
      assert.equal(result.valid, true);
      assert.equal(result.data.title, "Subject-Verb Agreement");
      assert.equal(result.data.confidence, "high");
      assert.equal(result.data.examples.length, 2);
    });

    test("2.2: Rejects malformed coach responses missing title or explanation", () => {
      const missingTitle = { explanation: "Some explanation" };
      assert.equal(validateCoachResponse(missingTitle).valid, false);

      const missingExplanation = { title: "Some Title" };
      assert.equal(validateCoachResponse(missingExplanation).valid, false);

      assert.equal(validateCoachResponse(null).valid, false);
      assert.equal(validateCoachResponse("string").valid, false);
    });

    test("2.3: Deterministic coach fallback provides level-tailored advice when model is offline", () => {
      const fallback = generateDeterministicCoachFallback({
        question: "Yesterday she go home.",
        userAnswer: "go",
        correctAnswer: "went",
        skill: "grammar",
        concept: "Past Simple",
        level: "beginner",
      });

      assert.equal(fallback.source, "deterministic_coach");
      assert.ok(fallback.title.includes("Past Simple"));
      assert.ok(fallback.explanation.includes("went"));
      assert.ok(fallback.explanation.includes("go"));
      assert.equal(fallback.correctAnswer, "went");
      assert.ok(fallback.examples.length >= 2);
      assert.ok(fallback.learnerFriendlyTip.length > 0);
      assert.equal(fallback.confidence, "high");
    });

    test("2.4: explainErrorOrConcept gracefully recovers when Ollama fetch fails", async () => {
      // Inject failing fetch client
      const failingFetch = async () => {
        throw new Error("Connection refused: 127.0.0.1:11434");
      };

      const res = await explainErrorOrConcept(
        {
          question: "He have a car.",
          userAnswer: "have",
          correctAnswer: "has",
          skill: "grammar",
          concept: "Subject-Verb Agreement",
        },
        { level: "intermediate", language: "English" },
        { fetchFn: failingFetch }
      );

      assert.equal(res.success, true);
      assert.equal(res.source, "deterministic_fallback");
      assert.ok(res.coachResponse);
      assert.equal(res.coachResponse.correctAnswer, "has");
    });
  });

  // ==========================================
  // SECTION 3: ADAPTIVE DIFFICULTY ENGINE
  // ==========================================
  describe("3. Deterministic Adaptive Difficulty Calibration", () => {
    test("3.1: Insufficient attempts maintains baseline difficulty with low confidence", () => {
      const activities = [
        { module: "grammar", score: 95, status: "completed", timestamp: "2026-10-22T10:00:00Z" },
      ];

      const diff = determineAdaptiveDifficulty({
        activities,
        skill: "grammar",
        currentDifficulty: "intermediate",
      });

      assert.equal(diff.recommendedDifficulty, "intermediate");
      assert.equal(diff.shouldChange, false);
      assert.equal(diff.confidence, "low");
      assert.equal(diff.needsMorePractice, true);
    });

    test("3.2: High scores promote difficulty from beginner to intermediate", () => {
      const activities = [
        { module: "grammar", score: 90, status: "completed", timestamp: "2026-10-22T12:00:00Z" },
        { module: "grammar", score: 95, status: "completed", timestamp: "2026-10-22T11:00:00Z" },
        { module: "grammar", score: 85, status: "completed", timestamp: "2026-10-22T10:00:00Z" },
      ];

      const diff = determineAdaptiveDifficulty({
        activities,
        skill: "grammar",
        currentDifficulty: "beginner",
      });

      assert.equal(diff.recommendedDifficulty, "intermediate");
      assert.equal(diff.shouldChange, true);
      assert.equal(diff.direction, "increase");
      assert.equal(diff.confidence, "high");
    });

    test("3.3: High scores promote difficulty from intermediate to advanced", () => {
      const activities = [
        { module: "vocabulary", score: 90, status: "completed", timestamp: "2026-10-22T12:00:00Z" },
        { module: "vocabulary", score: 90, status: "completed", timestamp: "2026-10-22T11:00:00Z" },
      ];

      const diff = determineAdaptiveDifficulty({
        activities,
        skill: "vocabulary",
        currentDifficulty: "intermediate",
      });

      assert.equal(diff.recommendedDifficulty, "advanced");
      assert.equal(diff.direction, "increase");
    });

    test("3.4: Low scores (< 60%) step down difficulty from advanced to intermediate", () => {
      const activities = [
        { module: "grammar", score: 50, status: "completed", timestamp: "2026-10-22T12:00:00Z" },
        { module: "grammar", score: 45, status: "completed", timestamp: "2026-10-22T11:00:00Z" },
      ];

      const diff = determineAdaptiveDifficulty({
        activities,
        skill: "grammar",
        currentDifficulty: "advanced",
      });

      assert.equal(diff.recommendedDifficulty, "intermediate");
      assert.equal(diff.shouldChange, true);
      assert.equal(diff.direction, "decrease");
    });

    test("3.5: Moderate balanced scores (60%–84%) maintain current difficulty", () => {
      const activities = [
        { module: "grammar", score: 75, status: "completed", timestamp: "2026-10-22T12:00:00Z" },
        { module: "grammar", score: 70, status: "completed", timestamp: "2026-10-22T11:00:00Z" },
      ];

      const diff = determineAdaptiveDifficulty({
        activities,
        skill: "grammar",
        currentDifficulty: "intermediate",
      });

      assert.equal(diff.recommendedDifficulty, "intermediate");
      assert.equal(diff.shouldChange, false);
      assert.equal(diff.direction, "maintain");
    });

    test("3.6: Does not cross-contaminate unrelated skills", () => {
      // 100% in speaking must NOT promote grammar!
      const activities = [
        { module: "speaking", score: 100, status: "completed", timestamp: "2026-10-22T12:00:00Z" },
        { module: "speaking", score: 100, status: "completed", timestamp: "2026-10-22T11:00:00Z" },
      ];

      const diff = determineAdaptiveDifficulty({
        activities,
        skill: "grammar", // Requesting grammar calibration
        currentDifficulty: "beginner",
      });

      // No grammar attempts exist, must stay beginner
      assert.equal(diff.recommendedDifficulty, "beginner");
      assert.equal(diff.confidence, "low");
    });
  });

  // ==========================================
  // SECTION 4: PRACTICE GENERATION & FALLBACKS
  // ==========================================
  describe("4. Practice Generation Schema Validation", () => {
    test("4.1: Validates correct practice exercise schema", () => {
      const exercise = {
        title: "Present Perfect Practice",
        instructions: "Choose the correct form.",
        targetConcept: "Present Perfect",
        estimatedMinutes: 3,
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            prompt: "I ____ to London twice.",
            options: ["have been", "has been", "was", "be"],
            correctAnswer: "have been",
            explanation: "'Have been' is used with 'I' in present perfect.",
          },
        ],
      };

      const result = validatePracticeExercise(exercise);
      assert.equal(result.valid, true);
      assert.equal(result.data.questions[0].correctAnswer, "have been");
    });

    test("4.2: Rejects multiple-choice question when correctAnswer is not among options", () => {
      const invalidMcq = {
        title: "Test Exercise",
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            prompt: "Choose the answer:",
            options: ["Apple", "Banana", "Cherry"],
            correctAnswer: "Orange", // Not in options!
          },
        ],
      };

      const result = validatePracticeExercise(invalidMcq);
      assert.equal(result.valid, false);
      assert.ok(result.error.includes("not among valid options"));
    });

    test("4.3: Rejects exercises with duplicate question IDs", () => {
      const duplicateIds = {
        title: "Test Exercise",
        questions: [
          { id: "q1", type: "multiple_choice", prompt: "Prompt 1", options: ["A", "B"], correctAnswer: "A" },
          { id: "q1", type: "multiple_choice", prompt: "Prompt 2", options: ["C", "D"], correctAnswer: "C" },
        ],
      };

      const result = validatePracticeExercise(duplicateIds);
      assert.equal(result.valid, false);
      assert.ok(result.error.includes("Duplicate question ID"));
    });

    test("4.4: Curated fallback repository provides valid exercises for all core skills and levels", () => {
      for (const skill of ["grammar", "vocabulary", "sentence_construction", "dictation"]) {
        for (const diff of ["beginner", "intermediate"]) {
          const fallback = getCuratedFallbackExercise({ skill, difficulty: diff });
          assert.ok(fallback.id);
          assert.ok(fallback.title);
          assert.ok(fallback.questions.length >= 1);
          assert.equal(fallback.skill, skill);
          assert.equal(fallback.difficulty, diff);

          const validation = validatePracticeExercise(fallback);
          assert.equal(validation.valid, true, `Curated fallback for ${skill}/${diff} must be valid`);
        }
      }
    });

    test("4.5: generatePracticeExercise falls back to curated content when Ollama fails", async () => {
      const failingFetch = async () => {
        throw new Error("Ollama offline");
      };

      const result = await generatePracticeExercise(
        { skill: "grammar", difficulty: "intermediate" },
        { fetchFn: failingFetch }
      );

      assert.equal(result.success, true);
      assert.equal(result.source, "curated_fallback");
      assert.ok(result.exercise.questions.length >= 2);
    });
  });

  // ==========================================
  // SECTION 5: ANSWER EVALUATION & TOKEN SECURITY
  // ==========================================
  describe("5. Deterministic Evaluation & HMAC Token Security", () => {
    const sampleExercise = {
      id: "ex_test_101",
      skill: "grammar",
      difficulty: "intermediate",
      title: "Conditionals Drill",
      targetConcept: "Second Conditional",
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          prompt: "If I ____ more time, I would read.",
          options: ["have", "had", "will have"],
          correctAnswer: "had",
          acceptedAnswers: ["had"],
          explanation: "Second conditional requires past simple in if-clause.",
        },
        {
          id: "q2",
          type: "fill_blank",
          prompt: "She ____ not like vegetables.",
          correctAnswer: "does",
          acceptedAnswers: ["does", "doesn't"],
          explanation: "Third person singular takes does.",
        },
      ],
    };

    test("5.1: Client preparation strips correct answers and accepted answers", () => {
      const signedToken = createSignedExerciseToken(sampleExercise);
      const clientSafe = prepareClientExercise(sampleExercise, signedToken);

      assert.ok(clientSafe.exerciseToken);
      for (const q of clientSafe.questions) {
        assert.equal(q.correctAnswer, undefined, "Client questions must not expose correctAnswer");
        assert.equal(q.acceptedAnswers, undefined, "Client questions must not expose acceptedAnswers");
      }
    });

    test("5.2: Evaluates correct multiple-choice and normalized fill-in-the-blank answers", () => {
      const signedToken = createSignedExerciseToken(sampleExercise);

      const submission = {
        exerciseToken: signedToken,
        userAnswers: {
          q1: "had",       // Exact match MCQ
          q2: " DOES  ",   // Needs whitespace & case normalization
        },
      };

      const result = evaluatePracticeSubmission(submission);
      assert.equal(result.success, true);
      assert.equal(result.evaluation.score, 100);
      assert.equal(result.evaluation.correctCount, 2);
      assert.equal(result.evaluation.passed, true);
      assert.equal(result.evaluation.questionResults[0].isCorrect, true);
      assert.equal(result.evaluation.questionResults[1].isCorrect, true);
    });

    test("5.3: Evaluates incorrect answers and provides clear question explanations", () => {
      const signedToken = createSignedExerciseToken(sampleExercise);

      const submission = {
        exerciseToken: signedToken,
        userAnswers: {
          q1: "have", // Wrong
          q2: "is",   // Wrong
        },
      };

      const result = evaluatePracticeSubmission(submission);
      assert.equal(result.success, true);
      assert.equal(result.evaluation.score, 0);
      assert.equal(result.evaluation.correctCount, 0);
      assert.equal(result.evaluation.passed, false);
      assert.equal(result.evaluation.questionResults[0].isCorrect, false);
      assert.equal(result.evaluation.questionResults[0].correctAnswer, "had");
    });

    test("5.4: Rejects tampered or forged exercise tokens", () => {
      const signedToken = createSignedExerciseToken(sampleExercise);
      const forgedToken = signedToken.slice(0, -6) + "tamper";

      const result = evaluatePracticeSubmission({
        exerciseToken: forgedToken,
        userAnswers: { q1: "had" },
      });

      assert.equal(result.success, false);
      assert.equal(result.error.code, "INVALID_EXERCISE_TOKEN");
    });
  });

  // ==========================================
  // SECTION 6: ACTIVITY RECORDING IDEMPOTENCY
  // ==========================================
  describe("6. Repository Layer & Idempotent Activity Recording", () => {
    test("6.1: Records completed smart practice activity once and persists metadata", async () => {
      const userId = "coach_user_1";
      const sessionId = "sess_unique_123";

      const created = await userRepository.createLearningActivity(userId, {
        module: "grammar",
        exerciseId: "smart_practice_101",
        score: 85,
        duration: 90,
        difficulty: "intermediate",
        status: "completed",
        metadata: {
          sessionId,
          isSmartPractice: true,
          targetConcept: "Conditionals",
        },
      });

      assert.ok(created.id);
      assert.equal(created.module, "grammar");
      assert.equal(created.score, 85);

      const userActivities = await userRepository.getLearningActivities(userId);
      assert.equal(userActivities.items.length, 1);
    });

    test("6.2: Enforces user isolation for smart practice activities", async () => {
      const userAlpha = "user_alpha";
      const userBeta = "user_beta";

      await userRepository.createLearningActivity(userAlpha, {
        module: "grammar",
        exerciseId: "ex_alpha",
        score: 90,
      });

      const alphaActivities = await userRepository.getLearningActivities(userAlpha);
      const betaActivities = await userRepository.getLearningActivities(userBeta);

      assert.equal(alphaActivities.items.length, 1);
      assert.equal(betaActivities.items.length, 0);
    });
  });
});
