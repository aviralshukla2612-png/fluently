import { NextResponse } from "next/server";
import { examRepository } from "@/lib/db/examRepository.js";
import { ensureBaselineExamsSeeded } from "@/lib/exams/seedData/index.js";

/**
 * GET /api/exams
 * Returns the public catalog of published exams (academic mock & diagnostic).
 * Strictly omits answer keys and scoring rubrics.
 */
export async function GET() {
  try {
    await ensureBaselineExamsSeeded();
    const exams = await examRepository.getPublishedExams();

    return NextResponse.json({
      success: true,
      exams,
    });
  } catch (err) {
    console.error("[api/exams] Error fetching catalog:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load examination catalog." },
      { status: 500 }
    );
  }
}
