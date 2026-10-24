/**
 * Shadowly IELTS-Style Mock Exam — Objective Grader
 * Deterministic server-side evaluation for Listening and Reading sections.
 * Enforces word limits, handles valid alternative answers, normalizes casing/whitespace.
 */

/**
 * Normalizes text for comparison:
 * - Trims whitespace
 * - Collapses multiple spaces
 * - Lowercases text
 * - Normalizes punctuation (removes trailing periods/commas)
 * @param {any} val
 * @returns {string}
 */
export function normalizeAnswer(val) {
  if (val === null || val === undefined) return "";
  let str = String(val).trim().toLowerCase();
  // Collapse whitespace
  str = str.replace(/\s+/g, " ");
  // Strip trailing punctuation often entered by candidates
  str = str.replace(/[.,;:!?]+$/, "").trim();
  return str;
}

/**
 * Standardizes True/False/Not Given or Yes/No/Not Given answers
 * @param {string} val
 * @returns {string}
 */
export function standardizeBooleanChoice(val) {
  const norm = normalizeAnswer(val);
  if (["t", "true", "y", "yes"].includes(norm)) return "TRUE";
  if (["f", "false", "n", "no"].includes(norm)) return "FALSE";
  if (["ng", "not given", "notgiven"].includes(norm)) return "NOT GIVEN";
  return norm.toUpperCase();
}

/**
 * Counts words in a string accurately
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  return tokens.length;
}

/**
 * Grades a single objective question against its server-side answer key
 * @param {Object} params
 * @param {any} params.userResponse - Candidate's submitted response
 * @param {any} params.correctKey - Server-side correct answer key (string or array of valid options)
 * @param {string} [params.questionType]
 * @param {number} [params.wordLimit] - Max allowed words (e.g. NO MORE THAN TWO WORDS)
 * @returns {{ isCorrect: boolean, normalizedUser: string, reason?: string }}
 */
export function gradeSingleQuestion({ userResponse, correctKey, questionType, wordLimit }) {
  if (userResponse === null || userResponse === undefined || String(userResponse).trim() === "") {
    return {
      isCorrect: false,
      normalizedUser: "",
      reason: "No answer provided.",
    };
  }

  const rawUserStr = String(userResponse).trim();

  // Enforce explicit word limit if specified
  if (wordLimit && wordLimit > 0) {
    const wordCount = countWords(rawUserStr);
    if (wordCount > wordLimit) {
      return {
        isCorrect: false,
        normalizedUser: rawUserStr,
        reason: `Exceeded word limit: answered ${wordCount} words (limit: ${wordLimit}).`,
      };
    }
  }

  // Handle True/False/Not Given
  if (
    questionType === "TRUE_FALSE_NOT_GIVEN" ||
    questionType === "YES_NO_NOT_GIVEN"
  ) {
    const userStandard = standardizeBooleanChoice(rawUserStr);
    const validKeys = Array.isArray(correctKey) ? correctKey : [correctKey];
    const standardizedKeys = validKeys.map((k) => standardizeBooleanChoice(k));
    const isCorrect = standardizedKeys.includes(userStandard);

    return {
      isCorrect,
      normalizedUser: userStandard,
      reason: isCorrect ? undefined : "Incorrect value for identification task.",
    };
  }

  // Standard string matching against accepted answers
  const normalizedUser = normalizeAnswer(rawUserStr);
  const acceptedAnswers = Array.isArray(correctKey) ? correctKey : [correctKey];
  const normalizedAccepted = acceptedAnswers.map((k) => normalizeAnswer(k));

  const isCorrect = normalizedAccepted.includes(normalizedUser);

  return {
    isCorrect,
    normalizedUser,
    reason: isCorrect ? undefined : "Answer did not match accepted key.",
  };
}

/**
 * Grades an entire objective section (Listening or Reading)
 * @param {Object} params
 * @param {Array<Object>} params.questions - Array of question definitions with correctAnswerKey
 * @param {Object|Array} params.responses - Map or array of candidate responses
 * @returns {{ rawScore: number, maxRawScore: number, breakdown: Array<Object> }}
 */
export function gradeObjectiveSection(firstArg = {}, secondArg = {}) {
  let questions = [];
  let responses = {};

  if (Array.isArray(firstArg)) {
    questions = firstArg;
    responses = secondArg || {};
  } else if (firstArg && typeof firstArg === "object") {
    questions = firstArg.questions || [];
    responses = firstArg.responses || {};
  }

  // Normalize responses to a map of questionId -> value
  const responseMap = new Map();
  if (Array.isArray(responses)) {
    for (const r of responses) {
      if (r && r.questionId) {
        responseMap.set(r.questionId, r.responseValue);
      }
    }
  } else if (typeof responses === "object" && responses !== null) {
    for (const [qid, val] of Object.entries(responses)) {
      responseMap.set(qid, val);
    }
  }

  let rawScore = 0;
  const breakdown = [];

  for (const q of questions) {
    const userVal = responseMap.get(q.id);
    const grading = gradeSingleQuestion({
      userResponse: userVal,
      correctKey: q.correctAnswerKey,
      questionType: q.questionType,
      wordLimit: q.wordLimit,
    });

    if (grading.isCorrect) {
      rawScore++;
    }

    // Format display-friendly correct answer
    const displayCorrect = Array.isArray(q.correctAnswerKey)
      ? q.correctAnswerKey.join(" OR ")
      : String(q.correctAnswerKey || "");

    breakdown.push({
      questionId: q.id,
      questionNumber: q.questionNumber,
      questionType: q.questionType,
      isCorrect: grading.isCorrect,
      userAnswer: userVal || "",
      correctAnswer: displayCorrect,
      reason: grading.reason,
    });
  }

  return {
    rawScore,
    maxRawScore: questions.length,
    totalQuestions: questions.length,
    breakdown,
  };
}
