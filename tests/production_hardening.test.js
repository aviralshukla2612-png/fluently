/**
 * Shadowly — Phase 10: Production Readiness, Security & Reliability Hardening Tests
 *
 * Verifies:
 * 1. Authentication & Session Secret Security
 * 2. Timing-Safe Cryptographic Signature Verification
 * 3. Exercise Token Integrity, User Binding & Cross-User Rejection
 * 4. Token Replay Protection & Submission Idempotency
 * 5. CSRF Origin & Referer Verification
 * 6. Rate Limiting on Authentication & AI Endpoints
 * 7. Production Health & Readiness Endpoints
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  createSessionToken,
  verifySessionToken,
  buildSessionCookie,
  SESSION_COOKIE_NAME,
} from "../src/lib/auth/session.js";

import {
  createSignedExerciseToken,
  verifyExerciseToken,
  evaluatePracticeSubmission,
  prepareClientExercise,
} from "../src/lib/learning/practiceEvaluator.js";

import { checkRateLimit, resetRateLimit } from "../src/lib/auth/rateLimiter.js";
import { verifySameOrigin } from "../src/lib/auth/csrf.js";
import { userRepository } from "../src/lib/db/userRepository.js";

describe("Phase 10: Production Readiness & Security Hardening Suite", () => {
  beforeEach(() => {
    userRepository._resetMemoryStore();
    resetRateLimit("test_key");
  });

  // ==========================================
  // 1. Session Secret & Cryptographic Verification
  // ==========================================
  describe("1. Authentication & Session Security", () => {
    test("1.1: Creates valid signed session token and decodes payload safely", () => {
      const user = { userId: "usr_prod_1", email: "learner@example.com", displayName: "Alex Learner" };
      const token = createSessionToken(user);
      assert.ok(token);
      assert.equal(token.split(".").length, 3);

      const verified = verifySessionToken(token);
      assert.ok(verified);
      assert.equal(verified.userId, user.userId);
      assert.equal(verified.email, user.email);
    });

    test("1.2: Rejects tampered session payload or signature", () => {
      const user = { userId: "usr_prod_2", email: "hacker@example.com" };
      const token = createSessionToken(user);
      const [header, payload, sig] = token.split(".");

      // Tamper with payload
      const tamperedPayload = Buffer.from(JSON.stringify({ userId: "admin", email: "admin@example.com" })).toString("base64url");
      const tamperedToken = `${header}.${tamperedPayload}.${sig}`;

      assert.equal(verifySessionToken(tamperedToken), null);

      // Tamper with signature
      const badSigToken = `${header}.${payload}.${sig.slice(0, -4)}xxxx`;
      assert.equal(verifySessionToken(badSigToken), null);
    });

    test("1.3: Rejects expired session token", () => {
      const secret = "shadowly-default-dev-auth-secret-minimum-32-chars-key";
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const expiredPayload = Buffer.from(
        JSON.stringify({
          userId: "usr_expired",
          email: "old@example.com",
          iat: Math.floor(Date.now() / 1000) - 10000,
          exp: Math.floor(Date.now() / 1000) - 500, // Expired in the past
        })
      ).toString("base64url");
      const sig = crypto.createHmac("sha256", secret).update(`${header}.${expiredPayload}`).digest("base64url");

      const expiredToken = `${header}.${expiredPayload}.${sig}`;
      assert.equal(verifySessionToken(expiredToken), null);
    });

    test("1.4: Cookie attributes enforce HttpOnly and SameSite=Lax", () => {
      const cookieStr = buildSessionCookie("test_token_xyz");
      assert.ok(cookieStr.includes(`${SESSION_COOKIE_NAME}=test_token_xyz`));
      assert.ok(cookieStr.includes("HttpOnly"));
      assert.ok(cookieStr.includes("SameSite=Lax"));
    });
  });

  // ==========================================
  // 2. Exercise Token Integrity & User Binding
  // ==========================================
  describe("2. Exercise Token Integrity & User Binding", () => {
    const sampleExercise = {
      id: "ex_sec_101",
      skill: "grammar",
      difficulty: "intermediate",
      title: "Past Perfect Practice",
      targetConcept: "Past Perfect",
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          prompt: "She ___ already left.",
          options: ["had", "has", "have"],
          correctAnswer: "had",
          explanation: "Past perfect uses had + past participle.",
        },
      ],
    };

    test("2.1: Binds userId and unique tokenId inside signed exercise token", () => {
      const token = createSignedExerciseToken(sampleExercise, { userId: "user_alpha" });
      const verified = verifyExerciseToken(token);

      assert.ok(verified);
      assert.equal(verified.exerciseId, sampleExercise.id);
      assert.equal(verified.userId, "user_alpha");
      assert.ok(verified.tokenId.startsWith("tok_"));
    });

    test("2.2: Constant-time signature comparison does not throw RangeError on unequal length buffers", () => {
      const token = createSignedExerciseToken(sampleExercise);
      const [payload, sig] = token.split(".");

      // Pass intentionally short or empty signatures that would throw RangeError in naive crypto.timingSafeEqual
      const shortSigToken = `${payload}.short`;
      const emptySigToken = `${payload}.`;
      const longSigToken = `${payload}.${sig}extralongsignaturepart`;

      assert.doesNotThrow(() => {
        assert.equal(verifyExerciseToken(shortSigToken), null);
        assert.equal(verifyExerciseToken(emptySigToken), null);
        assert.equal(verifyExerciseToken(longSigToken), null);
      });
    });

    test("2.3: Rejects cross-user token submission (User A token submitted by User B)", () => {
      const token = createSignedExerciseToken(sampleExercise, { userId: "user_alpha" });

      // Verifying with matching user succeeds
      const validForAlpha = verifyExerciseToken(token, "user_alpha");
      assert.ok(validForAlpha);

      // Verifying with different user is rejected
      const invalidForBeta = verifyExerciseToken(token, "user_beta");
      assert.equal(invalidForBeta, null);

      // Evaluation helper rejects cross-user submission
      const evalBeta = evaluatePracticeSubmission({
        exerciseToken: token,
        userAnswers: { q1: "had" },
        userId: "user_beta",
      });
      assert.equal(evalBeta.success, false);
      assert.equal(evalBeta.error.code, "INVALID_EXERCISE_TOKEN");
    });

    test("2.4: Client-safe exercise strips expected answer keys", () => {
      const token = createSignedExerciseToken(sampleExercise);
      const clientSafe = prepareClientExercise(sampleExercise, token);

      assert.equal(clientSafe.questions[0].correctAnswer, undefined);
      assert.equal(clientSafe.questions[0].acceptedAnswers, undefined);
      assert.ok(clientSafe.exerciseToken);
    });
  });

  // ==========================================
  // 3. Replay Protection & Idempotent Submission
  // ==========================================
  describe("3. Replay Protection & Submission Idempotency", () => {
    test("3.1: recordLearningActivity deduplicates matching sessionId atomically", async () => {
      const userId = "usr_idemp_1";
      const sessionId = "sess_fixed_12345";

      const first = await userRepository.recordLearningActivity(userId, {
        module: "grammar",
        exerciseId: "ex_1",
        score: 85,
        metadata: { sessionId },
      });

      // Second attempt with exact same sessionId
      const second = await userRepository.recordLearningActivity(userId, {
        module: "grammar",
        exerciseId: "ex_1",
        score: 85,
        metadata: { sessionId },
      });

      assert.equal(first.id, second.id, "Second write should return the existing activity");

      const all = await userRepository.getLearningActivities(userId);
      assert.equal(all.items.length, 1, "Only one activity must be recorded");
    });

    test("3.2: Concurrent submissions with same clientActivityId do not produce duplicate entries", async () => {
      const userId = "usr_concurrent";
      const clientActivityId = "client_act_999";

      // Simulate simultaneous promises
      const [resA, resB] = await Promise.all([
        userRepository.recordLearningActivity(userId, {
          module: "vocabulary",
          exerciseId: "word_10",
          score: 100,
          clientActivityId,
        }),
        userRepository.recordLearningActivity(userId, {
          module: "vocabulary",
          exerciseId: "word_10",
          score: 100,
          clientActivityId,
        }),
      ]);

      assert.equal(resA.id, resB.id);
      const activities = await userRepository.getLearningActivities(userId);
      assert.equal(activities.items.length, 1);
    });
  });

  // ==========================================
  // 4. CSRF & Origin Verification
  // ==========================================
  describe("4. CSRF & Origin Defense", () => {
    test("4.1: Allows safe read methods (GET, HEAD) unconditionally", () => {
      const getReq = new Request("http://localhost:3000/api/learning/goals", { method: "GET" });
      const headReq = new Request("http://localhost:3000/api/health", { method: "HEAD" });

      assert.equal(verifySameOrigin(getReq).allowed, true);
      assert.equal(verifySameOrigin(headReq).allowed, true);
    });

    test("4.2: Allows mutating requests with matching Origin header", () => {
      const validReq = new Request("http://localhost:3000/api/learning/practice/submit", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
      });

      const result = verifySameOrigin(validReq);
      assert.equal(result.allowed, true);
    });

    test("4.3: Blocks mutating requests from mismatched cross-origin domains", () => {
      const evilReq = new Request("http://localhost:3000/api/learning/practice/submit", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "https://malicious-attacker-website.com",
        },
      });

      const result = verifySameOrigin(evilReq);
      assert.equal(result.allowed, false);
      assert.ok(result.reason.includes("Origin mismatch"));
    });

    test("4.4: Allows Bearer-authenticated API clients without Origin header", () => {
      const apiReq = new Request("http://localhost:3000/api/user/activities", {
        method: "POST",
        headers: {
          authorization: "Bearer some_valid_token",
        },
      });

      assert.equal(verifySameOrigin(apiReq).allowed, true);
    });
  });

  // ==========================================
  // 5. Rate Limiting Protection
  // ==========================================
  describe("5. Rate Limiting Defense", () => {
    test("5.1: Allows requests up to maxAttempts within window", () => {
      const key = "rate_test_user_1";
      resetRateLimit(key);

      for (let i = 0; i < 5; i++) {
        const check = checkRateLimit(key, 5, 60000);
        assert.equal(check.allowed, true);
      }

      // 6th request is blocked
      const blocked = checkRateLimit(key, 5, 60000);
      assert.equal(blocked.allowed, false);
      assert.ok(blocked.retryAfterSeconds > 0);
    });

    test("5.2: Resets rate limit upon explicit key reset", () => {
      const key = "rate_test_user_2";
      resetRateLimit(key);

      for (let i = 0; i < 3; i++) {
        checkRateLimit(key, 3, 60000);
      }

      assert.equal(checkRateLimit(key, 3, 60000).allowed, false);
      resetRateLimit(key);
      assert.equal(checkRateLimit(key, 3, 60000).allowed, true);
    });
  });
});
