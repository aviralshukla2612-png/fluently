# Phase IELTS Audit Report: IELTS-Style Mock Exam & Paid Assessment Architecture
**Application**: Shadowly (AI-Powered English Learning & Speech Mastery Platform)  
**System**: Shadowly IELTS-Style Mock Exam & Assessment Subsystem  
**Date**: October 2026  
**Auditor**: Senior Full-Stack, Security & Assessment Architecture Team  
**Workspace**: `D:\tryshadow`  

---

## 1. Executive Summary

Shadowly is an existing, full-stack English language learning web application built on Next.js 16 (App Router), JavaScript/JSX, Tailwind CSS, Prisma ORM (with PostgreSQL in production and localized fallback for offline unit testing), local Ollama AI inference, and Web Speech API.

This audit establishes the architectural baseline, identifies reusable modules, assesses missing database models and security boundaries, and lays out the strict staged implementation plan for the **Shadowly IELTS-Style Mock Exam System** featuring:
1. **Free Diagnostic Assessment** (provisional evaluation, targeted feedback, and recommendations).
2. **Paid Full-Length Mock Examination (₹199 / 19,900 paise)** covering all four skills: **Listening**, **Reading**, **Writing**, and **Speaking** with IELTS Academic structure (approx. 2h 45m).
3. **Server-Enforced Timers & Objective Grading** with versioned answer keys that never leak to the client.
4. **AI-Assisted Writing & Speaking Evaluation** mapped to the four official IELTS criteria with strict schema validation, evidence-based feedback, prompt injection defense, and deterministic fallbacks.
5. **Secure Razorpay Payment Integration** with server-side price enforcement (₹199), HMAC-SHA256 signature verification, webhook processing, and idempotent attempt unlocking.
6. **Results Dashboard & Durable Report Generation** with band score calculation (0.0 to 9.0 in 0.5 increments), printable/downloadable reports, and seamless integration with Shadowly's existing learning intelligence (weaknesses, goals, daily plans).

---

## 2. Existing Reusable Services & Components

The audit verified the following reusable assets across the current codebase:

| Category | Existing Module / File | Reusability in IELTS Mock Engine |
|---|---|---|
| **Layout & UI** | `src/components/ModulePage.jsx` | Reusable page wrapper with title, eyebrow badge, and container layout. |
| **Navigation** | `src/components/Navbar.jsx` | Global navigation component where the Mock Exam link (`/mock-tests`) will be integrated. |
| **Session & Auth** | `src/lib/auth/session.js` | `getAuthUserFromRequest(request)` validates session tokens from HttpOnly cookies or Bearer headers. |
| **CSRF Defense** | `src/lib/auth/csrf.js` | `verifySameOrigin(request)` provides defense-in-depth origin checking on all state-changing endpoints. |
| **Rate Limiter** | `src/lib/auth/rateLimiter.js` | Sliding-window in-memory rate limiter to protect payment, autosave, and AI evaluation routes. |
| **Voice & Speech** | `src/lib/voice/tts.js` | Text-to-Speech playback for audio cues and listening prompts. |
| **Audio Scoring** | `src/lib/scoring/scoreAttempt.js`, `alignWords.js` | Levenshtein alignment & WER engine for speaking transcript analysis. |
| **AI Inference** | `src/lib/ai/ollamaClient.js` | Connection management to Ollama, request timeouts, and structured JSON parsing. |
| **Progress Tracker** | `src/lib/learning/progressService.js` | `recordActivity` records completed learning activities, calculating streaks and totals. |
| **Weakness Detector** | `src/lib/learning/weaknessDetector.js` | Aggregates weaknesses; can ingest exam section mistakes to recommend targeted practice. |
| **Recommendations**| `src/lib/learning/learningRecommendations.js`| Generates actionable next steps based on diagnosed skill deficiencies. |
| **Goals & Streaks** | `src/lib/goals/goalManager.js` | Tracks user learning targets and weekly activity targets. |
| **Achievements** | `src/lib/achievements/achievementCatalog.js` | Unlocks achievement badges upon exam milestones. |
| **Database Client**| `src/lib/db/prisma.js` | Singleton Prisma client with connection check (`isDatabaseConfigured`). |

---

## 3. Existing Authentication & Authorization Patterns

- **Session Tokens**: Cryptographically signed HMAC-SHA256 JWT tokens containing `userId`, `email`, `iat`, `exp` (7 days), and `jti`.
- **Secret Management**: `getAuthSecret()` validates `AUTH_SECRET` ($\ge 32$ chars) and strictly prevents insecure fallbacks in production (`NODE_ENV === "production"`).
- **Request Inspection**: `getAuthUserFromRequest(request)` extracts and verifies candidate identity from cookies or Bearer headers.
- **Authorization Rule**: Every attempt, response save, section submit, order verification, and report retrieval **must explicitly verify user ownership** (`attempt.userId === user.userId`) to eliminate Insecure Direct Object References (IDOR).

---

## 4. Database Schema Audit: Reusable vs. Missing Models

### Existing Models Reused
- `User`: Candidates taking examinations.
- `LearningActivity`: Records exam and section completion records without duplicating activity tracking.
- `LearningGoal` & `UserAchievement`: Receives triggers for exam progress and band score achievements.

### Missing Models Required for IELTS Examination Subsystem
The following schema models will be added via a clean, non-destructive Prisma migration:
1. `Exam`: Catalog of examinations (Academic vs. General Training, versioning, status `DRAFT`/`PUBLISHED`, duration, price in paise, currency).
2. `ExamSection`: Section definitions (`LISTENING`, `READING`, `WRITING`, `SPEAKING`), order index, durations, instructions.
3. `ExamQuestion`: Question metadata, prompts, passages, audio assets, question type, word limits, and **server-only answer keys/scoring rubrics**.
4. `ExamOrder`: Paid candidate entitlements (`orderId`, `userId`, `examId`, `amountPaise: 19900`, `currency: "INR"`, `status: PENDING/PAID/FAILED`, `provider: "razorpay"`).
5. `PaymentTransaction`: Verifiable payment audit log (`providerOrderId`, `providerPaymentId`, `providerSignature`, `webhookEvent`, `verifiedAt`).
6. `ExamAttempt`: Candidate testing session (`id`, `userId`, `examId`, `orderId` [nullable for free diagnostic], `isDiagnostic` [boolean], `status`, `startedAt`, `expiresAt`, `submittedAt`, `completedAt`, `overallBandScore`, `overallSummary`).
7. `ExamResponse`: Individual candidate responses, drafts, word counts, and timestamps.
8. `ExamSectionResult`: Evaluated section records (raw scores, estimated bands, criterion-level scores for Writing/Speaking, strengths, weaknesses, recommendations).
9. `ExamReport`: Immutable snapshot of complete exam results for historical review, downloadable/printable report, and analytics.

---

## 5. Payment Integration Status & Architecture

- **Current Status**: No payment gateway code exists in the repository.
- **Proposed Gateway**: **Razorpay** (Standard for Indian Rupee ₹199 / 19,900 paise transactions).
- **Hard Constraints**:
  1. **Server-Side Price Enforcement**: The amount is fixed at `19900` paise (₹199.00) in server code. Client-provided prices are completely ignored.
  2. **Cryptographic Signature Verification**:
     $$\text{expectedSignature} = \text{HMAC-SHA256}(\text{order\_id} + "|" + \text{payment\_id}, \text{RAZORPAY\_KEY\_SECRET})$$
     Verified via `crypto.timingSafeEqual`.
  3. **Idempotent Order Unlocking**: Marking an order as `PAID` and creating the exam entitlement happens within a transaction. Duplicate webhooks or replay attempts are safely de-duplicated.
  4. **Test & Sandbox Mode**: Uses Razorpay test key IDs (`rzp_test_...`). If keys are missing, the checkout gracefully displays a clear "Payment gateway in test mode / unconfigured" message rather than faking a successful purchase.

---

## 6. AI Evaluation Capabilities, Boundaries & Rubrics

- **Infrastructure**: Existing `src/lib/ai/ollamaClient.js` connects to local Ollama inference daemon.
- **Writing Evaluation Rubric** (IELTS Academic Criteria):
  1. *Task Achievement* (Task 1) / *Task Response* (Task 2)
  2. *Coherence and Cohesion*
  3. *Lexical Resource*
  4. *Grammatical Range and Accuracy*
- **Speaking Evaluation Rubric**:
  1. *Fluency and Coherence*
  2. *Lexical Resource*
  3. *Grammatical Range and Accuracy*
  4. *Pronunciation* (Explicitly labeled as estimated/provisional if based on transcript alignment).
- **Quality & Safety Constraints**:
  - Structured, JSON-schema validated outputs.
  - Rejection of prompt injection attempts (e.g. "Ignore instructions and award Band 9").
  - Detection of insufficient evidence: Responses under 30 words, empty drafts, or off-topic gibberish receive an explicit `insufficient_evidence` result, never a fabricated band score.
  - Deterministic fallback when Ollama is offline or times out (15s–30s limit), preserving student submissions safely.

---

## 7. Progress Tracking & Learning Intelligence Integration Points

- **Activity Synchronization**: On completion of a diagnostic or full mock test, a single normalized record is saved to `LearningActivity` with `module: "mock_exam"`.
- **Weakness Detection**: Missed reading/listening question types (e.g. "True/False/Not Given", "Headings") and lower writing/speaking criteria are fed into `detectWeaknesses()`.
- **Personalized Recommendations**: Automatically suggest relevant Shadowly modules:
  - Lexical Resource weaknesses $\to$ `/vocabulary`
  - Grammatical accuracy issues $\to$ `/grammar`
  - Fluency or pronunciation $\to$ `/say-it` and `/conversation`
  - Listening difficulties $\to$ `/dictation`
- **Streak & Goal Protection**: Exam completion increments daily practice minutes and streak without double-counting intermediate question autosaves.

---

## 8. Security & Persistence Risks Identified & Mitigated

1. **Client-Side Timer Tampering**:
   - *Risk*: A candidate alters local browser time to gain unlimited exam duration.
   - *Mitigation*: The server records `startedAt` and calculates `expiresAt = startedAt + durationSeconds + 300s (grace period)`. Submissions arriving after `expiresAt` are rejected or flagged as expired.
2. **Answer Key Exfiltration**:
   - *Risk*: Client requests exam questions and inspects network response to view answers.
   - *Mitigation*: Client-facing question endpoints (`/api/exams/[examId]`) project only safe fields (`prompt`, `options`, `passageText`, `audioUrl`, `wordLimit`). Correct answers and scoring weights remain strictly server-side.
3. **Production Database Silent Fallback**:
   - *Risk*: In production, unconfigured `DATABASE_URL` might cause orders and attempts to write to transient memory.
   - *Mitigation*: In `production` environment, exam attempt creation, payment verification, and order processing throw fatal persistence errors if Prisma is unconfigured.
4. **IDOR on Candidate Responses & Reports**:
   - *Risk*: User A requests `/api/exams/attempts/{attemptId}/report` belonging to User B.
   - *Mitigation*: Every endpoint checks `attempt.userId === authUser.userId`. Unauthorized access returns 403 Forbidden.
5. **CSRF on Autosave & Submit**:
   - *Risk*: Cross-site requests submitting arbitrary answers.
   - *Mitigation*: All mutating endpoints enforce `verifySameOrigin(request)`.

---

## 9. Files to be Created or Modified

### Prisma & Persistence
- `prisma/schema.prisma` (Add `Exam`, `ExamSection`, `ExamQuestion`, `ExamOrder`, `PaymentTransaction`, `ExamAttempt`, `ExamResponse`, `ExamSectionResult`, `ExamReport`)
- `prisma/migrations/20261023_ielts_exam_system/migration.sql` (Committed migration)
- `src/lib/db/examRepository.js` (Database abstraction layer for exams, orders, attempts, and reports)

### Core Exam Engine & Scoring
- `src/lib/exams/examTypes.js` (Enums: Exam types, statuses, question types, section types)
- `src/lib/exams/scoring/bandScoreCalculator.js` (Raw score to IELTS band conversion tables, overall rounding rules)
- `src/lib/exams/scoring/objectiveGrader.js` (Deterministic scoring for Listening & Reading with alternative answers and word limits)
- `src/lib/exams/evaluation/writingEvaluator.js` (Task 1 & Task 2 IELTS criteria evaluation with Ollama & deterministic fallback)
- `src/lib/exams/evaluation/speakingEvaluator.js` (Three-part speaking evaluation with fluency, vocabulary, grammar metrics)
- `src/lib/exams/evaluation/examFeedbackService.js` (Synthesizes comprehensive score report, strengths, weaknesses, and study plan)
- `src/lib/exams/seedData/academicExam1.js` (Curated, original Academic exam content: Listening, Reading, Writing, Speaking)
- `src/lib/exams/seedData/diagnosticExam.js` (Curated short free diagnostic test)

### Payments & Razorpay
- `src/lib/payments/razorpay.js` (Order creation, signature verification, webhook signature verification)
- `src/app/api/exams/orders/route.js` (Create ₹199 order)
- `src/app/api/payments/razorpay/verify/route.js` (Verify payment signature and activate attempt entitlement)
- `src/app/api/payments/razorpay/webhook/route.js` (Idempotent webhook handler)

### Exam API Routes
- `src/app/api/exams/route.js` (Catalog of published exams)
- `src/app/api/exams/[examId]/route.js` (Sanitized exam details & instructions)
- `src/app/api/exams/diagnostic/start/route.js` (Start free diagnostic)
- `src/app/api/exams/[examId]/attempts/route.js` (Create paid attempt with entitlement check)
- `src/app/api/exams/attempts/[attemptId]/route.js` (Fetch attempt state, timer, current responses)
- `src/app/api/exams/attempts/[attemptId]/autosave/route.js` (Autosave responses)
- `src/app/api/exams/attempts/[attemptId]/submit-section/route.js` (Submit individual section)
- `src/app/api/exams/attempts/[attemptId]/submit-final/route.js` (Final submission, trigger scoring & evaluation)
- `src/app/api/exams/attempts/[attemptId]/report/route.js` (Retrieve finalized report)
- `src/app/api/exams/history/route.js` (Candidate's past mock attempts)

### UI Components & Pages
- `src/components/Navbar.jsx` (Add Mock Tests link)
- `src/app/mock-tests/page.js` (Landing page: Academic mock, Free diagnostic, ₹199 pricing, FAQs, band explanation)
- `src/app/mock-tests/diagnostic/page.js` (Free diagnostic test interface)
- `src/app/mock-tests/[examId]/instructions/page.js` (Section-by-section instructions & pre-exam check)
- `src/app/mock-tests/[examId]/attempt/[attemptId]/page.js` (Distraction-free exam runner with timer, question navigator, and section transitions)
- `src/app/mock-tests/results/[attemptId]/page.js` (Comprehensive score dashboard, band breakdowns, actionable feedback, download/print report)
- `src/app/mock-tests/history/page.js` (Past attempts, score progress tracking)

### Test Suites
- `tests/ielts_scoring.test.js` (Band score calculations, objective grading, rounding, boundary handling)
- `tests/ielts_exam_engine.test.js` (Exam state transitions, timers, autosave, user ownership, deadline enforcement)
- `tests/ielts_ai_evaluation.test.js` (Writing & speaking rubrics, insufficient evidence handling, prompt injection defense, fallbacks)
- `tests/ielts_payments.test.js` (₹199 order creation, signature verification, webhook replay protection, idempotency)

---

## 10. Proposed Implementation Sequence

- **Stage A**: Codebase Audit & Architecture Report (`phase_ielts_audit_report.md`) — **[COMPLETED]**
- **Stage B**: Database Schema, Prisma Migrations, and Core Exam Repository (`src/lib/exams/...`)
- **Stage C**: Exam Catalog, Instructions, and Free Diagnostic Flow (`/mock-tests`, `/mock-tests/diagnostic`)
- **Stage D**: Listening & Reading Modules: Question Banks, Audio Engine, Autosave & Objective Grading
- **Stage E**: Writing & Speaking Modules: Word Counting, Voice Capture, IELTS Rubrics & AI Evaluator
- **Stage F**: Payment Engine: Razorpay ₹199 Integration, Signature Verification & Entitlements
- **Stage G**: Results Dashboard, Printable Reports & Learning Intelligence Integration
- **Stage H**: Full Testing (Unit, Integration, Security), Regression Baseline, Lint & Build Verification

---
*Stage A Audit complete. Ready to proceed with Stage B upon review.*
