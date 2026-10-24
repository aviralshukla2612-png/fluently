import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { examRepository } from "@/lib/db/examRepository.js";

/**
 * GET /api/exams/attempts/[attemptId]/report
 * Retrieves candidate's finalized exam report.
 * Strictly verifies user ownership (IDOR defense).
 */
export async function GET(request, { params }) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const resolvedParams = await params;
    const attemptId = resolvedParams?.attemptId;

    const report = await examRepository.findReportByAttemptId(attemptId);
    if (!report) {
      return NextResponse.json({ success: false, error: "Report not found or not yet evaluated." }, { status: 404 });
    }

    if (report.userId !== authUser.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized access to report." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      report: report.reportData,
      generatedAt: report.generatedAt,
    });
  } catch (err) {
    console.error("[api/exams/attempts/[attemptId]/report] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to load report." }, { status: 500 });
  }
}
