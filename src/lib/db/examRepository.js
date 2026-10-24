import { prisma, isDatabaseConfigured } from "./prisma.js";
import {
  EXAM_STATUSES,
  ATTEMPT_STATUSES,
  ORDER_STATUSES,
  EXAM_PRICE_PAISE,
  EXAM_CURRENCY,
  EXAM_GRACE_PERIOD_SECONDS,
} from "../exams/examTypes.js";

// In-memory fallback for local unit tests and offline testing
const examMemoryStore = globalThis.__shadowly_examMemoryStore || {
  exams: new Map(),
  sections: new Map(), // examId -> Array<section>
  questions: new Map(), // sectionId -> Array<question>
  orders: new Map(),
  transactions: new Map(),
  attempts: new Map(),
  responses: new Map(), // attemptId -> Map<questionId, response>
  sectionResults: new Map(), // attemptId -> Map<sectionType, result>
  reports: new Map(), // attemptId -> report
};

if (!globalThis.__shadowly_examMemoryStore) {
  globalThis.__shadowly_examMemoryStore = examMemoryStore;
}

function assertProductionPersistence() {
  if (process.env.NODE_ENV === "production" && !isDatabaseConfigured()) {
    throw new Error(
      "[examRepository] FATAL: Production environment detected without a configured PostgreSQL database (DATABASE_URL)."
    );
  }
}

export const examRepository = {
  _resetMemoryStore() {
    examMemoryStore.exams.clear();
    examMemoryStore.sections.clear();
    examMemoryStore.questions.clear();
    examMemoryStore.orders.clear();
    examMemoryStore.transactions.clear();
    examMemoryStore.attempts.clear();
    examMemoryStore.responses.clear();
    examMemoryStore.sectionResults.clear();
    examMemoryStore.reports.clear();
  },

  /**
   * Seeds an exam into persistence (used by initial migrations/seeders and tests)
   */
  async upsertExam(examData) {
    if (isDatabaseConfigured()) {
      const { sections = [], ...core } = examData;
      return await prisma.$transaction(async (tx) => {
        const exam = await tx.exam.upsert({
          where: { slug: core.slug },
          update: core,
          create: core,
        });

        for (const sec of sections) {
          const { questions = [], ...secCore } = sec;
          const section = await tx.examSection.upsert({
            where: {
              examId_sectionType: {
                examId: exam.id,
                sectionType: secCore.sectionType,
              },
            },
            update: { ...secCore, examId: exam.id },
            create: { ...secCore, examId: exam.id },
          });

          for (const q of questions) {
            await tx.examQuestion.upsert({
              where: { id: q.id || `q_${section.id}_${q.questionNumber}` },
              update: { ...q, sectionId: section.id },
              create: { ...q, id: q.id || `q_${section.id}_${q.questionNumber}`, sectionId: section.id },
            });
          }
        }

        return exam;
      });
    }

    assertProductionPersistence();

    // Memory Store Implementation
    examMemoryStore.exams.set(examData.id, examData);
    if (examData.sections) {
      examMemoryStore.sections.set(examData.id, examData.sections);
      for (const sec of examData.sections) {
        if (sec.questions) {
          examMemoryStore.questions.set(sec.id, sec.questions);
        }
      }
    }
    return examData;
  },

  /**
   * Retrieves list of published exams
   */
  async getPublishedExams({ includeDiagnostic = true } = {}) {
    if (isDatabaseConfigured()) {
      return await prisma.exam.findMany({
        where: {
          status: EXAM_STATUSES.PUBLISHED,
          ...(includeDiagnostic ? {} : { isDiagnostic: false }),
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          slug: true,
          examType: true,
          version: true,
          status: true,
          description: true,
          durationMinutes: true,
          pricePaise: true,
          currency: true,
          isDiagnostic: true,
          createdAt: true,
        },
      });
    }

    assertProductionPersistence();

    return Array.from(examMemoryStore.exams.values())
      .filter((e) => e.status === EXAM_STATUSES.PUBLISHED)
      .filter((e) => (includeDiagnostic ? true : !e.isDiagnostic))
      .map(({ sections, ...safe }) => safe);
  },

  /**
   * Finds full exam with answer keys (SERVER INTERNAL ONLY)
   */
  async findExamById(examId) {
    if (!examId) return null;

    if (isDatabaseConfigured()) {
      return await prisma.exam.findUnique({
        where: { id: examId },
        include: {
          sections: {
            orderBy: { orderIndex: "asc" },
            include: {
              questions: {
                orderBy: { questionNumber: "asc" },
              },
            },
          },
        },
      });
    }

    assertProductionPersistence();

    const exam = examMemoryStore.exams.get(examId) || null;
    if (!exam) return null;

    const sections = examMemoryStore.sections.get(examId) || [];
    const hydratedSections = sections.map((sec) => ({
      ...sec,
      questions: examMemoryStore.questions.get(sec.id) || [],
    }));

    return { ...exam, sections: hydratedSections };
  },

  /**
   * Finds client-safe exam, strictly stripping all answer keys and hidden rubrics
   */
  async findClientSafeExamById(examId) {
    const full = await this.findExamById(examId);
    if (!full) return null;

    return {
      id: full.id,
      title: full.title,
      slug: full.slug,
      examType: full.examType,
      version: full.version,
      status: full.status,
      description: full.description,
      durationMinutes: full.durationMinutes,
      pricePaise: full.pricePaise,
      currency: full.currency,
      isDiagnostic: full.isDiagnostic,
      sections: (full.sections || []).map((sec) => ({
        id: sec.id,
        sectionType: sec.sectionType,
        title: sec.title,
        orderIndex: sec.orderIndex,
        durationMinutes: sec.durationMinutes,
        instructions: sec.instructions,
        config: sec.config,
        questions: (sec.questions || []).map((q) => ({
          id: q.id,
          questionNumber: q.questionNumber,
          questionType: q.questionType,
          prompt: q.prompt,
          passageText: q.passageText,
          audioUrl: q.audioUrl,
          options: q.options,
          wordLimit: q.wordLimit,
          // CRITICAL SECURITY: Never leak correctAnswerKey or scoringRubric
        })),
      })),
    };
  },

  /**
   * Creates a pending purchase order
   */
  async createOrder({ userId, examId, providerOrderId, amountPaise = EXAM_PRICE_PAISE, currency = EXAM_CURRENCY }) {
    if (isDatabaseConfigured()) {
      return await prisma.examOrder.create({
        data: {
          userId,
          examId,
          amountPaise,
          currency,
          status: ORDER_STATUSES.PENDING,
          provider: "razorpay",
          providerOrderId,
        },
      });
    }

    assertProductionPersistence();

    const order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      examId,
      amountPaise,
      currency,
      status: ORDER_STATUSES.PENDING,
      provider: "razorpay",
      providerOrderId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    examMemoryStore.orders.set(order.id, order);
    return order;
  },

  async findOrderById(orderId) {
    if (!orderId) return null;
    if (isDatabaseConfigured()) {
      return await prisma.examOrder.findUnique({
        where: { id: orderId },
        include: { exam: true },
      });
    }

    assertProductionPersistence();
    return examMemoryStore.orders.get(orderId) || null;
  },

  async findOrderByProviderOrderId(providerOrderId) {
    if (!providerOrderId) return null;
    if (isDatabaseConfigured()) {
      return await prisma.examOrder.findUnique({
        where: { providerOrderId },
        include: { exam: true },
      });
    }

    assertProductionPersistence();
    for (const order of examMemoryStore.orders.values()) {
      if (order.providerOrderId === providerOrderId) {
        return order;
      }
    }
    return null;
  },

  /**
   * Idempotently marks an order as PAID
   */
  async markOrderPaid({ orderId, providerPaymentId, providerSignature }) {
    if (isDatabaseConfigured()) {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.examOrder.findUnique({ where: { id: orderId } });
        if (!existing) return null;

        if (existing.status === ORDER_STATUSES.PAID) {
          return existing; // Idempotent return
        }

        const updated = await tx.examOrder.update({
          where: { id: orderId },
          data: {
            status: ORDER_STATUSES.PAID,
            providerPaymentId,
            providerSignature,
            paidAt: new Date(),
          },
        });

        await tx.paymentTransaction.create({
          data: {
            orderId,
            providerPaymentId,
            eventType: "PAYMENT_VERIFIED",
            status: "PAID",
            verified: true,
          },
        });

        return updated;
      });
    }

    assertProductionPersistence();

    const order = examMemoryStore.orders.get(orderId);
    if (!order) return null;

    order.status = ORDER_STATUSES.PAID;
    order.providerPaymentId = providerPaymentId;
    order.providerSignature = providerSignature;
    order.paidAt = new Date();
    order.updatedAt = new Date();
    return order;
  },

  /**
   * Updates order status with optional transaction metadata
   */
  async updateOrderStatus(orderId, status, data = {}) {
    if (status === ORDER_STATUSES.PAID) {
      return await this.markOrderPaid({
        orderId,
        providerPaymentId: data.paymentId || data.providerPaymentId || "pay_mock_direct",
        providerSignature: data.signature || data.providerSignature || "sig_mock_direct",
      });
    }
    if (isDatabaseConfigured()) {
      return await prisma.examOrder.update({
        where: { id: orderId },
        data: { status, updatedAt: new Date() },
      });
    }
    assertProductionPersistence();
    const order = examMemoryStore.orders.get(orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date();
    }
    return order;
  },

  /**
   * Verifies if a user has an unused paid entitlement for a given exam
   */
  async findActivePaidEntitlement(userId, examId) {
    if (isDatabaseConfigured()) {
      const orders = await prisma.examOrder.findMany({
        where: {
          userId,
          examId,
          status: ORDER_STATUSES.PAID,
        },
        include: {
          attempts: {
            select: { id: true, status: true },
          },
        },
        orderBy: { paidAt: "desc" },
      });

      // An order grants an attempt if it has no completed attempts associated
      return orders.find(
        (o) => !o.attempts || o.attempts.every((a) => a.status !== ATTEMPT_STATUSES.COMPLETED)
      ) || null;
    }

    assertProductionPersistence();

    for (const order of examMemoryStore.orders.values()) {
      if (order.userId === userId && order.examId === examId && order.status === ORDER_STATUSES.PAID) {
        return order;
      }
    }
    return null;
  },

  /**
   * Helper checking if user has an active paid entitlement for exam
   */
  async hasUserPaidForExam(userId, examId) {
    const entitlement = await this.findActivePaidEntitlement(userId, examId);
    return Boolean(entitlement);
  },

  /**
   * Creates a candidate exam attempt with server-side start and expiration timestamps
   */
  async createAttempt({ userId, examId, orderId = null, isDiagnostic = false, durationMinutes = 165 }) {
    const startedAt = new Date();
    // Duration + grace period in ms
    const expiresAt = new Date(startedAt.getTime() + (durationMinutes * 60 + EXAM_GRACE_PERIOD_SECONDS) * 1000);

    if (isDatabaseConfigured()) {
      return await prisma.examAttempt.create({
        data: {
          userId,
          examId,
          orderId,
          isDiagnostic,
          status: ATTEMPT_STATUSES.IN_PROGRESS,
          startedAt,
          expiresAt,
        },
      });
    }

    assertProductionPersistence();

    const attempt = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      examId,
      orderId,
      isDiagnostic,
      examVersion: "1.0.0",
      status: ATTEMPT_STATUSES.IN_PROGRESS,
      currentSection: null,
      startedAt,
      expiresAt,
      deadlineAt: expiresAt,
      submittedAt: null,
      completedAt: null,
      overallBandScore: null,
      overallSummary: null,
      scoringVersion: "v1-academic",
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    examMemoryStore.attempts.set(attempt.id, attempt);
    return attempt;
  },

  async findAttemptById(attemptId) {
    if (!attemptId) return null;

    if (isDatabaseConfigured()) {
      return await prisma.examAttempt.findUnique({
        where: { id: attemptId },
        include: {
          exam: true,
          responses: true,
          sectionResults: true,
          report: true,
        },
      });
    }

    assertProductionPersistence();

    const attempt = examMemoryStore.attempts.get(attemptId) || null;
    if (!attempt) return null;

    const exam = examMemoryStore.exams.get(attempt.examId) || null;
    const respMap = examMemoryStore.responses.get(attemptId) || new Map();
    const responses = Array.from(respMap.values());
    const resMap = examMemoryStore.sectionResults.get(attemptId) || new Map();
    const sectionResults = Array.from(resMap.values());
    const report = examMemoryStore.reports.get(attemptId) || null;

    return { ...attempt, exam, responses, sectionResults, report };
  },

  /**
   * Autosaves candidate responses safely
   */
  async saveResponses(attemptId, responses = []) {
    let normalized = [];
    if (Array.isArray(responses)) {
      normalized = responses;
    } else if (responses && typeof responses === "object") {
      normalized = Object.entries(responses).map(([questionId, responseValue]) => ({
        questionId,
        responseValue: typeof responseValue === "string" ? responseValue : JSON.stringify(responseValue),
      }));
    }

    if (normalized.length === 0) return [];

    if (isDatabaseConfigured()) {
      const ops = normalized.map((r) =>
        prisma.examResponse.upsert({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: r.questionId,
            },
          },
          update: {
            responseValue: r.responseValue,
            wordCount: r.wordCount || 0,
            updatedAt: new Date(),
          },
          create: {
            attemptId,
            sectionType: r.sectionType || "OBJECTIVE",
            questionId: r.questionId,
            responseValue: r.responseValue,
            wordCount: r.wordCount || 0,
          },
        })
      );
      return await prisma.$transaction(ops);
    }

    assertProductionPersistence();

    let attemptRespMap = examMemoryStore.responses.get(attemptId);
    if (!attemptRespMap) {
      attemptRespMap = new Map();
      examMemoryStore.responses.set(attemptId, attemptRespMap);
    }

    const saved = [];
    for (const r of normalized) {
      const entry = {
        id: `resp_${attemptId}_${r.questionId}`,
        attemptId,
        sectionType: r.sectionType,
        questionId: r.questionId,
        responseValue: r.responseValue,
        wordCount: r.wordCount || 0,
        savedAt: new Date(),
        updatedAt: new Date(),
      };
      attemptRespMap.set(r.questionId, entry);
      saved.push(entry);
    }
    return saved;
  },

  /**
   * Updates attempt status with state validation
   */
  async updateAttempt(attemptId, updateFields = {}) {
    if (isDatabaseConfigured()) {
      return await prisma.examAttempt.update({
        where: { id: attemptId },
        data: updateFields,
      });
    }

    assertProductionPersistence();

    const attempt = examMemoryStore.attempts.get(attemptId);
    if (!attempt) return null;

    Object.assign(attempt, updateFields, { updatedAt: new Date() });
    return attempt;
  },

  /**
   * Completes an attempt and marks final band score
   */
  async completeAttempt(attemptId, { overallBand, overallBandScore, ...rest } = {}) {
    const band = overallBandScore ?? overallBand ?? null;
    return await this.updateAttempt(attemptId, {
      status: ATTEMPT_STATUSES.COMPLETED,
      overallBandScore: band,
      overallBand: band,
      completedAt: new Date(),
      ...rest,
    });
  },

  /**
   * Saves an evaluated section result
   */
  async saveSectionResult(attemptId, result) {
    if (isDatabaseConfigured()) {
      return await prisma.examSectionResult.upsert({
        where: {
          attemptId_sectionType: {
            attemptId,
            sectionType: result.sectionType,
          },
        },
        update: {
          rawScore: result.rawScore,
          maxRawScore: result.maxRawScore,
          estimatedBand: result.estimatedBand,
          criterionScores: result.criterionScores || null,
          feedbackSummary: result.feedbackSummary || null,
          strengths: result.strengths || [],
          weaknesses: result.weaknesses || [],
          recommendations: result.recommendations || [],
          evaluatedAt: new Date(),
        },
        create: {
          attemptId,
          sectionType: result.sectionType,
          rawScore: result.rawScore,
          maxRawScore: result.maxRawScore,
          estimatedBand: result.estimatedBand,
          criterionScores: result.criterionScores || null,
          feedbackSummary: result.feedbackSummary || null,
          strengths: result.strengths || [],
          weaknesses: result.weaknesses || [],
          recommendations: result.recommendations || [],
        },
      });
    }

    assertProductionPersistence();

    let attemptResMap = examMemoryStore.sectionResults.get(attemptId);
    if (!attemptResMap) {
      attemptResMap = new Map();
      examMemoryStore.sectionResults.set(attemptId, attemptResMap);
    }

    const saved = {
      id: `secres_${attemptId}_${result.sectionType}`,
      attemptId,
      ...result,
      evaluatedAt: new Date(),
    };
    attemptResMap.set(result.sectionType, saved);
    return saved;
  },

  /**
   * Saves durable immutable final exam report
   */
  async saveExamReport(attemptId, userId, reportData) {
    if (isDatabaseConfigured()) {
      return await prisma.examReport.upsert({
        where: { attemptId },
        update: {
          reportData,
          generatedAt: new Date(),
        },
        create: {
          attemptId,
          userId,
          reportData,
        },
      });
    }

    assertProductionPersistence();

    const report = {
      id: `rep_${attemptId}`,
      attemptId,
      userId,
      reportData,
      generatedAt: new Date(),
    };
    examMemoryStore.reports.set(attemptId, report);
    return report;
  },

  async saveReport(firstArg, ...rest) {
    if (typeof firstArg === "object" && firstArg !== null && firstArg.attemptId) {
      return await this.saveExamReport(firstArg.attemptId, firstArg.userId || "usr_default", firstArg.reportData || firstArg);
    }
    return await this.saveExamReport(firstArg, ...rest);
  },

  async findReportByAttemptId(attemptId) {
    if (isDatabaseConfigured()) {
      return await prisma.examReport.findUnique({
        where: { attemptId },
      });
    }

    assertProductionPersistence();
    return examMemoryStore.reports.get(attemptId) || null;
  },

  async getReportByAttemptId(attemptId) {
    return await this.findReportByAttemptId(attemptId);
  },

  /**
   * Retrieves candidate's past examination history
   */
  async getUserHistory(userId) {
    if (!userId) return [];

    if (isDatabaseConfigured()) {
      return await prisma.examAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          exam: {
            select: {
              title: true,
              slug: true,
              examType: true,
              isDiagnostic: true,
            },
          },
          sectionResults: true,
          report: true,
        },
      });
    }

    assertProductionPersistence();

    const userAttempts = Array.from(examMemoryStore.attempts.values())
      .filter((a) => a.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);

    return userAttempts.map((att) => {
      const exam = examMemoryStore.exams.get(att.examId) || {};
      const resMap = examMemoryStore.sectionResults.get(att.id) || new Map();
      const sectionResults = Array.from(resMap.values());
      const report = examMemoryStore.reports.get(att.id) || null;
      return { ...att, exam, sectionResults, report };
    });
  },
};
