import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { hashPassword, verifyPassword } from "../src/lib/auth/password.js";
import {
  createSessionToken,
  verifySessionToken,
  buildSessionCookie,
  buildClearSessionCookie,
  SESSION_COOKIE_NAME,
} from "../src/lib/auth/session.js";
import { checkRateLimit, resetRateLimit } from "../src/lib/auth/rateLimiter.js";
import { userRepository } from "../src/lib/db/userRepository.js";

describe("Phase 6 Authentication & Cryptography", () => {
  beforeEach(() => {
    userRepository._resetMemoryStore();
  });

  // Test 1: Password hashing and verification
  test("Test 1: Password hashes with bcrypt and verifies accurately", async () => {
    const password = "SuperSecretPassword123!";
    const hash = await hashPassword(password);

    assert(hash !== password, "Hash must not equal plaintext");
    assert(hash.startsWith("$2"), "Hash must follow bcrypt format");

    const isValid = await verifyPassword(password, hash);
    assert.equal(isValid, true, "Valid password must verify");

    const isInvalid = await verifyPassword("WrongPassword", hash);
    assert.equal(isInvalid, false, "Invalid password must be rejected");
  });

  // Test 2: Cryptographic Session Token Signing & Verification
  test("Test 2: Signed session token verifies and extracts payload correctly", () => {
    const payload = {
      userId: "user_test_123",
      email: "learner@example.com",
      displayName: "Alex",
    };

    const token = createSessionToken(payload);
    assert(typeof token === "string");
    assert.equal(token.split(".").length, 3, "Token must be a compact 3-part signed token");

    const verified = verifySessionToken(token);
    assert(verified !== null);
    assert.equal(verified.userId, "user_test_123");
    assert.equal(verified.email, "learner@example.com");
    assert.equal(verified.displayName, "Alex");
    assert(typeof verified.exp === "number");
  });

  // Test 3: Tampered or invalid session token is rejected
  test("Test 3: Tampered token signature is rejected in constant time", () => {
    const token = createSessionToken({ userId: "u1", email: "u1@test.com" });
    const parts = token.split(".");

    // Alter payload
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: "u2_hacked", email: "u2@test.com" })).toString("base64url");
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const result = verifySessionToken(tamperedToken);
    assert.equal(result, null, "Tampered signature must return null");

    // Random non-token string
    assert.equal(verifySessionToken("garbage-string"), null);
  });

  // Test 4: Rate Limiting
  test("Test 4: Rate limiter blocks requests after exceeding threshold and computes retry seconds", () => {
    const key = "test_rate_key_" + Date.now();
    resetRateLimit(key);

    // Max 3 requests per 10 seconds
    const first = checkRateLimit(key, 3, 10000);
    assert.equal(first.allowed, true);
    assert.equal(first.remaining, 2);

    const second = checkRateLimit(key, 3, 10000);
    assert.equal(second.allowed, true);
    assert.equal(second.remaining, 1);

    const third = checkRateLimit(key, 3, 10000);
    assert.equal(third.allowed, true);
    assert.equal(third.remaining, 0);

    // 4th request must be blocked
    const fourth = checkRateLimit(key, 3, 10000);
    assert.equal(fourth.allowed, false);
    assert(fourth.retryAfterSeconds > 0, "Must calculate retry delay");

    // Resetting rate limit restores access
    resetRateLimit(key);
    const resetAttempt = checkRateLimit(key, 3, 10000);
    assert.equal(resetAttempt.allowed, true);
  });

  // Test 5: Cookie formatting
  test("Test 5: Session cookie builders configure secure HttpOnly headers", () => {
    const token = "mock.jwt.token";
    const cookie = buildSessionCookie(token);
    assert(cookie.includes(`${SESSION_COOKIE_NAME}=${token}`));
    assert(cookie.includes("HttpOnly"));
    assert(cookie.includes("SameSite=Lax"));
    assert(cookie.includes("Path=/"));

    const clearCookie = buildClearSessionCookie();
    assert(clearCookie.includes(`${SESSION_COOKIE_NAME}=;`));
    assert(clearCookie.includes("Max-Age=0"));
  });
});

describe("Phase 6 User Repository & Database Layer", () => {
  beforeEach(() => {
    userRepository._resetMemoryStore();
  });

  // Test 6: User registration and retrieval
  test("Test 6: User creation initializes profile and default preferences", async () => {
    const user = await userRepository.createUser({
      email: "jane.doe@example.com",
      passwordHash: "$2a$12$mockhash",
      displayName: "Jane",
    });

    assert(user.id);
    assert.equal(user.email, "jane.doe@example.com");
    assert.equal(user.displayName, "Jane");

    const found = await userRepository.findUserByEmail("jane.doe@example.com");
    assert.equal(found.id, user.id);

    const prefs = await userRepository.getUserPreferences(user.id);
    assert.equal(prefs.learningLevel, "intermediate");
    assert.equal(prefs.correctionMode, "gentle");
    assert.equal(prefs.autoSpeakReplies, true);
  });

  // Test 7: User preferences update
  test("Test 7: Updating user preferences persists new settings", async () => {
    const user = await userRepository.createUser({
      email: "alex@example.com",
      passwordHash: "hash",
      displayName: "Alex",
    });

    const updated = await userRepository.updateUserPreferences(user.id, {
      learningLevel: "advanced",
      correctionMode: "tutor",
      dailyTargetMinutes: 25,
      autoSpeakReplies: false,
    });

    assert.equal(updated.learningLevel, "advanced");
    assert.equal(updated.correctionMode, "tutor");
    assert.equal(updated.dailyTargetMinutes, 25);
    assert.equal(updated.autoSpeakReplies, false);
  });

  // Test 8: Learning Activity creation & pagination
  test("Test 8: Recording activities supports pagination and module filtering", async () => {
    const user = await userRepository.createUser({
      email: "learner@test.com",
      passwordHash: "hash",
      displayName: "Learner",
    });

    // Record speaking and dictation activities
    await userRepository.recordLearningActivity(user.id, {
      module: "speaking",
      exerciseId: "ex-1",
      score: 95,
      difficulty: "beginner",
    });

    await userRepository.recordLearningActivity(user.id, {
      module: "dictation",
      exerciseId: "dic-1",
      score: 88,
      difficulty: "intermediate",
    });

    const all = await userRepository.getLearningActivities(user.id, { limit: 10, page: 1 });
    assert.equal(all.totalCount, 2);
    assert.equal(all.items.length, 2);

    const onlySpeaking = await userRepository.getLearningActivities(user.id, { module: "speaking" });
    assert.equal(onlySpeaking.totalCount, 1);
    assert.equal(onlySpeaking.items[0].module, "speaking");
  });

  // Test 9: Vocabulary saved words and review scheduling
  test("Test 9: Vocabulary words toggle and review state updates cleanly", async () => {
    const user = await userRepository.createUser({
      email: "vocab@test.com",
      passwordHash: "hash",
      displayName: "VocabUser",
    });

    // Toggle saved word
    const res1 = await userRepository.toggleSavedWord(user.id, "ephemeral");
    assert.equal(res1.saved, true);

    const savedList = await userRepository.getSavedVocabulary(user.id);
    assert(savedList.includes("ephemeral"));

    // Toggle again removes
    const res2 = await userRepository.toggleSavedWord(user.id, "ephemeral");
    assert.equal(res2.saved, false);

    // Update review schedule
    await userRepository.updateVocabularyProgress(user.id, {
      wordId: "serendipity",
      reviewInterval: 3,
      nextReviewDate: "2026-10-25",
      reviewCount: 2,
      learningStatus: "reviewing",
    });

    const progress = await userRepository.getVocabularyProgress(user.id);
    assert.equal(progress.length, 1);
    assert.equal(progress[0].wordId, "serendipity");
    assert.equal(progress[0].reviewInterval, 3);
  });

  // Test 10: Grammar progress best score preservation
  test("Test 10: Grammar progress update preserves higher previous score", async () => {
    const user = await userRepository.createUser({
      email: "grammar@test.com",
      passwordHash: "hash",
      displayName: "GrammarUser",
    });

    // First attempt: score 90
    await userRepository.updateGrammarProgress(user.id, {
      lessonId: "present-perfect",
      score: 90,
      status: "completed",
    });

    // Second attempt: score 75 (lower)
    const second = await userRepository.updateGrammarProgress(user.id, {
      lessonId: "present-perfect",
      score: 75,
      status: "completed",
    });

    assert.equal(second.bestScore, 90, "Best score must not be reduced by a lower score");

    // Third attempt: score 100 (higher)
    const third = await userRepository.updateGrammarProgress(user.id, {
      lessonId: "present-perfect",
      score: 100,
      status: "completed",
    });

    assert.equal(third.bestScore, 100, "Higher score must upgrade the best score");
  });

  // Test 11: Daily Plan persistence
  test("Test 11: Daily learning plan persists tasks and completion state", async () => {
    const user = await userRepository.createUser({
      email: "plan@test.com",
      passwordHash: "hash",
      displayName: "PlanUser",
    });

    const planDate = "2026-10-22";
    await userRepository.upsertDailyPlan(user.id, {
      planDate,
      planVersion: "1.0.0",
      tasks: [{ id: "t1", module: "speaking", title: "Practice Shadowing" }],
      completedState: { t1: true },
    });

    const savedPlan = await userRepository.getDailyPlan(user.id, planDate);
    assert(savedPlan !== null);
    assert.equal(savedPlan.planDate, "2026-10-22");
    assert.equal(savedPlan.tasks.length, 1);
    assert.equal(savedPlan.completedState.t1, true);
  });
});

describe("Phase 6 Authorization & User Isolation", () => {
  beforeEach(() => {
    userRepository._resetMemoryStore();
  });

  // Test 12: User A cannot read or access User B's conversation session
  test("Test 12: Conversation sessions and messages strictly enforce owner isolation", async () => {
    const userA = await userRepository.createUser({
      email: "alice@test.com",
      passwordHash: "hash",
      displayName: "Alice",
    });

    const userB = await userRepository.createUser({
      email: "bob@test.com",
      passwordHash: "hash",
      displayName: "Bob",
    });

    // Alice starts a conversation
    const aliceSession = await userRepository.createConversationSession(userA.id, {
      scenarioId: "restaurant",
      level: "intermediate",
      correctionMode: "gentle",
    });

    // Alice adds a message
    await userRepository.addConversationMessage(userA.id, aliceSession.id, {
      role: "user",
      content: "Hello, table for one please.",
    });

    // Alice can retrieve her session and messages
    const aliceCheck = await userRepository.getConversationSessionById(userA.id, aliceSession.id);
    assert(aliceCheck !== null);
    assert.equal(aliceCheck.messages.length, 1);

    // Bob attempts to read Alice's session -> must return null
    const bobAttempt = await userRepository.getConversationSessionById(userB.id, aliceSession.id);
    assert.equal(bobAttempt, null, "User B must not be able to read User A's session");

    // Bob attempts to add a message to Alice's session -> must throw error
    await assert.rejects(
      async () => {
        await userRepository.addConversationMessage(userB.id, aliceSession.id, {
          role: "user",
          content: "I am trespassing!",
        });
      },
      /Session not found or not owned by user/,
      "User B must not be able to attach messages to User A's session"
    );

    // Bob attempts to delete Alice's session -> must reject
    await assert.rejects(
      async () => {
        await userRepository.deleteConversationSession(userB.id, aliceSession.id);
      },
      /Session not found or not owned by user/
    );
  });
});

describe("Phase 6 Data Migration & Conflict Handling", () => {
  beforeEach(() => {
    userRepository._resetMemoryStore();
  });

  // Test 13: Local data import merges without duplicates
  test("Test 13: Idempotent local learning data import prevents duplicate activities", async () => {
    const user = await userRepository.createUser({
      email: "migrator@test.com",
      passwordHash: "hash",
      displayName: "Migrator",
    });

    const fixedTime = "2026-10-22T08:00:00.000Z";
    const localData = {
      activities: [
        { module: "speaking", exerciseId: "sentence-1", score: 92, timestamp: fixedTime },
        { module: "dictation", exerciseId: "transcription-1", score: 100, timestamp: fixedTime },
      ],
      savedWords: ["resilience", "eloquent"],
      vocabularyReviews: [
        { wordId: "resilience", reviewInterval: 3, nextReviewDate: "2026-10-25" },
      ],
      grammarCompletions: [
        { lessonId: "conditionals", score: 85, status: "completed" },
      ],
    };

    // First import
    const result1 = await userRepository.importLegacyLocalData(user.id, localData);
    assert.equal(result1.activitiesImported, 2);
    assert.equal(result1.savedWordsImported, 2);
    assert.equal(result1.vocabProgressImported, 1);
    assert.equal(result1.grammarImported, 1);

    // Second import with identical data -> idempotent, 0 new activities
    const result2 = await userRepository.importLegacyLocalData(user.id, localData);
    assert.equal(result2.activitiesImported, 0, "Duplicate activities must be skipped");
    assert.equal(result2.savedWordsImported, 0, "Duplicate saved words must be skipped");

    // Total activities must remain 2
    const activities = await userRepository.getLearningActivities(user.id);
    assert.equal(activities.totalCount, 2);
  });

  // Test 14: Safe account deletion
  test("Test 14: Account deletion clears profile and all cascading records", async () => {
    const user = await userRepository.createUser({
      email: "delete.me@test.com",
      passwordHash: "hash",
      displayName: "SoonGone",
    });

    await userRepository.recordLearningActivity(user.id, {
      module: "speaking",
      exerciseId: "s1",
      score: 80,
    });

    await userRepository.toggleSavedWord(user.id, "temporary");

    const deleteRes = await userRepository.deleteUserAccount(user.id);
    assert.equal(deleteRes.success, true);

    const lookup = await userRepository.findUserById(user.id);
    assert.equal(lookup, null, "User must no longer exist");

    const activities = await userRepository.getLearningActivities(user.id);
    assert.equal(activities.totalCount, 0, "Activities must be cleared");

    const savedWords = await userRepository.getSavedVocabulary(user.id);
    assert.equal(savedWords.length, 0, "Saved words must be cleared");
  });
});
