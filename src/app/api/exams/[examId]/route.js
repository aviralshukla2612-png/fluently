import { NextResponse } from "next/server";
import { examRepository } from "@/lib/db/examRepository.js";
import { ensureBaselineExamsSeeded } from "@/lib/exams/seedData/index.js";

/**
 * GET /api/exams/[examId]
 * Returns client-safe exam details, sections, and questions.
 * Answer keys and private scoring rubrics are strictly stripped.
 */
export async function GET(request, { params }) {
  try {
    await ensureBaselineExamsSeeded();
    const resolvedParams = await params;
    const examId = resolvedParams?.examId;

    if (!examId) {
      return NextResponse.json({ success: false, error: "Missing examId." }, { status: 400 });
    }

    const clientSafe = await examRepository.findClientSafeExamById(examId);
    if (!clientSafe) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      exam: clientSafe,
    });
  } catch (err) {
    console.error("[api/exams/[examId]] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load exam details." },
      { status: 500 }
    );
  }
}
