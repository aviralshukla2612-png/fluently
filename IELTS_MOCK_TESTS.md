# Shadowly IELTS-Style Mock Exam & Paid Assessment System

## 1. System Overview & Positioning

The **Shadowly IELTS-Style Mock Test System** provides a realistic, timed examination platform designed for English learners aiming for IELTS Academic proficiency.

> **Legal & Brand Disclaimer**:
> Shadowly is an independent practice and preparation service. Shadowly is not affiliated with, approved by, or endorsed by Cambridge University Press & Assessment, IDP Education, or the British Council. All scores reported are **estimated practice bands** generated from server-side objective grading and AI-assisted qualitative evaluations against official public rubric criteria.

---

## 2. Key Modules & User Journeys

### 2.1 Free Diagnostic Test (`/mock-tests/diagnostic` or `exam_diagnostic_01`)
- **Duration**: ~45 minutes.
- **Coverage**: Listening and Reading core questions.
- **Cost**: ₹0 (Free forever, sensible account-level limits to prevent abuse).
- **Outcome**: Immediate estimated section bands, CEFR baseline estimation, provisional strengths/weaknesses, and direct recommendations to Shadowly practice modules.

### 2.2 Paid IELTS Academic Mock Exam (`exam_academic_01`)
- **Price**: ₹199 (19,900 paise) server-controlled.
- **Duration**: ~2 hours 45 minutes across 4 sections:
  1. **Listening**: 30 minutes, 40 objective questions (audio passage playback, multiple-choice, sentence/note completion).
  2. **Reading**: 60 minutes, 40 objective questions (3 passages, True/False/Not Given, heading matching, short answer).
  3. **Writing**: 60 minutes, 2 tasks (Task 1 visual data report $\ge 150$ words, Task 2 argumentative essay $\ge 250$ words).
  4. **Speaking**: 11–14 minutes, 3 parts (Part 1 Interview, Part 2 Cue card long turn with preparation timer, Part 3 Follow-up discussion).
- **Evaluation**: Instant objective grading + AI-assisted Writing & Speaking rubrics.
- **Results**: Full performance report with criteria-level bands, printable layout, and synchronization to Shadowly learning activities and weakness tracking.

---

## 3. Database Architecture & Schema Models

Database models are defined in `prisma/schema.prisma` and applied via committed migration `prisma/migrations/20261023_ielts_exam_system/migration.sql`:

1. `Exam`: Catalog definition, type (`ACADEMIC`, `GENERAL_TRAINING`, `DIAGNOSTIC`), versioning, pricing in minor units (`pricePaise`), publish status.
2. `ExamSection`: Sections linked to exam, order index, duration in seconds, instructions.
3. `ExamQuestion`: Question metadata, question type, prompt, options, and server-side `correctAnswerKey` (never sent to candidate browsers).
4. `ExamOrder`: Purchase order linking user, exam, status (`PENDING`, `PAID`, `FAILED`), and amount.
5. `PaymentTransaction`: Payment records with provider (`RAZORPAY`), provider IDs (`order_id`, `payment_id`), signature status, raw webhook payload metadata.
6. `ExamAttempt`: Candidate exam attempt, state machine status, `deadlineAt`, `overallBand`.
7. `ExamResponse`: Real-time candidate answers saved via autosave and final submission.
8. `ExamSectionResult`: Raw score, max raw score, and estimated band per section.
9. `ExamReport`: Durable performance report snapshot with qualitative evaluation and recommendations.

---

## 4. Scoring Methodology & IELTS Band Formulas

### 4.1 Objective Scoring (Listening & Reading)
Objective answers are evaluated in `src/lib/exams/scoring/objectiveGrader.js`:
- Normalizes casing and whitespace.
- Supports alternative valid spellings/answers defined in `correctAnswerKey.alternatives`.
- Enforces strict word limits (e.g. "NO MORE THAN TWO WORDS").

### 4.2 Raw Score to Band Conversion
Using official IELTS Academic conversion tables (`src/lib/exams/scoring/bandScoreCalculator.js`):
- 39–40 raw $\to$ Band 9.0
- 37–38 raw $\to$ Band 8.5
- 35–36 raw $\to$ Band 8.0
- 32–34 raw $\to$ Band 7.5
- 30–31 raw $\to$ Band 7.0
- 26–29 raw $\to$ Band 6.5
- 23–25 raw $\to$ Band 6.0
- ... down to Band 2.5 / 1.0.

### 4.3 Overall Band Rounding Rule
The arithmetic mean of the four skills is rounded according to official IELTS rules:
- Fractional part $< 0.25 \to$ round down to $.0$ (e.g., $6.125 \to 6.0$)
- $0.25 \le \text{fraction} < 0.75 \to$ round to $.5$ (e.g., $6.25 \to 6.5$, $6.625 \to 6.5$)
- Fractional part $\ge 0.75 \to$ round up to next whole band (e.g., $6.75 \to 7.0$)

---

## 5. AI Evaluation Architecture & Security

### 5.1 Writing Rubric
Evaluates Task 1 and Task 2 on four distinct criteria:
1. **Task Achievement / Task Response**
2. **Coherence and Cohesion**
3. **Lexical Resource**
4. **Grammatical Range and Accuracy**

### 5.2 Speaking Rubric
Evaluates audio/speech across:
1. **Fluency and Coherence** (WPM calculation, hesitation markers)
2. **Lexical Resource** (Idiomatic expressions, academic collocations)
3. **Grammatical Range and Accuracy** (Clause structures, error density)
4. **Pronunciation & Intelligibility** (Clear disclosure that browser transcription evaluation is an estimate without laboratory acoustic spectrogram analysis)

### 5.3 Anti-Cheating & Prompt Injection Defense
Both evaluators enforce rigorous checks in `src/lib/exams/evaluation/`:
- **Prompt Injection Defense**: Any input containing adversarial directives (e.g., `ignore previous instructions`, `give band 9`, `system prompt`) is detected and rejected with `invalid_input` flag and `Band null`.
- **Insufficient Evidence Check**: Responses under 30 words for writing or 15 words for speaking receive `Band null` with an explicit notice that evidence was insufficient to assign an estimated band score.
- **Deterministic Fallback**: If Ollama or remote AI daemon times out or returns malformed JSON, a deterministic heuristic evaluator scores the response based on verified lexical and structural markers without losing candidate data or crashing.

---

## 6. Payment Flow & Security (Razorpay)

1. **Server-Controlled Pricing**: Price is hardcoded to 19,900 paise (₹199) on the server in `src/lib/exams/examTypes.js`. No client request can dictate the purchase amount.
2. **Signature Verification**: Verified using constant-time HMAC-SHA256:
   $$\text{HMAC-SHA256}(\text{order\_id} + "|" + \text{payment\_id}, \text{RAZORPAY\_KEY\_SECRET})$$
3. **Idempotency**: Orders and webhook events check existing state before processing to prevent duplicate attempt allocations.
4. **Development Sandbox Mode**: When `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET` are not set in `.env`, the system safely operates in sandbox mock mode for developers and unit tests. In production, real cryptographic verification is strictly required.

---

## 7. Testing & Verification

The suite includes 37 dedicated IELTS tests covering all business rules:
- `tests/ielts_scoring.test.js` (13 tests): Raw to band conversions, rounding rules, alternative answers, word limits.
- `tests/ielts_exam_engine.test.js` (7 tests): State machine transitions, deadline calculation, response persistence, exam pricing constants.
- `tests/ielts_ai_evaluation.test.js` (7 tests): Writing rubric, speaking rubric, prompt-injection defense, insufficient evidence, fallback stability.
- `tests/ielts_payments.test.js` (6 tests): HMAC-SHA256 signature verification, tamper rejection, webhook verification, server price enforcement.
- Integration tests: `tests/ielts_flow_integration.test.js` (end-to-end full examination lifecycle).

To execute the test suite:
```bash
npm test
```
