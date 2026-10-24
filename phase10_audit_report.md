# Phase 10 Audit Report: Production Readiness, Security & Reliability Hardening
**Application**: Shadowly (AI-powered English learning application)  
**Date**: October 2026  
**Auditor**: Antigravity Senior Engineering Team  

---

## 1. Existing Architecture Overview

Shadowly is built on Next.js 16 App Router with JavaScript/JSX, Tailwind CSS, Lucide React, PostgreSQL with Prisma ORM, and local Ollama inference. The system includes:
- **Phases 1–5**: Browser voice shadowing, deterministic scoring (Levenshtein alignment & WER), Ollama feedback, dictation, vocabulary spaced repetition, and grammar.
- **Phase 6**: User authentication (HMAC-SHA256 session tokens in HttpOnly cookies), Prisma schema (`User`, `UserPreference`, `LearningActivity`, `VocabularyProgress`, `SavedVocabulary`, `GrammarProgress`, `ConversationSession`, `ConversationMessage`, `DailyPlan`, `LearningGoal`, `UserAchievement`), and multi-device data sync.
- **Phase 7**: Learning analytics, deterministic weakness detection, and adaptive daily plans.
- **Phase 8**: Learning goals, milestones, streaks, and achievement awards.
- **Phase 9**: AI Learning Coach, Smart Practice generation, deterministic answer evaluation, signed HMAC exercise tokens, and continuous learning loop.

---

## 2. Security Controls & Audit Findings

### Finding 1: Exercise Token Secret & Timing Comparison (High Severity)
- **File**: `src/lib/learning/practiceEvaluator.js:15`
- **Issue**: `getExerciseSecret()` fell back to hardcoded string `"shadowly-exercise-hmac-secret-key-32-chars-minimum"` even in production if `process.env.AUTH_SECRET` was unset.
- **Issue 2**: `crypto.timingSafeEqual(Buffer.from(clientSig), Buffer.from(expectedSig))` at line 82 did not perform a buffer length equality check prior to invocation. In Node.js, `crypto.timingSafeEqual` throws an unhandled `RangeError` if input buffers have differing lengths, leading to potential 500 errors on invalid client signatures.
- **Fix**: Reuse `getAuthSecret()` from `session.js` (which enforces $\ge 32$ chars and throws in production if missing). Add buffer length pre-check before calling `timingSafeEqual`.

### Finding 2: Exercise Token User Binding & Replay Protection (High Severity)
- **File**: `src/lib/learning/practiceEvaluator.js` & `src/app/api/learning/practice/submit/route.js`
- **Issue**: Exercise tokens generated via `createSignedExerciseToken` did not bind `userId` or a unique token identifier (`tokenId`). Consequently:
  1. A token generated for User A could theoretically be submitted by User B.
  2. Submitting without a `sessionId` in the body caused `sessionId || sess_${Date.now()}` to generate a fresh ID, bypassing the duplicate submission check.
  3. A read-then-write check (`existingActivities.some(...)`) allows concurrent race conditions where two simultaneous submissions can double-record activities.
- **Fix**:
  1. Bind `userId` and a cryptographically generated `tokenId` inside the signed exercise token.
  2. Verify that the submitting user matches the token's bound `userId`.
  3. Introduce atomic replay protection so that concurrent or repeated submissions with the same token/session return the initial evaluation result without duplicating activities or side-effects.

### Finding 3: Production Database Fallback Risk (Medium Severity)
- **File**: `src/lib/db/prisma.js` & `src/lib/db/userRepository.js`
- **Issue**: When `isDatabaseConfigured()` is false, the application silently routes queries to `memoryStore`. In a production environment (`NODE_ENV === "production"`), running on `memoryStore` causes silent data loss on process recycling or across multiple container instances.
- **Fix**: Add explicit production database validation. In production, warn loudly or fail readiness health checks when `DATABASE_URL` is missing. Provide explicit health checks (`/api/health`) that report PostgreSQL readiness.

### Finding 4: Rate Limiting Scope (Medium Severity)
- **File**: `src/lib/auth/rateLimiter.js`
- **Issue**: Rate limiting was only attached to `/api/auth/login` and `/api/auth/register`. Expensive AI endpoints (`/api/conversation`, `/api/feedback`, `/api/learning/coach/explain`, `/api/learning/practice/generate`) and mutation endpoints (`/api/learning/practice/submit`) had no rate limiting, leaving the server vulnerable to resource exhaustion.
- **Fix**: Apply sliding-window rate limiting to AI and practice endpoints (e.g., 15–20 req/min).

### Finding 5: CSRF & Origin Validation on State-Changing Endpoints (Medium Severity)
- **File**: API mutation routes
- **Issue**: Endpoints rely solely on `SameSite=Lax` cookies. While `SameSite=Lax` provides baseline protection, defense-in-depth requires verifying the `Origin` or `Referer` header against the expected host for state-changing POST/PUT/DELETE requests.
- **Fix**: Create a lightweight CSRF origin-validation helper `verifySameOrigin(request)` for authenticated mutation endpoints.

### Finding 6: Missing HTTP Security Headers (Low Severity)
- **File**: `next.config.mjs`
- **Issue**: Missing standard HTTP headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
- **Fix**: Configure security headers in `next.config.mjs`.

### Finding 7: Health Check & Liveness Verification (Low Severity)
- **File**: `src/app/api/health/route.js`
- **Issue**: No standardized health endpoint exists for orchestrators (Docker, Kubernetes, load balancers).
- **Fix**: Create `/api/health` providing separate liveness (`status: "ok"`) and readiness checks (database ping, Ollama reachability).

---

## 3. Prioritized Action Plan

1. **Exercise Token & Evaluator Hardening**:
   - Bind `userId` and `tokenId` into signed exercise tokens.
   - Enforce buffer length check before `crypto.timingSafeEqual`.
   - Use `getAuthSecret()` for token signing.
   - Enforce atomic token replay protection and prevent duplicate activity creation.
2. **API Security & CSRF Protection**:
   - Implement `verifySameOrigin` utility.
   - Add rate limiting to AI and practice endpoints.
   - Validate input bounds and payload structures.
3. **Database Readiness**:
   - Update Prisma health check and add `/api/health` route.
   - Ensure explicit logging in production when database is unconfigured.
4. **Configuration & Headers**:
   - Update `next.config.mjs` with security headers.
   - Verify `.env.example`.
   - Create `DEPLOYMENT.md`.
5. **Automated Testing**:
   - Create `tests/production_hardening.test.js` to verify all security fixes, replay protection, and health endpoints.
   - Run full regression suite (`npm test`), `npm run lint`, and `npm run build`.
