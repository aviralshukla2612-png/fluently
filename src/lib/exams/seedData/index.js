import { DIAGNOSTIC_EXAM } from "./diagnosticExam.js";
import { ACADEMIC_EXAM_1 } from "./academicExam1.js";
import { examRepository } from "../../db/examRepository.js";

export const SEED_EXAMS = [DIAGNOSTIC_EXAM, ACADEMIC_EXAM_1];

let isSeeded = false;

/**
 * Ensures baseline exams are seeded into persistence
 */
export async function ensureBaselineExamsSeeded() {
  if (isSeeded) return;
  try {
    for (const exam of SEED_EXAMS) {
      await examRepository.upsertExam(exam);
    }
    isSeeded = true;
  } catch (err) {
    console.error("[seedData] Failed to seed baseline exams:", err.message);
  }
}
