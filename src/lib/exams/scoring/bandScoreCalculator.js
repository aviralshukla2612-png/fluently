/**
 * Shadowly IELTS-Style Mock Exam — Band Score Calculator
 * Implements deterministic IELTS Academic raw-score-to-band mappings
 * and the official IELTS overall band rounding algorithm.
 */

// Academic Listening raw score (out of 40) to Band conversion
export const ACADEMIC_LISTENING_BAND_TABLE = [
  { minRaw: 39, maxRaw: 40, band: 9.0 },
  { minRaw: 37, maxRaw: 38, band: 8.5 },
  { minRaw: 35, maxRaw: 36, band: 8.0 },
  { minRaw: 32, maxRaw: 34, band: 7.5 },
  { minRaw: 30, maxRaw: 31, band: 7.0 },
  { minRaw: 26, maxRaw: 29, band: 6.5 },
  { minRaw: 23, maxRaw: 25, band: 6.0 },
  { minRaw: 18, maxRaw: 22, band: 5.5 },
  { minRaw: 16, maxRaw: 17, band: 5.0 },
  { minRaw: 13, maxRaw: 15, band: 4.5 },
  { minRaw: 10, maxRaw: 12, band: 4.0 },
  { minRaw: 6, maxRaw: 9, band: 3.5 },
  { minRaw: 4, maxRaw: 5, band: 3.0 },
  { minRaw: 2, maxRaw: 3, band: 2.5 },
  { minRaw: 1, maxRaw: 1, band: 2.0 },
  { minRaw: 0, maxRaw: 0, band: 1.0 },
];

// Academic Reading raw score (out of 40) to Band conversion
export const ACADEMIC_READING_BAND_TABLE = [
  { minRaw: 39, maxRaw: 40, band: 9.0 },
  { minRaw: 37, maxRaw: 38, band: 8.5 },
  { minRaw: 35, maxRaw: 36, band: 8.0 },
  { minRaw: 33, maxRaw: 34, band: 7.5 },
  { minRaw: 30, maxRaw: 32, band: 7.0 },
  { minRaw: 27, maxRaw: 29, band: 6.5 },
  { minRaw: 23, maxRaw: 26, band: 6.0 },
  { minRaw: 19, maxRaw: 22, band: 5.5 },
  { minRaw: 15, maxRaw: 18, band: 5.0 },
  { minRaw: 13, maxRaw: 14, band: 4.5 },
  { minRaw: 10, maxRaw: 12, band: 4.0 },
  { minRaw: 8, maxRaw: 9, band: 3.5 },
  { minRaw: 6, maxRaw: 7, band: 3.0 },
  { minRaw: 4, maxRaw: 5, band: 2.5 },
  { minRaw: 2, maxRaw: 3, band: 2.0 },
  { minRaw: 0, maxRaw: 1, band: 1.0 },
];

/**
 * Maps an objective raw score to an estimated IELTS band score
 * @param {Object} params
 * @param {number} params.rawScore - Number of correct questions
 * @param {number} [params.maxRawScore=40] - Total questions in section
 * @param {"LISTENING"|"READING"} params.sectionType
 * @returns {number} Estimated band from 1.0 to 9.0
 */
export function calculateObjectiveBand({ rawScore, maxRawScore = 40, sectionType }) {
  if (typeof rawScore !== "number" || isNaN(rawScore) || rawScore < 0) {
    return 1.0;
  }

  // Normalize to 40-item scale if custom section length (e.g. diagnostic test)
  let scaledRaw = rawScore;
  if (maxRawScore > 0 && maxRawScore !== 40) {
    scaledRaw = Math.round((rawScore / maxRawScore) * 40);
  }
  scaledRaw = Math.min(40, Math.max(0, scaledRaw));

  const table =
    sectionType === "READING"
      ? ACADEMIC_READING_BAND_TABLE
      : ACADEMIC_LISTENING_BAND_TABLE;

  const match = table.find(
    (tier) => scaledRaw >= tier.minRaw && scaledRaw <= tier.maxRaw
  );

  return match ? match.band : 1.0;
}

export const getBandFromRawScore = calculateObjectiveBand;

/**
 * Rounds an average band score according to the official IELTS rounding rule:
 * - If average fractional part is < 0.25, round down to whole band.
 * - If average fractional part is >= 0.25 and < 0.75, round to half band (.5).
 * - If average fractional part is >= 0.75, round up to next whole band.
 * 
 * Examples:
 * - 6.25 -> 6.5
 * - 6.75 -> 7.0
 * - 6.125 -> 6.0
 * - 6.375 -> 6.5
 * - 6.625 -> 6.5
 * - 6.875 -> 7.0
 * 
 * @param {number} avg
 * @returns {number}
 */
export function roundToIELTSBand(avg) {
  if (typeof avg !== "number" || isNaN(avg) || avg <= 0) {
    return 1.0;
  }
  if (avg >= 9.0) return 9.0;

  const whole = Math.floor(avg);
  // Add small epsilon to handle IEEE 754 precision issues like 0.2499999999999998
  const decimal = Math.round((avg - whole) * 1000) / 1000;

  if (decimal < 0.25) {
    return whole;
  } else if (decimal < 0.75) {
    return whole + 0.5;
  } else {
    return whole + 1.0;
  }
}

/**
 * Calculates the overall estimated IELTS band score from the 4 sections.
 * Returns null if not all 4 required sections are evaluated.
 * 
 * @param {Object} sections
 * @param {number} [sections.listening]
 * @param {number} [sections.reading]
 * @param {number} [sections.writing]
 * @param {number} [sections.speaking]
 * @returns {{ isComplete: boolean, overallBand: number|null, message?: string }}
 */
export function calculateOverallBand(sections = {}) {
  const { listening, reading, writing, speaking } = sections;

  const scores = [listening, reading, writing, speaking];
  const validScores = scores.filter((s) => typeof s === "number" && !isNaN(s) && s >= 1.0 && s <= 9.0);

  if (validScores.length < 4) {
    return {
      isComplete: false,
      overallBand: null,
      message: `Overall band score requires all 4 skills to be evaluated. Received ${validScores.length} of 4.`,
    };
  }

  const average = scores.reduce((sum, s) => sum + s, 0) / 4;
  const overallBand = roundToIELTSBand(average);

  return {
    isComplete: true,
    overallBand,
    rawAverage: Math.round(average * 100) / 100,
  };
}

/**
 * Provides a standardized band descriptor description
 * @param {number} band
 * @returns {{ level: string, description: string }}
 */
export function getBandDescriptor(band) {
  if (band >= 8.5) {
    return {
      level: "Expert / Very Good User",
      description: "Has fully operational command of the language with only occasional unsystematic inaccuracies. Handles complex detailed argumentation well.",
    };
  }
  if (band >= 7.5) {
    return {
      level: "Good User",
      description: "Has operational command of the language with occasional inaccuracies and misunderstandings. Generally handles complex language and detailed reasoning well.",
    };
  }
  if (band >= 6.5) {
    return {
      level: "Competent User",
      description: "Has generally effective command of the language despite some inaccuracies and misunderstandings. Can use and understand fairly complex language, particularly in familiar situations.",
    };
  }
  if (band >= 5.5) {
    return {
      level: "Modest User",
      description: "Has partial command of the language, coping with overall meaning in most situations, though is likely to make many mistakes. Should be able to handle basic communication in own field.",
    };
  }
  if (band >= 4.5) {
    return {
      level: "Limited User",
      description: "Basic competence is limited to familiar situations. Has frequent problems in understanding and expression. Is not able to use complex language.",
    };
  }
  return {
    level: "Extremely Limited User",
    description: "Conveys and understands only general meaning in very familiar situations. Frequent breakdowns in communication occur.",
  };
}
