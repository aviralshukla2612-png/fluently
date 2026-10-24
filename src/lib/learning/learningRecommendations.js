/**
 * Shadowly — Personalized Learning Recommendations Engine
 * Phase 7 Learning Intelligence
 *
 * Deterministic recommendation engine that maps detected learner weaknesses
 * and skill mastery levels into concrete, actionable practice tasks.
 *
 * All destinations strictly point to verified existing routes:
 * - /grammar
 * - /dictation
 * - /say-it
 * - /vocabulary
 * - /conversation
 */

/**
 * Generate prioritized, actionable recommendations based on weaknesses and analytics
 *
 * @param {Array} weaknesses - Output from detectWeaknesses()
 * @param {Object} analytics - Output from computeLearningAnalytics()
 * @returns {Array} List of actionable recommendations sorted by priority
 */
export function generateRecommendations(weaknesses = [], analytics = null) {
  const recommendations = [];
  const safeWeaknesses = Array.isArray(weaknesses) ? weaknesses : [];

  // Generate recommendations directly addressing detected weaknesses
  for (const w of safeWeaknesses) {
    if (w.skill === "grammar") {
      recommendations.push({
        id: `rec_grammar_${w.exerciseId || "review"}`,
        title: `Master ${w.category}`,
        explanation: `Targeting observed errors in ${w.category}. Revisit key formulas and practice questions to solidify your understanding.`,
        targetSkill: "grammar",
        priority: w.severity === "high" ? "high" : "medium",
        reason: `Repeated grammar challenge (${w.errorCount} error${w.errorCount === 1 ? "" : "s"} observed).`,
        estimatedDuration: 5,
        destination: w.destination || "/grammar",
        exerciseId: w.exerciseId,
        supportingEvidence: w.evidence,
      });
    } else if (w.skill === "vocabulary") {
      recommendations.push({
        id: `rec_vocab_${encodeURIComponent((w.targetWord || "review").toLowerCase())}`,
        title: `Reinforce Word Recall: ${w.targetWord ? `"${w.targetWord}"` : "Missed Words"}`,
        explanation: `Strengthen retention through spaced repetition flashcards. This word was marked as challenging during recent sessions.`,
        targetSkill: "vocabulary",
        priority: w.severity === "high" ? "high" : "medium",
        reason: `Word recall flagged ${w.errorCount} time${w.errorCount === 1 ? "" : "s"}.`,
        estimatedDuration: 3,
        destination: "/vocabulary",
        targetWord: w.targetWord,
        supportingEvidence: w.evidence,
      });
    } else if (w.skill === "dictation") {
      recommendations.push({
        id: "rec_dictation_comprehension",
        title: "Ear Training & Sentence Dictation",
        explanation: "Sharpen listening comprehension and word boundary recognition. Use variable audio speeds to train your ear.",
        targetSkill: "dictation",
        priority: w.severity === "high" ? "high" : "medium",
        reason: `Listening transcription accuracy is below 70% threshold.`,
        estimatedDuration: 5,
        destination: "/dictation",
        supportingEvidence: w.evidence,
      });
    } else if (w.skill === "speaking") {
      recommendations.push({
        id: "rec_speaking_shadowing",
        title: "Pacing & Speech Shadowing",
        explanation: "Practice sentence cadence and clean speech alignment. Repeat reference phrases at a comfortable speed.",
        targetSkill: "speaking",
        priority: w.severity === "high" ? "high" : "medium",
        reason: `Speech recognition alignment score averaged below 70%.`,
        estimatedDuration: 4,
        destination: "/say-it",
        supportingEvidence: w.evidence,
      });
    }
  }

  // If learner has high overall mastery (> 80%) with few or no high-severity weaknesses, recommend conversation challenge
  const highSeverityCount = safeWeaknesses.filter((w) => w.severity === "high").length;
  if (
    analytics &&
    analytics.summary &&
    analytics.summary.overallAverageScore !== null &&
    analytics.summary.overallAverageScore >= 80 &&
    highSeverityCount === 0
  ) {
    recommendations.push({
      id: "rec_advanced_conversation",
      title: "Step Up: AI Conversation Practice",
      explanation: "Your core grammar and comprehension metrics are solid! Apply your skills in open dialogue with the AI tutor.",
      targetSkill: "conversation",
      priority: "medium",
      reason: `Overall average score is ${analytics.summary.overallAverageScore}%. Time to challenge yourself in spontaneous dialogue.`,
      estimatedDuration: 8,
      destination: "/conversation",
      supportingEvidence: "Consistently high scores across fundamental exercises.",
    });
  }

  // If no weaknesses or insufficient data, provide a balanced starter recommendation suite
  if (recommendations.length === 0) {
    recommendations.push(
      {
        id: "rec_starter_speaking",
        title: "Kickstart Speaking: Reference Shadowing",
        explanation: "Record and listen to yourself pronouncing curated everyday English phrases.",
        targetSkill: "speaking",
        priority: "high",
        reason: "Starter activity to calibrate speech recognition and baseline fluency.",
        estimatedDuration: 3,
        destination: "/say-it",
        supportingEvidence: "Initial placement recommendation.",
      },
      {
        id: "rec_starter_dictation",
        title: "Listening Baseline: Everyday Requests",
        explanation: "Transcribe natural speech to evaluate listening comprehension and spelling.",
        targetSkill: "dictation",
        priority: "medium",
        reason: "Starter activity to assess listening recognition.",
        estimatedDuration: 4,
        destination: "/dictation",
        supportingEvidence: "Initial placement recommendation.",
      },
      {
        id: "rec_starter_grammar",
        title: "Grammar Core: Present Simple Tense",
        explanation: "Review the fundamental building blocks of English verbs and daily routines.",
        targetSkill: "grammar",
        priority: "medium",
        reason: "Foundation for accurate sentence formation.",
        estimatedDuration: 5,
        destination: "/grammar",
        supportingEvidence: "Curriculum foundation recommendation.",
      }
    );
  }

  // Priority sorting: high > medium > low
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  return recommendations.sort((a, b) => {
    return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
  });
}
