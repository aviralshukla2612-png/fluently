/**
 * Shadowly IELTS-Style Mock Exam Engine — Core Domain Types & State Rules
 * Strictly follows official IELTS Academic conventions while remaining an independent assessment tool.
 */

export const EXAM_PRICE_PAISE = 19900; // ₹199.00 integer minor units
export const EXAM_CURRENCY = "INR";
export const EXAM_GRACE_PERIOD_SECONDS = 300; // 5-minute network grace period for server deadline enforcement

export const EXAM_TYPES = Object.freeze({
  ACADEMIC: "ACADEMIC",
  GENERAL_TRAINING: "GENERAL_TRAINING",
});

export const EXAM_STATUSES = Object.freeze({
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
});

export const SECTION_TYPES = Object.freeze({
  LISTENING: "LISTENING",
  READING: "READING",
  WRITING: "WRITING",
  SPEAKING: "SPEAKING",
});

export const SECTION_ORDER = Object.freeze([
  SECTION_TYPES.LISTENING,
  SECTION_TYPES.READING,
  SECTION_TYPES.WRITING,
  SECTION_TYPES.SPEAKING,
]);

export const SECTION_DURATIONS_MINUTES = Object.freeze({
  [SECTION_TYPES.LISTENING]: 35, // 30 mins audio + 5 mins transfer review
  [SECTION_TYPES.READING]: 60,
  [SECTION_TYPES.WRITING]: 60,
  [SECTION_TYPES.SPEAKING]: 15,
});

export const ATTEMPT_STATUSES = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  SECTION_IN_PROGRESS: "SECTION_IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
  EVALUATING: "EVALUATING",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
});
export const EXAM_STATES = ATTEMPT_STATUSES;

export const ORDER_STATUSES = Object.freeze({
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
});

export const QUESTION_TYPES = Object.freeze({
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  TRUE_FALSE_NOT_GIVEN: "TRUE_FALSE_NOT_GIVEN",
  YES_NO_NOT_GIVEN: "YES_NO_NOT_GIVEN",
  MATCHING_HEADINGS: "MATCHING_HEADINGS",
  MATCHING_INFORMATION: "MATCHING_INFORMATION",
  SENTENCE_COMPLETION: "SENTENCE_COMPLETION",
  SUMMARY_COMPLETION: "SUMMARY_COMPLETION",
  SHORT_ANSWER: "SHORT_ANSWER",
  WRITING_TASK1: "WRITING_TASK1",
  WRITING_TASK2: "WRITING_TASK2",
  SPEAKING_PART1: "SPEAKING_PART1",
  SPEAKING_PART2: "SPEAKING_PART2",
  SPEAKING_PART3: "SPEAKING_PART3",
});

// Allowed State Machine Transitions
const ALLOWED_ATTEMPT_TRANSITIONS = {
  [ATTEMPT_STATUSES.NOT_STARTED]: [
    ATTEMPT_STATUSES.IN_PROGRESS,
    ATTEMPT_STATUSES.SECTION_IN_PROGRESS,
    ATTEMPT_STATUSES.CANCELLED,
  ],
  [ATTEMPT_STATUSES.IN_PROGRESS]: [
    ATTEMPT_STATUSES.SECTION_IN_PROGRESS,
    ATTEMPT_STATUSES.SUBMITTED,
    ATTEMPT_STATUSES.EXPIRED,
    ATTEMPT_STATUSES.CANCELLED,
  ],
  [ATTEMPT_STATUSES.SECTION_IN_PROGRESS]: [
    ATTEMPT_STATUSES.SECTION_IN_PROGRESS, // changing sections
    ATTEMPT_STATUSES.SUBMITTED,
    ATTEMPT_STATUSES.EXPIRED,
    ATTEMPT_STATUSES.CANCELLED,
  ],
  [ATTEMPT_STATUSES.SUBMITTED]: [
    ATTEMPT_STATUSES.EVALUATING,
    ATTEMPT_STATUSES.COMPLETED,
  ],
  [ATTEMPT_STATUSES.EVALUATING]: [
    ATTEMPT_STATUSES.COMPLETED,
  ],
  [ATTEMPT_STATUSES.COMPLETED]: [],
  [ATTEMPT_STATUSES.EXPIRED]: [],
  [ATTEMPT_STATUSES.CANCELLED]: [],
};

/**
 * Validates whether an attempt state transition is allowed
 * @param {string} fromStatus
 * @param {string} toStatus
 * @returns {boolean}
 */
export function canTransitionAttempt(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  const allowed = ALLOWED_ATTEMPT_TRANSITIONS[fromStatus];
  return Boolean(allowed && allowed.includes(toStatus));
}

/**
 * Returns whether an attempt is currently interactive (can accept response updates)
 * @param {string} status
 * @returns {boolean}
 */
export function isAttemptActive(status) {
  return (
    status === ATTEMPT_STATUSES.IN_PROGRESS ||
    status === ATTEMPT_STATUSES.SECTION_IN_PROGRESS
  );
}
