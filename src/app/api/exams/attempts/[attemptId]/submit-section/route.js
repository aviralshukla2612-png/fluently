import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { verifySameOrigin } from "@/lib/auth/csrf.js";
import { examRepository } from "@/lib/db/examRepository.js";
import { gradeObjectiveSection } from "@/lib/exams/scoring/objectiveGrader.js";
import { calculateObjectiveBand } from "@/lib/exams/scoring/bandScoreCalculator.js";

/**
 * POST /api/exams/attempts/[attemptId]/submit-section
 * Submits an individual section, grades objective sections (Listening / Reading),
 * and advances the candidate's current section.
 */
export async function POST(request, { params }) {
  try {
    const originCheck = verifySameOrigin(request);
    if (!originCheck.allowed) {
      return NextResponse.json({ success: false, error: originCheck.reason || "Forbidden" }, { status: 403 });
    }

    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const resolvedParams = await params;
    const attemptId = resolvedParams?.attemptId;

    const attempt = await examRepository.findAttemptById(attemptId);
    if (!attempt) {
      return NextResponse.json({ success: false, error: "Attempt not found." }, { status: 404 });
    }

    if (attempt.userId !== authUser.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const sectionType = body.sectionType;
    const nextSectionType = body.nextSectionType || null;

    if (!sectionType) {
      return NextResponse.json({ success: false, error: "Missing sectionType." }, { status: 400 });
    }

    // Load full internal exam with questions and answer keys
    const internalExam = await examRepository.findExamById(attempt.examId);
    const targetSection = (internalExam?.sections || []).find((s) => s.sectionType === sectionType);

    if (targetSection) {
      // If Listening or Reading, run objective grading
      if (sectionType === "LISTENING" || sectionType === "READING") {
        const responses = attempt.responses.filter((r) => r.sectionType === sectionType);
        const graded = gradeObjectiveSection({
          questions: targetSection.questions,
          responses,
        });

        const estimatedBand = calculateObjectiveBand({
          rawScore: graded.rawScore,
          maxRawScore: graded.maxRawScore,
          sectionType,
        });

        await examRepository.saveSectionResult(attemptId, {
          sectionType,
          rawScore: graded.rawScore,
          maxRawScore: graded.maxRawScore,
          estimatedBand,
          feedbackSummary: `Scored ${graded.rawScore} of ${graded.maxRawScore} correct questions.`,
        });
      }
    }

    // Advance current section
    await examRepository.updateAttempt(attemptId, {
      currentSection: nextSectionType,
    });

    return NextResponse.json({
      success: true,
      sectionSubmitted: sectionType,
      nextSection: nextSectionType,
    });
  } catch (err) {
    console.error("[api/exams/attempts/[attemptId]/submit-section] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to submit section." }, { status: 500 });
  }
}
