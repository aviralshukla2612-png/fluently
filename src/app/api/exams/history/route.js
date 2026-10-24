import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { examRepository } from "@/lib/db/examRepository.js";

/**
 * GET /api/exams/history
 * Returns the authenticated candidate's examination history.
 */
export async function GET(request) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const history = await examRepository.getUserHistory(authUser.userId);

    const safeHistory = history.map((att) => ({
      id: att.id,
      examId: att.examId,
      examTitle: att.exam?.title || "IELTS Practice Assessment",
      examType: att.exam?.examType || "ACADEMIC",
      isDiagnostic: att.isDiagnostic,
      status: att.status,
      startedAt: att.startedAt,
      completedAt: att.completedAt,
      overallBandScore: att.overallBandScore,
      overallSummary: att.overallSummary,
      sections: (att.sectionResults || []).map((sec) => ({
        sectionType: sec.sectionType,
        estimatedBand: sec.estimatedBand,
        rawScore: sec.rawScore,
      })),
    }));

    return NextResponse.json({
      success: true,
      history: safeHistory,
    });
  } catch (err) {
    console.error("[api/exams/history] History retrieval error:", err);
    return NextResponse.json({ success: false, error: "Failed to retrieve exam history." }, { status: 500 });
  }
}
