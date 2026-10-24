/**
 * Metric Calculation Module
 * Pure functions for calculating transparent, reproducible scoring metrics from alignment results.
 */

/**
 * Calculates standard speech scoring metrics from word alignment records.
 * 
 * @param {Array<Object>} alignment - Result from alignWords()
 * @param {number} referenceWordCount - Number of reference tokens
 * @param {number} transcriptWordCount - Number of transcript tokens
 * @returns {{
 *   referenceWordCount: number,
 *   transcriptWordCount: number,
 *   correctWordCount: number,
 *   substitutionCount: number,
 *   missingWordCount: number,
 *   extraWordCount: number,
 *   wer: number | null,
 *   textMatchScore: number | null,
 *   referenceWordCoverage: number | null
 * }}
 */
export function calculateMetrics(alignment = [], referenceWordCount = 0, transcriptWordCount = 0) {
  let correctWordCount = 0;
  let substitutionCount = 0;
  let missingWordCount = 0;
  let extraWordCount = 0;

  for (const record of alignment) {
    switch (record.type) {
      case "match":
        correctWordCount++;
        break;
      case "substitution":
        substitutionCount++;
        break;
      case "deletion":
        missingWordCount++;
        break;
      case "insertion":
        extraWordCount++;
        break;
      default:
        break;
    }
  }

  // Edge case: empty reference sentence
  if (referenceWordCount === 0) {
    return {
      referenceWordCount: 0,
      transcriptWordCount,
      correctWordCount,
      substitutionCount,
      missingWordCount,
      extraWordCount,
      wer: null,
      textMatchScore: null,
      referenceWordCoverage: null,
    };
  }

  // Standard Word Error Rate: (S + D + I) / N
  // Note: WER can exceed 1.0 (100%) when learner speaks many extra words. It is NOT clamped.
  const totalErrors = substitutionCount + missingWordCount + extraWordCount;
  const wer = totalErrors / referenceWordCount;

  // Pedagogical Text Match Score: max(0, 1 - WER) * 100
  const textMatchScore = Math.max(0, 1 - wer) * 100;

  // Reference Word Coverage: (Matched / N) * 100
  const referenceWordCoverage = (correctWordCount / referenceWordCount) * 100;

  return {
    referenceWordCount,
    transcriptWordCount,
    correctWordCount,
    substitutionCount,
    missingWordCount,
    extraWordCount,
    wer,
    textMatchScore,
    referenceWordCoverage,
  };
}
