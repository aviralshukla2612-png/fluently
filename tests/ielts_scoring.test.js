import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateObjectiveBand,
  roundToIELTSBand,
  calculateOverallBand,
  getBandDescriptor,
} from "../src/lib/exams/scoring/bandScoreCalculator.js";
import {
  normalizeAnswer,
  countWords,
  gradeSingleQuestion,
  gradeObjectiveSection,
} from "../src/lib/exams/scoring/objectiveGrader.js";
import {
  canTransitionAttempt,
  ATTEMPT_STATUSES,
  EXAM_PRICE_PAISE,
  EXAM_CURRENCY,
} from "../src/lib/exams/examTypes.js";

test("IELTS Mock Exam: Scoring, Band Calculations & Objective Grader Suite", async (t) => {
  await t.test("1.1: Academic Listening raw scores map to accurate band scores", () => {
    // Perfect
    assert.equal(calculateObjectiveBand({ rawScore: 40, sectionType: "LISTENING" }), 9.0);
    assert.equal(calculateObjectiveBand({ rawScore: 39, sectionType: "LISTENING" }), 9.0);
    // 37-38 -> 8.5
    assert.equal(calculateObjectiveBand({ rawScore: 38, sectionType: "LISTENING" }), 8.5);
    // 30-31 -> 7.0
    assert.equal(calculateObjectiveBand({ rawScore: 30, sectionType: "LISTENING" }), 7.0);
    // 23-25 -> 6.0
    assert.equal(calculateObjectiveBand({ rawScore: 24, sectionType: "LISTENING" }), 6.0);
    // 16-17 -> 5.0
    assert.equal(calculateObjectiveBand({ rawScore: 16, sectionType: "LISTENING" }), 5.0);
    // 0 -> 1.0
    assert.equal(calculateObjectiveBand({ rawScore: 0, sectionType: "LISTENING" }), 1.0);
  });

  await t.test("1.2: Academic Reading raw scores map to accurate band scores", () => {
    assert.equal(calculateObjectiveBand({ rawScore: 40, sectionType: "READING" }), 9.0);
    assert.equal(calculateObjectiveBand({ rawScore: 35, sectionType: "READING" }), 8.0);
    assert.equal(calculateObjectiveBand({ rawScore: 31, sectionType: "READING" }), 7.0);
    assert.equal(calculateObjectiveBand({ rawScore: 27, sectionType: "READING" }), 6.5);
    assert.equal(calculateObjectiveBand({ rawScore: 23, sectionType: "READING" }), 6.0);
    assert.equal(calculateObjectiveBand({ rawScore: 15, sectionType: "READING" }), 5.0);
    assert.equal(calculateObjectiveBand({ rawScore: 1, sectionType: "READING" }), 1.0);
  });

  await t.test("1.3: Scaled diagnostic scores map proportionally to standard 40-item scale", () => {
    // 8 out of 10 = 32 out of 40 -> 7.5 in Listening
    const scaledBand = calculateObjectiveBand({ rawScore: 8, maxRawScore: 10, sectionType: "LISTENING" });
    assert.equal(scaledBand, 7.5);
  });

  await t.test("1.4: Official IELTS Overall Band Rounding algorithm works to precision standards", () => {
    // 6.25 rounds up to 6.5
    assert.equal(roundToIELTSBand(6.25), 6.5);
    // 6.75 rounds up to 7.0
    assert.equal(roundToIELTSBand(6.75), 7.0);
    // 6.125 rounds down to 6.0
    assert.equal(roundToIELTSBand(6.125), 6.0);
    // 6.375 rounds up to 6.5
    assert.equal(roundToIELTSBand(6.375), 6.5);
    // 6.625 rounds down to 6.5
    assert.equal(roundToIELTSBand(6.625), 6.5);
    // 6.875 rounds up to 7.0
    assert.equal(roundToIELTSBand(6.875), 7.0);
    // Exact whole
    assert.equal(roundToIELTSBand(7.0), 7.0);
    // Exact half
    assert.equal(roundToIELTSBand(7.5), 7.5);
  });

  await t.test("1.5: calculateOverallBand requires all 4 skills to be evaluated", () => {
    // Incomplete
    const partial = calculateOverallBand({ listening: 7.0, reading: 6.5 });
    assert.equal(partial.isComplete, false);
    assert.equal(partial.overallBand, null);
    assert.ok(partial.message.includes("requires all 4 skills"));

    // Complete: (7.0 + 6.5 + 6.0 + 6.0) / 4 = 25.5 / 4 = 6.375 -> rounds up to 6.5
    const complete = calculateOverallBand({
      listening: 7.0,
      reading: 6.5,
      writing: 6.0,
      speaking: 6.0,
    });
    assert.equal(complete.isComplete, true);
    assert.equal(complete.overallBand, 6.5);
    assert.equal(complete.rawAverage, 6.38);
  });

  await t.test("1.6: Objective Grader normalizes whitespace, punctuation, and casing", () => {
    assert.equal(normalizeAnswer("   Central   Library.  "), "central library");
    assert.equal(normalizeAnswer("Nineteenth Century,"), "nineteenth century");

    const match = gradeSingleQuestion({
      userResponse: "  Central Library. ",
      correctKey: "central library",
    });
    assert.equal(match.isCorrect, true);
  });

  await t.test("1.7: Objective Grader supports alternative accepted answer keys", () => {
    const acceptedKeys = ["water purification", "water treatment", "purification of water"];

    assert.equal(
      gradeSingleQuestion({ userResponse: "Water Treatment", correctKey: acceptedKeys }).isCorrect,
      true
    );
    assert.equal(
      gradeSingleQuestion({ userResponse: "purification of water", correctKey: acceptedKeys }).isCorrect,
      true
    );
    assert.equal(
      gradeSingleQuestion({ userResponse: "pollution filter", correctKey: acceptedKeys }).isCorrect,
      false
    );
  });

  await t.test("1.8: Word limit strictly enforced (rejects answers exceeding limit)", () => {
    // "NO MORE THAN TWO WORDS"
    const valid = gradeSingleQuestion({
      userResponse: "solar panels",
      correctKey: ["solar panels", "panels"],
      wordLimit: 2,
    });
    assert.equal(valid.isCorrect, true);

    const exceeded = gradeSingleQuestion({
      userResponse: "installed solar panels",
      correctKey: ["solar panels", "installed solar panels"],
      wordLimit: 2,
    });
    assert.equal(exceeded.isCorrect, false);
    assert.ok(exceeded.reason.includes("Exceeded word limit"));
  });

  await t.test("1.9: True / False / Not Given identification task is standardized", () => {
    const tfQuestion = {
      correctKey: "TRUE",
      questionType: "TRUE_FALSE_NOT_GIVEN",
    };

    assert.equal(gradeSingleQuestion({ ...tfQuestion, userResponse: "t" }).isCorrect, true);
    assert.equal(gradeSingleQuestion({ ...tfQuestion, userResponse: "True" }).isCorrect, true);
    assert.equal(gradeSingleQuestion({ ...tfQuestion, userResponse: "TRUE" }).isCorrect, true);
    assert.equal(gradeSingleQuestion({ ...tfQuestion, userResponse: "False" }).isCorrect, false);
    assert.equal(gradeSingleQuestion({ ...tfQuestion, userResponse: "Not Given" }).isCorrect, false);
  });

  await t.test("1.10: Full section grading computes accurate raw score and question breakdown", () => {
    const questions = [
      { id: "q1", questionNumber: 1, correctAnswerKey: "library", questionType: "COMPLETION", wordLimit: 1 },
      { id: "q2", questionNumber: 2, correctAnswerKey: "TRUE", questionType: "TRUE_FALSE_NOT_GIVEN" },
      { id: "q3", questionNumber: 3, correctAnswerKey: ["15", "fifteen"], questionType: "SHORT_ANSWER" },
    ];

    const responses = {
      q1: "library",
      q2: "false",
      q3: "fifteen",
    };

    const graded = gradeObjectiveSection({ questions, responses });
    assert.equal(graded.rawScore, 2);
    assert.equal(graded.maxRawScore, 3);
    assert.equal(graded.breakdown.length, 3);
    assert.equal(graded.breakdown[0].isCorrect, true);
    assert.equal(graded.breakdown[1].isCorrect, false);
    assert.equal(graded.breakdown[2].isCorrect, true);
  });

  await t.test("1.11: State transition machine prevents invalid attempt transitions", () => {
    assert.equal(canTransitionAttempt(ATTEMPT_STATUSES.NOT_STARTED, ATTEMPT_STATUSES.IN_PROGRESS), true);
    assert.equal(canTransitionAttempt(ATTEMPT_STATUSES.IN_PROGRESS, ATTEMPT_STATUSES.SUBMITTED), true);
    assert.equal(canTransitionAttempt(ATTEMPT_STATUSES.SUBMITTED, ATTEMPT_STATUSES.COMPLETED), true);
    
    // Invalid transitions
    assert.equal(canTransitionAttempt(ATTEMPT_STATUSES.COMPLETED, ATTEMPT_STATUSES.IN_PROGRESS), false);
    assert.equal(canTransitionAttempt(ATTEMPT_STATUSES.EXPIRED, ATTEMPT_STATUSES.SECTION_IN_PROGRESS), false);
    assert.equal(canTransitionAttempt(ATTEMPT_STATUSES.NOT_STARTED, ATTEMPT_STATUSES.COMPLETED), false);
  });

  await t.test("1.12: Server constants enforce ₹199 price in integer minor paise", () => {
    assert.equal(EXAM_PRICE_PAISE, 19900);
    assert.equal(EXAM_CURRENCY, "INR");
  });
});
