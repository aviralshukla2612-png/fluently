import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { verifySameOrigin } from "@/lib/auth/csrf.js";
import { examRepository } from "@/lib/db/examRepository.js";
import { gradeObjectiveSection } from "@/lib/exams/scoring/objectiveGrader.js";
import { calculateObjectiveBand, roundToIELTSBand } from "@/lib/exams/scoring/bandScoreCalculator.js";
import { evaluateWritingTask } from "@/lib/exams/evaluation/writingEvaluator.js";
import { evaluateSpeakingResponse } from "@/lib/exams/evaluation/speakingEvaluator.js";
import {
  buildComprehensiveExamReport,
  syncExamProgressToLearningActivity,
} from "@/lib/exams/evaluation/examFeedbackService.js";

/**
 * POST /api/exams/attempts/[attemptId]/submit-final
 * Finalizes examination attempt, executes objective grading and AI evaluations,
 * generates immutable score report, and records progress in Shadowly.
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

    // If already completed, return existing report immediately
    if (attempt.status === "COMPLETED") {
      const existingReport = await examRepository.findReportByAttemptId(attemptId);
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        report: existingReport?.reportData,
      });
    }

    // Set status to EVALUATING while processing
    await examRepository.updateAttempt(attemptId, {
      status: "EVALUATING",
      submittedAt: new Date(),
    });

    const fullExam = await examRepository.findExamById(attempt.examId);
    const responses = attempt.responses || [];

    // 1. Grade Objective Sections (Listening and Reading) if not already saved
    for (const sec of fullExam.sections || []) {
      if (sec.sectionType === "LISTENING" || sec.sectionType === "READING") {
        const secResponses = responses.filter((r) => r.sectionType === sec.sectionType);
        const graded = gradeObjectiveSection({
          questions: sec.questions,
          responses: secResponses,
        });

        const estimatedBand = calculateObjectiveBand({
          rawScore: graded.rawScore,
          maxRawScore: graded.maxRawScore,
          sectionType: sec.sectionType,
        });

        await examRepository.saveSectionResult(attemptId, {
          sectionType: sec.sectionType,
          rawScore: graded.rawScore,
          maxRawScore: graded.maxRawScore,
          estimatedBand,
          feedbackSummary: `Answered ${graded.rawScore} of ${graded.maxRawScore} questions correctly.`,
        });
      }
    }

    // 2. Evaluate Writing Section
    const writingSection = (fullExam.sections || []).find((s) => s.sectionType === "WRITING");
    if (writingSection) {
      const taskEvaluations = [];
      for (const q of writingSection.questions || []) {
        const userResp = responses.find((r) => r.questionId === q.id);
        const text = userResp?.responseValue || "";
        const evaluated = await evaluateWritingTask({
          taskType: q.questionType,
          prompt: q.prompt,
          responseText: text,
        });
        taskEvaluations.push(evaluated);
      }

      // Average task scores (Task 2 has double weight in IELTS, but mean of evaluated tasks is standard)
      const validTaskBands = taskEvaluations.map((t) => t.estimatedBand).filter((b) => typeof b === "number");
      const writingBand = validTaskBands.length > 0
        ? roundToIELTSBand(validTaskBands.reduce((sum, b) => sum + b, 0) / validTaskBands.length)
        : null;

      const strengths = taskEvaluations.flatMap((t) => t.feedback?.strengths || []);
      const weaknesses = taskEvaluations.flatMap((t) => t.feedback?.weaknesses || []);
      const recommendations = taskEvaluations.flatMap((t) => t.feedback?.actionableImprovements || []);

      await examRepository.saveSectionResult(attemptId, {
        sectionType: "WRITING",
        estimatedBand: writingBand,
        criterionScores: taskEvaluations[taskEvaluations.length - 1]?.criterionScores || null,
        feedbackSummary: writingBand ? `Estimated Writing Band: ${writingBand}` : "Insufficient writing evidence.",
        strengths: strengths.slice(0, 3),
        weaknesses: weaknesses.slice(0, 3),
        recommendations: recommendations.slice(0, 3),
      });
    }

    // 3. Evaluate Speaking Section
    const speakingSection = (fullExam.sections || []).find((s) => s.sectionType === "SPEAKING");
    if (speakingSection) {
      const speechEvaluations = [];
      for (const q of speakingSection.questions || []) {
        const userResp = responses.find((r) => r.questionId === q.id);
        const transcript = userResp?.responseValue || "";
        const evaluated = await evaluateSpeakingResponse({
          prompt: q.prompt,
          transcript,
          durationSeconds: 45,
        });
        speechEvaluations.push(evaluated);
      }

      const validSpeakingBands = speechEvaluations.map((s) => s.estimatedBand).filter((b) => typeof b === "number");
      const speakingBand = validSpeakingBands.length > 0
        ? roundToIELTSBand(validSpeakingBands.reduce((sum, b) => sum + b, 0) / validSpeakingBands.length)
        : null;

      const strengths = speechEvaluations.flatMap((s) => s.feedback?.strengths || []);
      const weaknesses = speechEvaluations.flatMap((s) => s.feedback?.weaknesses || []);
      const recommendations = speechEvaluations.flatMap((s) => s.feedback?.actionableImprovements || []);

      await examRepository.saveSectionResult(attemptId, {
        sectionType: "SPEAKING",
        estimatedBand: speakingBand,
        criterionScores: speechEvaluations[speechEvaluations.length - 1]?.criterionScores || null,
        feedbackSummary: speakingBand ? `Estimated Speaking Band: ${speakingBand}` : "Insufficient speaking evidence.",
        strengths: strengths.slice(0, 3),
        weaknesses: weaknesses.slice(0, 3),
        recommendations: recommendations.slice(0, 3),
      });
    }

    // 4. Hydrate updated section results and generate comprehensive report
    const refreshedAttempt = await examRepository.findAttemptById(attemptId);
    const finalReportData = buildComprehensiveExamReport({
      attempt: refreshedAttempt,
      sectionResults: refreshedAttempt.sectionResults,
    });

    // Save final report
    await examRepository.saveExamReport(attemptId, authUser.userId, finalReportData);

    // Update attempt to COMPLETED
    await examRepository.updateAttempt(attemptId, {
      status: "COMPLETED",
      completedAt: new Date(),
      overallBandScore: finalReportData.overallBand,
      overallSummary: finalReportData.overallDescriptor?.description || null,
    });

    // 5. Synchronize with central Shadowly Learning Activity
    if (finalReportData.overallBand) {
      await syncExamProgressToLearningActivity({
        userId: authUser.userId,
        attemptId,
        overallBand: finalReportData.overallBand,
        isDiagnostic: attempt.isDiagnostic,
      });
    }

    return NextResponse.json({
      success: true,
      status: "COMPLETED",
      report: finalReportData,
    });
  } catch (err) {
    console.error("[api/exams/attempts/[attemptId]/submit-final] Final submit error:", err);
    return NextResponse.json(
      { success: false, error: "Final examination processing failed." },
      { status: 500 }
    );
  }
}
