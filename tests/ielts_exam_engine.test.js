import test from "node:test";
import assert from "node:assert/strict";
import { examRepository } from "../src/lib/db/examRepository.js";
import { ensureBaselineExamsSeeded } from "../src/lib/exams/seedData/index.js";
import {
  EXAM_STATUSES,
  ATTEMPT_STATUSES,
  ORDER_STATUSES,
  EXAM_PRICE_PAISE,
  EXAM_CURRENCY,
} from "../src/lib/exams/examTypes.js";

test("IELTS Mock Exam: Core Exam Engine & Repository Suite", async (t) => {
  examRepository._resetMemoryStore();
  await ensureBaselineExamsSeeded();

  await t.test("2.1: Seeds baseline exams and discovers published exams", async () => {
    const published = await examRepository.getPublishedExams();
    assert.ok(published.length >= 2, "Must contain at least diagnostic and academic mock");
    
    const diag = published.find((e) => e.isDiagnostic === true);
    assert.ok(diag, "Diagnostic exam must exist");
    assert.equal(diag.pricePaise, 0);

    const fullMock = published.find((e) => e.isDiagnostic === false);
    assert.ok(fullMock, "Full mock exam must exist");
    assert.equal(fullMock.pricePaise, 19900);
    assert.equal(fullMock.currency, "INR");
  });

  await t.test("2.2: Client-safe exam strictly strips correctAnswerKey and scoringRubric", async () => {
    const published = await examRepository.getPublishedExams();
    const mockExam = published.find((e) => !e.isDiagnostic);

    // Full internal model contains keys
    const internal = await examRepository.findExamById(mockExam.id);
    const listeningQ1 = internal.sections[0].questions[0];
    assert.ok(listeningQ1.correctAnswerKey, "Internal question has answer key");

    // Client-safe projection MUST NOT contain keys
    const clientSafe = await examRepository.findClientSafeExamById(mockExam.id);
    for (const sec of clientSafe.sections) {
      for (const q of sec.questions) {
        assert.equal(q.correctAnswerKey, undefined, `Question ${q.id} must not leak correctAnswerKey`);
        assert.equal(q.scoringRubric, undefined, `Question ${q.id} must not leak scoringRubric`);
      }
    }
  });

  await t.test("2.3: Order creation and idempotent payment verification", async () => {
    const userId = "usr_test_candidate_1";
    const examId = "exam_academic_01";

    const order = await examRepository.createOrder({
      userId,
      examId,
      providerOrderId: "order_rzp_mock_12345",
      amountPaise: EXAM_PRICE_PAISE,
      currency: EXAM_CURRENCY,
    });

    assert.equal(order.status, ORDER_STATUSES.PENDING);
    assert.equal(order.amountPaise, 19900);

    // Verify payment
    const paidOrder = await examRepository.markOrderPaid({
      orderId: order.id,
      providerPaymentId: "pay_rzp_mock_67890",
      providerSignature: "sig_mock_valid_hmac",
    });

    assert.equal(paidOrder.status, ORDER_STATUSES.PAID);
    assert.ok(paidOrder.paidAt);

    // Idempotent second call returns already paid order
    const repeatPaid = await examRepository.markOrderPaid({
      orderId: order.id,
      providerPaymentId: "pay_rzp_mock_67890",
      providerSignature: "sig_mock_valid_hmac",
    });
    assert.equal(repeatPaid.status, ORDER_STATUSES.PAID);

    // Verifies active paid entitlement
    const entitlement = await examRepository.findActivePaidEntitlement(userId, examId);
    assert.ok(entitlement);
    assert.equal(entitlement.id, order.id);
  });

  await t.test("2.4: Attempt creation calculates server-side duration and expiration", async () => {
    const userId = "usr_test_candidate_1";
    const examId = "exam_academic_01";

    const attempt = await examRepository.createAttempt({
      userId,
      examId,
      isDiagnostic: false,
      durationMinutes: 165,
    });

    assert.ok(attempt.id);
    assert.equal(attempt.status, ATTEMPT_STATUSES.IN_PROGRESS);
    assert.ok(attempt.startedAt);
    assert.ok(attempt.expiresAt);

    // expiresAt must be greater than startedAt by 165 mins + grace period (300s)
    const expectedDiffMs = (165 * 60 + 300) * 1000;
    const actualDiffMs = new Date(attempt.expiresAt).getTime() - new Date(attempt.startedAt).getTime();
    assert.equal(actualDiffMs, expectedDiffMs);
  });

  await t.test("2.5: Autosaving responses records values and word counts", async () => {
    const userId = "usr_test_candidate_1";
    const examId = "exam_academic_01";
    const attempt = await examRepository.createAttempt({ userId, examId });

    const saved = await examRepository.saveResponses(attempt.id, [
      {
        sectionType: "LISTENING",
        questionId: "a1_l01",
        responseValue: "Meadowview",
        wordCount: 1,
      },
      {
        sectionType: "WRITING",
        questionId: "a1_w01",
        responseValue: "The bar chart provides an overview of energy distribution over a fifteen-year period.",
        wordCount: 12,
      },
    ]);

    assert.equal(saved.length, 2);

    const hydrated = await examRepository.findAttemptById(attempt.id);
    assert.equal(hydrated.responses.length, 2);
    const writingResp = hydrated.responses.find((r) => r.questionId === "a1_w01");
    assert.equal(writingResp.wordCount, 12);
  });

  await t.test("2.6: Final submission, section results, and immutable report persistence", async () => {
    const userId = "usr_test_candidate_1";
    const examId = "exam_academic_01";
    const attempt = await examRepository.createAttempt({ userId, examId });

    // Save Section Result for Listening
    await examRepository.saveSectionResult(attempt.id, {
      sectionType: "LISTENING",
      rawScore: 32,
      maxRawScore: 40,
      estimatedBand: 7.5,
      feedbackSummary: "Strong comprehension of specific factual information and numeric values.",
    });

    // Update Attempt to Completed
    await examRepository.updateAttempt(attempt.id, {
      status: ATTEMPT_STATUSES.COMPLETED,
      overallBandScore: 7.5,
      completedAt: new Date(),
    });

    // Save Final Report
    const reportData = {
      overallBand: 7.5,
      sections: {
        listening: { band: 7.5, rawScore: 32 },
      },
      strengths: ["Accurate listening recall"],
      weaknesses: ["Reading pace"],
    };

    await examRepository.saveExamReport(attempt.id, userId, reportData);

    const report = await examRepository.findReportByAttemptId(attempt.id);
    assert.ok(report);
    assert.equal(report.reportData.overallBand, 7.5);

    // Verify user history
    const history = await examRepository.getUserHistory(userId);
    assert.ok(history.length >= 1);
    const targetInHistory = history.find((h) => h.id === attempt.id);
    assert.ok(targetInHistory);
    assert.equal(targetInHistory.overallBandScore, 7.5);
  });
});
