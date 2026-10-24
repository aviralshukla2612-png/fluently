-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "examType" TEXT NOT NULL DEFAULT 'ACADEMIC',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 165,
    "pricePaise" INTEGER NOT NULL DEFAULT 19900,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isDiagnostic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_sections" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "instructions" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "questionType" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "passageText" TEXT,
    "audioUrl" TEXT,
    "options" JSONB,
    "correctAnswerKey" JSONB,
    "scoringRubric" JSONB,
    "wordLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL DEFAULT 19900,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "providerSignature" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "orderId" TEXT,
    "isDiagnostic" BOOLEAN NOT NULL DEFAULT false,
    "examVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "currentSection" TEXT,
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "overallBandScore" DOUBLE PRECISION,
    "overallSummary" TEXT,
    "scoringVersion" TEXT NOT NULL DEFAULT 'v1-academic',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_responses" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "responseValue" TEXT,
    "wordCount" INTEGER,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_section_results" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "rawScore" DOUBLE PRECISION,
    "maxRawScore" DOUBLE PRECISION,
    "estimatedBand" DOUBLE PRECISION,
    "criterionScores" JSONB,
    "feedbackSummary" TEXT,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "recommendations" JSONB,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_section_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_reports" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportData" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exams_slug_key" ON "exams"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "exam_sections_examId_sectionType_key" ON "exam_sections"("examId", "sectionType");

-- CreateIndex
CREATE INDEX "exam_questions_sectionId_questionNumber_idx" ON "exam_questions"("sectionId", "questionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "exam_orders_providerOrderId_key" ON "exam_orders"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_orders_providerPaymentId_key" ON "exam_orders"("providerPaymentId");

-- CreateIndex
CREATE INDEX "exam_orders_userId_status_idx" ON "exam_orders"("userId", "status");

-- CreateIndex
CREATE INDEX "payment_transactions_orderId_eventType_idx" ON "payment_transactions"("orderId", "eventType");

-- CreateIndex
CREATE INDEX "exam_attempts_userId_status_idx" ON "exam_attempts"("userId", "status");

-- CreateIndex
CREATE INDEX "exam_attempts_userId_createdAt_idx" ON "exam_attempts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "exam_responses_attemptId_sectionType_idx" ON "exam_responses"("attemptId", "sectionType");

-- CreateIndex
CREATE UNIQUE INDEX "exam_responses_attemptId_questionId_key" ON "exam_responses"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_section_results_attemptId_sectionType_key" ON "exam_section_results"("attemptId", "sectionType");

-- CreateIndex
CREATE UNIQUE INDEX "exam_reports_attemptId_key" ON "exam_reports"("attemptId");

-- CreateIndex
CREATE INDEX "exam_reports_userId_generatedAt_idx" ON "exam_reports"("userId", "generatedAt");

-- AddForeignKey
ALTER TABLE "exam_sections" ADD CONSTRAINT "exam_sections_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_orders" ADD CONSTRAINT "exam_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_orders" ADD CONSTRAINT "exam_orders_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "exam_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "exam_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_responses" ADD CONSTRAINT "exam_responses_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_section_results" ADD CONSTRAINT "exam_section_results_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_reports" ADD CONSTRAINT "exam_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_reports" ADD CONSTRAINT "exam_reports_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
