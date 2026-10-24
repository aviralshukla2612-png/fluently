/**
 * Shadowly IELTS Exam Feedback Service
 * Synthesizes multi-section assessments into a comprehensive candidate score report,
 * identifies strongest/weakest skills, and generates actionable Shadowly learning pathways.
 */

import { calculateOverallBand, getBandDescriptor } from "../scoring/bandScoreCalculator.js";
import { recordActivity } from "../../learning/progressService.js";

/**
 * Builds a comprehensive exam report object from evaluated section results
 * @param {Object} params
 * @param {Object} params.attempt
 * @param {Array<Object>} params.sectionResults
 * @returns {Object} Full report data
 */
export function buildComprehensiveExamReport({ attempt, sectionResults = [] }) {
  const listening = sectionResults.find((s) => s.sectionType === "LISTENING");
  const reading = sectionResults.find((s) => s.sectionType === "READING");
  const writing = sectionResults.find((s) => s.sectionType === "WRITING");
  const speaking = sectionResults.find((s) => s.sectionType === "SPEAKING");

  const bandMap = {
    listening: listening?.estimatedBand ?? null,
    reading: reading?.estimatedBand ?? null,
    writing: writing?.estimatedBand ?? null,
    speaking: speaking?.estimatedBand ?? null,
  };

  const overall = calculateOverallBand(bandMap);
  const descriptor = overall.overallBand ? getBandDescriptor(overall.overallBand) : null;

  // Determine Strongest and Weakest Skills
  const scoredEntries = Object.entries(bandMap).filter(
    ([, b]) => typeof b === "number" && !isNaN(b)
  );

  let strongestSkill = null;
  let weakestSkill = null;

  if (scoredEntries.length > 0) {
    scoredEntries.sort((a, b) => b[1] - a[1]);
    strongestSkill = { skill: scoredEntries[0][0], band: scoredEntries[0][1] };
    weakestSkill = {
      skill: scoredEntries[scoredEntries.length - 1][0],
      band: scoredEntries[scoredEntries.length - 1][1],
    };
  }

  // Compile Curated Actionable Recommendations for Shadowly Modules
  const recommendations = [];

  if (bandMap.listening && bandMap.listening < 7.0) {
    recommendations.push({
      skill: "Listening",
      targetBand: Math.min(9.0, bandMap.listening + 0.5),
      advice: "Improve auditory accuracy for rapid numbers and spelling by practicing high-density audio dictation.",
      destination: "/dictation",
      buttonText: "Practice Dictation",
    });
  }

  if (bandMap.reading && bandMap.reading < 7.0) {
    recommendations.push({
      skill: "Reading",
      targetBand: Math.min(9.0, bandMap.reading + 0.5),
      advice: "Expand your academic lexical range and identify subtle nuances in complex academic texts.",
      destination: "/vocabulary",
      buttonText: "Explore Academic Vocabulary",
    });
  }

  if (bandMap.writing && bandMap.writing < 7.0) {
    const grammarCriterion = writing?.criterionScores?.grammaticalRangeAccuracy || 6.0;
    if (grammarCriterion < 6.5) {
      recommendations.push({
        skill: "Writing Grammar",
        targetBand: Math.min(9.0, grammarCriterion + 0.5),
        advice: "Consolidate complex conditional sentences, modal passive voice, and relative clauses.",
        destination: "/grammar",
        buttonText: "Review Grammar Lessons",
      });
    } else {
      recommendations.push({
        skill: "Writing Task Achievement",
        targetBand: Math.min(9.0, bandMap.writing + 0.5),
        advice: "Structure cohesive paragraphs with clear topic sentences and evidence-backed arguments.",
        destination: "/practice",
        buttonText: "Smart Practice",
      });
    }
  }

  if (bandMap.speaking && bandMap.speaking < 7.0) {
    recommendations.push({
      skill: "Speaking Fluency",
      targetBand: Math.min(9.0, bandMap.speaking + 0.5),
      advice: "Eliminate mid-clause pauses through daily speech shadowing and spontaneous dialogue practice.",
      destination: "/say-it",
      buttonText: "Start Voice Shadowing",
    });
  }

  // If candidate performed excellently across all areas
  if (recommendations.length === 0) {
    recommendations.push({
      skill: "Advanced Maintenance",
      targetBand: 9.0,
      advice: "Maintain peak fluency and natural idiom use through advanced interactive conversation partner dialogues.",
      destination: "/conversation",
      buttonText: "Practice Conversation",
    });
  }

  return {
    attemptId: attempt.id,
    userId: attempt.userId,
    examId: attempt.examId,
    isDiagnostic: Boolean(attempt.isDiagnostic),
    completedAt: new Date().toISOString(),
    overallBand: overall.overallBand,
    overallDescriptor: descriptor,
    isComplete: overall.isComplete,
    bandBreakdown: bandMap,
    strongestSkill,
    weakestSkill,
    sections: {
      listening: listening
        ? {
            rawScore: listening.rawScore,
            maxRawScore: listening.maxRawScore,
            estimatedBand: listening.estimatedBand,
            feedbackSummary: listening.feedbackSummary,
          }
        : null,
      reading: reading
        ? {
            rawScore: reading.rawScore,
            maxRawScore: reading.maxRawScore,
            estimatedBand: reading.estimatedBand,
            feedbackSummary: reading.feedbackSummary,
          }
        : null,
      writing: writing
        ? {
            estimatedBand: writing.estimatedBand,
            criterionScores: writing.criterionScores,
            strengths: writing.strengths,
            weaknesses: writing.weaknesses,
            recommendations: writing.recommendations,
          }
        : null,
      speaking: speaking
        ? {
            estimatedBand: speaking.estimatedBand,
            criterionScores: speaking.criterionScores,
            strengths: speaking.strengths,
            weaknesses: speaking.weaknesses,
            recommendations: speaking.recommendations,
          }
        : null,
    },
    recommendations,
    disclaimer:
      "Shadowly practice test results are AI-assisted estimates for self-study and preparation purposes only. They do not constitute official IELTS Test Report Forms.",
  };
}

/**
 * Synchronizes completed exam attempt into Shadowly's central LearningActivity store
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.attemptId
 * @param {number} params.overallBand
 * @param {boolean} params.isDiagnostic
 */
export async function syncExamProgressToLearningActivity({ userId, attemptId, overallBand, isDiagnostic }) {
  if (!userId || !overallBand) return null;

  try {
    const normalizedScore = Math.round((overallBand / 9.0) * 100);
    return await recordActivity({
      userId,
      module: "mock_exam",
      exerciseId: attemptId,
      score: normalizedScore,
      difficulty: isDiagnostic ? "intermediate" : "advanced",
      duration: isDiagnostic ? 45 * 60 : 165 * 60,
      metadata: {
        attemptId,
        overallBand,
        isDiagnostic,
        completedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[syncExamProgressToLearningActivity] Activity sync error:", err.message);
    return null;
  }
}
