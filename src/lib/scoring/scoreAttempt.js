import { tokenize } from "./tokenize.js";
import { alignWords } from "./alignWords.js";
import { calculateMetrics } from "./calculateMetrics.js";

/**
 * Orchestrates the complete deterministic scoring pipeline.
 * Pure function: given identical inputs, always produces identical results.
 * 
 * @param {string} referenceText - The target reference sentence
 * @param {string} transcriptText - The recognized learner transcript
 * @param {Object} [options]
 * @param {boolean} [options.caseSensitive=false] - Whether to match case-sensitively
 * @returns {{
 *   referenceText: string,
 *   transcriptText: string,
 *   referenceWordCount: number,
 *   transcriptWordCount: number,
 *   correctWordCount: number,
 *   substitutionCount: number,
 *   missingWordCount: number,
 *   extraWordCount: number,
 *   wer: number | null,
 *   textMatchScore: number | null,
 *   referenceWordCoverage: number | null,
 *   alignment: Array<Object>,
 *   status: 'scored' | 'empty_transcript' | 'empty_reference' | 'unscorable',
 *   statusMessage: string,
 *   createdAt: null
 * }}
 */
export function scoreAttempt(referenceText = "", transcriptText = "", options = {}) {
  const safeRef = typeof referenceText === "string" ? referenceText : "";
  const safeTrans = typeof transcriptText === "string" ? transcriptText : "";

  const refTokens = tokenize(safeRef, options);
  const transTokens = tokenize(safeTrans, options);

  const refCount = refTokens.length;
  const transCount = transTokens.length;

  // Case 1: Both empty
  if (refCount === 0 && transCount === 0) {
    return {
      referenceText: safeRef,
      transcriptText: safeTrans,
      referenceWordCount: 0,
      transcriptWordCount: 0,
      correctWordCount: 0,
      substitutionCount: 0,
      missingWordCount: 0,
      extraWordCount: 0,
      wer: null,
      textMatchScore: null,
      referenceWordCoverage: null,
      alignment: [],
      status: "unscorable",
      statusMessage: "Both reference sentence and transcript are empty.",
      createdAt: null,
    };
  }

  // Case 2: Empty reference sentence
  if (refCount === 0) {
    const alignment = alignWords([], transTokens);
    const metrics = calculateMetrics(alignment, 0, transCount);

    return {
      referenceText: safeRef,
      transcriptText: safeTrans,
      ...metrics,
      alignment,
      status: "empty_reference",
      statusMessage: "Reference sentence has no scoreable words.",
      createdAt: null,
    };
  }

  // Case 3: Empty learner transcript
  if (transCount === 0) {
    const alignment = alignWords(refTokens, []);
    const metrics = calculateMetrics(alignment, refCount, 0);

    return {
      referenceText: safeRef,
      transcriptText: safeTrans,
      ...metrics,
      alignment,
      status: "empty_transcript",
      statusMessage: "No spoken words were recognized in this attempt.",
      createdAt: null,
    };
  }

  // Case 4: Normal scoring
  const alignment = alignWords(refTokens, transTokens);
  const metrics = calculateMetrics(alignment, refCount, transCount);

  return {
    referenceText: safeRef,
    transcriptText: safeTrans,
    ...metrics,
    alignment,
    status: "scored",
    statusMessage: "Attempt scored successfully.",
    createdAt: null,
  };
}
