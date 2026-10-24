import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { examRepository } from "../src/lib/db/examRepository.js";
import { ensureBaselineExamsSeeded } from "../src/lib/exams/seedData/index.js";
import { getBandFromRawScore, calculateOverallBand } from "../src/lib/exams/scoring/bandScoreCalculator.js";
import { gradeObjectiveSection } from "../src/lib/exams/scoring/objectiveGrader.js";
import { evaluateWritingResponse } from "../src/lib/exams/evaluation/writingEvaluator.js";
import { evaluateSpeakingResponse } from "../src/lib/exams/evaluation/speakingEvaluator.js";
import {
  buildComprehensiveExamReport,
  syncExamProgressToLearningActivity,
} from "../src/lib/exams/evaluation/examFeedbackService.js";
import { EXAM_PRICE_PAISE, EXAM_STATES } from "../src/lib/exams/examTypes.js";

describe("IELTS End-to-End Exam Workflow Integration", () => {
  const testUserId = "user_integration_test_001";

  before(async () => {
    examRepository._resetMemoryStore();
    await ensureBaselineExamsSeeded();
  });

  it("1. Free diagnostic test lifecycle without payment requirement", async () => {
    // 1. Get published catalog
    const exams = await examRepository.getPublishedExams();
    const diagnostic = exams.find((e) => e.isDiagnostic === true);
    assert.ok(diagnostic, "Diagnostic exam should be present in catalog");
    assert.equal(diagnostic.pricePaise, 0, "Diagnostic must be free");

    // 2. Start attempt directly
    const attempt = await examRepository.createAttempt({
      examId: diagnostic.id,
      userId: testUserId,
    });
    assert.equal(attempt.status, EXAM_STATES.IN_PROGRESS);
    assert.ok(attempt.deadlineAt > new Date());

    // 3. Save responses
    const responses = {
      diag_l1: "8 AM",
      diag_l2: "24",
      diag_l3: "No fee",
    };
    await examRepository.saveResponses(attempt.id, responses);

    // 4. Verify objective grading for diagnostic
    const fullDiagnostic = await examRepository.findExamById(diagnostic.id);
    const lSection = fullDiagnostic.sections.find((s) => s.sectionType === "LISTENING");
    const lResult = gradeObjectiveSection(lSection.questions, responses);
    assert.equal(lResult.rawScore, 3);
    assert.equal(lResult.totalQuestions, lSection.questions.length);

    // 5. Complete attempt
    const completed = await examRepository.completeAttempt(attempt.id, {
      overallBand: 7.0,
    });
    assert.equal(completed.status, EXAM_STATES.COMPLETED);
    assert.equal(completed.overallBand, 7.0);
  });

  it("2. Paid full-length Academic mock exam lifecycle with entitlement verification", async () => {
    const exams = await examRepository.getPublishedExams();
    const academic = exams.find((e) => !e.isDiagnostic);
    assert.ok(academic, "Academic exam should be in catalog");
    assert.equal(academic.pricePaise, EXAM_PRICE_PAISE);

    // 1. Create order
    const order = await examRepository.createOrder({
      userId: testUserId,
      examId: academic.id,
      amountPaise: EXAM_PRICE_PAISE,
      currency: "INR",
    });
    assert.equal(order.status, "PENDING");

    // 2. Cannot start without paid status
    let hasAccess = await examRepository.hasUserPaidForExam(testUserId, academic.id);
    assert.equal(hasAccess, false);

    // 3. Complete payment
    await examRepository.updateOrderStatus(order.id, "PAID", {
      paymentId: "pay_test_integration_123",
      transactionId: "txn_test_123",
    });

    hasAccess = await examRepository.hasUserPaidForExam(testUserId, academic.id);
    assert.equal(hasAccess, true, "User must now have paid access");

    // 4. Start paid attempt
    const attempt = await examRepository.createAttempt({
      examId: academic.id,
      userId: testUserId,
      orderId: order.id,
    });
    assert.equal(attempt.status, EXAM_STATES.IN_PROGRESS);

    // 5. Objective grading
    const fullAcademic = await examRepository.findExamById(academic.id);
    const listeningSection = fullAcademic.sections.find((s) => s.sectionType === "LISTENING");
    const listeningResponses = {
      a1_l01: "Meadowview",
      a1_l02: "Kingfisher",
      a1_l03: "680",
      a1_l04: "Electricity",
    };
    const lScore = gradeObjectiveSection(listeningSection.questions, listeningResponses);
    assert.equal(lScore.rawScore, 4);

    // 6. AI writing evaluation
    const sampleWriting = `The chart illustrates renewable energy production across five European nations from 2010 to 2020. Overall, substantial growth occurred in wind and solar power generation across all monitored countries, whereas traditional hydropower experienced relatively modest fluctuations over the same ten-year period. In 2010, hydropower accounted for the majority of green electricity generation, contributing over fifty percent of aggregate output. However, over the subsequent decade, aggressive investment in wind infrastructure drove a fourfold expansion, reaching approximately one hundred and twenty gigawatt-hours by 2020. Solar capacity demonstrated an even steeper upward trajectory, particularly after 2015 when module costs declined dramatically. Consequently, combined renewable sources contributed thirty-eight percent of regional electricity demand by the conclusion of the survey period, signaling a decisive shift toward decarbonized electrical grids.`;
    const writingEval = await evaluateWritingResponse(
      {
        taskNumber: 1,
        prompt: "Summarize the chart information.",
        response: sampleWriting,
      },
      { timeoutMs: 100 }
    );
    assert.ok(typeof writingEval.estimatedBand === "number" && writingEval.estimatedBand >= 5.5);

    // 7. Synthesize report & learning recommendations
    const sectionResults = [
      { sectionType: "LISTENING", estimatedBand: 7.0, rawScore: 30 },
      { sectionType: "READING", estimatedBand: 6.5, rawScore: 28 },
      { sectionType: "WRITING", estimatedBand: writingEval.estimatedBand },
      { sectionType: "SPEAKING", estimatedBand: 6.5 },
    ];
    const reportData = buildComprehensiveExamReport({
      attempt,
      sectionResults,
    });

    assert.ok(reportData.overallBand !== null);
    assert.ok(reportData.recommendations.length > 0);

    const syncResult = await syncExamProgressToLearningActivity({
      userId: testUserId,
      attemptId: attempt.id,
      overallBand: reportData.overallBand,
      isDiagnostic: false,
    });
    assert.ok(syncResult !== undefined);

    // 8. Save report in repository
    const savedReport = await examRepository.saveReport({
      attemptId: attempt.id,
      reportData,
    });
    assert.ok(savedReport);

    // 9. Fetch report
    const retrievedReport = await examRepository.getReportByAttemptId(attempt.id);
    assert.ok(retrievedReport);
    assert.equal(retrievedReport.reportData.overallBand, reportData.overallBand);
  });
});
