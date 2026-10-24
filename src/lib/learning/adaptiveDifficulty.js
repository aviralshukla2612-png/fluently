/**
 * Shadowly — Adaptive Difficulty Engine
 * Phase 9 AI Learning Coach & Smart Practice
 *
 * Deterministic calibration of exercise difficulty based on verified
 * attempt history, skill accuracy, and weakness patterns.
 */

export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"];

export const DIFFICULTY_THRESHOLDS = {
  PROMOTION_SCORE: 85,    // Average score >= 85% qualifies for difficulty increase
  DEMOTION_SCORE: 60,      // Average score < 60% qualifies for difficulty reduction
  MIN_ATTEMPTS_REQUIRED: 2, // Minimum attempts before changing difficulty
  EVALUATION_WINDOW: 5,   // Look at up to the last 5 attempts for the specific skill
};

/**
 * Determine recommended difficulty based on verified attempt history
 *
 * @param {Object} params
 * @param {Array} params.activities - User's completed learning activities
 * @param {string} [params.skill] - Target skill ('grammar', 'vocabulary', 'speaking', 'dictation', 'conversation')
 * @param {string} [params.currentDifficulty] - Current level ('beginner', 'intermediate', 'advanced')
 * @param {Object} [params.weakness] - Optional detected weakness for the skill
 * @returns {Object} Deterministic difficulty recommendation
 */
export function determineAdaptiveDifficulty({
  activities = [],
  skill = "grammar",
  currentDifficulty = "intermediate",
  weakness = null,
} = {}) {
  const safeCurrent = DIFFICULTY_LEVELS.includes(currentDifficulty)
    ? currentDifficulty
    : "intermediate";

  // Filter activities strictly for the target skill that are completed and have a valid numeric score
  const skillActivities = (Array.isArray(activities) ? activities : [])
    .filter(
      (a) =>
        a &&
        typeof a === "object" &&
        a.status === "completed" &&
        a.module === skill &&
        typeof a.score === "number" &&
        !isNaN(a.score) &&
        a.score >= 0 &&
        a.score <= 100
    )
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  const recentAttempts = skillActivities.slice(0, DIFFICULTY_THRESHOLDS.EVALUATION_WINDOW);
  const attemptCount = recentAttempts.length;

  // Case 1: Insufficient history
  if (attemptCount < DIFFICULTY_THRESHOLDS.MIN_ATTEMPTS_REQUIRED) {
    return {
      recommendedDifficulty: safeCurrent,
      currentDifficulty: safeCurrent,
      shouldChange: false,
      direction: "maintain",
      reason: `Insufficient practice history in ${skill} (found ${attemptCount} scored attempt${attemptCount === 1 ? "" : "s"}, minimum ${DIFFICULTY_THRESHOLDS.MIN_ATTEMPTS_REQUIRED} required). Maintaining ${safeCurrent} baseline.`,
      evidenceSummary: {
        attemptCount,
        recentScores: recentAttempts.map((a) => a.score),
        averageScore: null,
      },
      confidence: "low",
      needsMorePractice: true,
    };
  }

  // Calculate average of recent attempts
  const sumScores = recentAttempts.reduce((sum, a) => sum + a.score, 0);
  const averageScore = Math.round((sumScores / attemptCount) * 10) / 10;
  const recentScores = recentAttempts.map((a) => a.score);

  // Check if persistent weakness exists for this skill
  const hasPersistentWeakness = weakness && (weakness.status === "persistent" || weakness.severity === "high");

  // Case 2: High Mastery -> Increase Difficulty
  if (averageScore >= DIFFICULTY_THRESHOLDS.PROMOTION_SCORE && !hasPersistentWeakness) {
    if (safeCurrent === "beginner") {
      return {
        recommendedDifficulty: "intermediate",
        currentDifficulty: safeCurrent,
        shouldChange: true,
        direction: "increase",
        reason: `Consistent high performance in ${skill} (recent average: ${averageScore}% across ${attemptCount} drills). Recommended advancing to intermediate.`,
        evidenceSummary: { attemptCount, recentScores, averageScore },
        confidence: "high",
        needsMorePractice: false,
      };
    }
    if (safeCurrent === "intermediate") {
      return {
        recommendedDifficulty: "advanced",
        currentDifficulty: safeCurrent,
        shouldChange: true,
        direction: "increase",
        reason: `Strong mastery demonstrated in ${skill} (recent average: ${averageScore}% across ${attemptCount} drills). Recommended advancing to advanced.`,
        evidenceSummary: { attemptCount, recentScores, averageScore },
        confidence: "high",
        needsMorePractice: false,
      };
    }
    return {
      recommendedDifficulty: "advanced",
      currentDifficulty: safeCurrent,
      shouldChange: false,
      direction: "maintain",
      reason: `Top-tier mastery maintained in ${skill} (recent average: ${averageScore}%). Continuing with advanced drills.`,
      evidenceSummary: { attemptCount, recentScores, averageScore },
      confidence: "high",
      needsMorePractice: false,
    };
  }

  // Case 3: Struggling or Persistent Weakness -> Decrease Difficulty or Reinforce Fundamentals
  if (averageScore < DIFFICULTY_THRESHOLDS.DEMOTION_SCORE || hasPersistentWeakness) {
    if (safeCurrent === "advanced") {
      return {
        recommendedDifficulty: "intermediate",
        currentDifficulty: safeCurrent,
        shouldChange: true,
        direction: "decrease",
        reason: `Recent scores indicate challenges in advanced ${skill} (recent average: ${averageScore}%). Stepping down to intermediate to reinforce core mechanics.`,
        evidenceSummary: { attemptCount, recentScores, averageScore },
        confidence: "high",
        needsMorePractice: false,
      };
    }
    if (safeCurrent === "intermediate") {
      return {
        recommendedDifficulty: "beginner",
        currentDifficulty: safeCurrent,
        shouldChange: true,
        direction: "decrease",
        reason: `Repeated difficulties detected in ${skill} (recent average: ${averageScore}%). Recommending beginner drills to build solid fundamentals.`,
        evidenceSummary: { attemptCount, recentScores, averageScore },
        confidence: "high",
        needsMorePractice: false,
      };
    }
    return {
      recommendedDifficulty: "beginner",
      currentDifficulty: safeCurrent,
      shouldChange: false,
      direction: "maintain",
      reason: `Focusing on beginner fundamentals in ${skill} to overcome current obstacles (recent average: ${averageScore}%).`,
      evidenceSummary: { attemptCount, recentScores, averageScore },
      confidence: "high",
      needsMorePractice: false,
    };
  }

  // Case 4: Moderate/Balanced Progress -> Maintain Current Difficulty
  return {
    recommendedDifficulty: safeCurrent,
    currentDifficulty: safeCurrent,
    shouldChange: false,
    direction: "maintain",
    reason: `Steady progress in ${skill} (recent average: ${averageScore}% across ${attemptCount} drills). Appropriate challenge level maintained.`,
    evidenceSummary: { attemptCount, recentScores, averageScore },
    confidence: "medium",
    needsMorePractice: false,
  };
}
