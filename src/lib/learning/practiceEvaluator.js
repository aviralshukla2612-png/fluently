/**
 * Shadowly — Practice Evaluator & Cryptographic Exercise Tokens
 * Phase 9 AI Learning Coach & Smart Practice
 *
 * Implements deterministic answer grading, cryptographic HMAC exercise token
 * signing to prevent client answer tampering, and idempotent activity recording.
 */

import crypto from "node:crypto";
import { normalizeText } from "../scoring/normalizeText.js";
import { scoreAttempt } from "../scoring/scoreAttempt.js";

const TOKEN_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

function getExerciseSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.trim().length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET environment variable must be set with at least 32 characters in production.");
  }
  return "shadowly-exercise-hmac-secret-key-32-chars-minimum";
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Creates a cryptographically signed exercise token containing expected answers
 *
 * @param {Object} exercise - Complete exercise object
 * @param {Object} [options] - Additional binding options
 * @param {string} [options.userId] - Optional bound user ID for ownership validation
 * @param {string} [options.tokenId] - Unique token identifier for idempotency
 * @returns {string} Signed token: payload.signature
 */
export function createSignedExerciseToken(exercise, options = {}) {
  const secret = getExerciseSecret();
  const tokenId = options.tokenId || `tok_${crypto.randomBytes(12).toString("hex")}`;
  const userId = options.userId || null;

  const payload = {
    tokenId,
    userId,
    exerciseId: exercise.id,
    skill: exercise.skill,
    difficulty: exercise.difficulty,
    title: exercise.title,
    targetConcept: exercise.targetConcept,
    questions: exercise.questions.map((q) => ({
      id: q.id,
      type: q.type,
      correctAnswer: q.correctAnswer,
      acceptedAnswers: q.acceptedAnswers || [q.correctAnswer],
      explanation: q.explanation,
    })),
    createdAt: Date.now(),
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  };

  const serialized = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(serialized);
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies a signed exercise token and returns the parsed payload
 *
 * @param {string} token
 * @param {string} [expectedUserId] - If provided, asserts token is bound to this user
 * @returns {Object|null} Validated payload or null
 */
export function verifyExerciseToken(token, expectedUserId = null) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, clientSig] = parts;
  let secret;
  try {
    secret = getExerciseSecret();
  } catch {
    return null;
  }

  const expectedSig = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  const clientBuf = Buffer.from(clientSig);
  const expectedBuf = Buffer.from(expectedSig);

  // Constant-time comparison with explicit length guard
  if (clientBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(clientBuf, expectedBuf)) {
    return null;
  }

  try {
    const jsonStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(jsonStr);

    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return null; // Expired token
    }

    // User ownership check
    if (expectedUserId && payload.userId && payload.userId !== expectedUserId) {
      return null; // Cross-user token submission rejected
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Sanitizes exercise object for the client by stripping correct answers
 *
 * @param {Object} exercise
 * @param {string} signedToken
 * @returns {Object} Client-safe exercise
 */
export function prepareClientExercise(exercise, signedToken) {
  return {
    id: exercise.id,
    version: exercise.version || "1.0",
    exerciseType: exercise.exerciseType,
    skill: exercise.skill,
    difficulty: exercise.difficulty,
    source: exercise.source,
    title: exercise.title,
    instructions: exercise.instructions,
    targetConcept: exercise.targetConcept,
    estimatedMinutes: exercise.estimatedMinutes,
    exerciseToken: signedToken,
    questions: exercise.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: q.options || null,
      // Note: correctAnswer and acceptedAnswers are excluded from client!
    })),
  };
}

/**
 * Evaluates submitted answers deterministically against verified server token
 *
 * @param {Object} params
 * @param {string} params.exerciseToken - Signed HMAC token from server
 * @param {Object} params.userAnswers - Map of { [questionId]: answerString }
 * @returns {Object} Evaluation summary
 */
export function evaluatePracticeSubmission({ exerciseToken, userAnswers = {}, userId = null }) {
  const verifiedPayload = verifyExerciseToken(exerciseToken, userId);
  if (!verifiedPayload) {
    return {
      success: false,
      error: { code: "INVALID_EXERCISE_TOKEN", message: "Exercise token is invalid, tampered with, expired, or belongs to another user." },
    };
  }

  const { tokenId, questions, exerciseId, skill, difficulty, title, targetConcept } = verifiedPayload;
  const questionResults = [];
  let correctCount = 0;

  for (const q of questions) {
    const rawAnswer = userAnswers[q.id];
    const userAnswerStr = typeof rawAnswer === "string" ? rawAnswer.trim() : "";
    let isCorrect = false;

    if (q.type === "multiple_choice") {
      // Direct comparison with expected option
      isCorrect = userAnswerStr === q.correctAnswer;
    } else if (q.type === "fill_blank" || q.type === "vocabulary") {
      // Normalized comparison against accepted answers
      const normUser = normalizeText(userAnswerStr);
      const normAccepted = (q.acceptedAnswers || [q.correctAnswer]).map((ans) => normalizeText(ans));
      isCorrect = normAccepted.includes(normUser);
    } else if (q.type === "sentence_construction") {
      // Normalized comparison for constructed sentences
      const normUser = normalizeText(userAnswerStr);
      const normAccepted = (q.acceptedAnswers || [q.correctAnswer]).map((ans) => normalizeText(ans));
      isCorrect = normAccepted.includes(normUser);
    } else if (q.type === "dictation") {
      // Score via deterministic scoring engine
      const scored = scoreAttempt(q.correctAnswer, userAnswerStr);
      isCorrect = (scored.textMatchScore || 0) >= 80;
    }

    if (isCorrect) {
      correctCount += 1;
    }

    questionResults.push({
      questionId: q.id,
      userAnswer: userAnswerStr,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation || "Standard English grammatical rule applies.",
    });
  }

  const totalQuestions = questions.length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = score >= 70;

  return {
    success: true,
    evaluation: {
      tokenId: tokenId || null,
      exerciseId,
      skill,
      difficulty,
      title,
      targetConcept,
      score,
      correctCount,
      totalQuestions,
      passed,
      questionResults,
    },
  };
}
