# Shadowly Production Deployment & Operations Guide

This guide details the procedure for provisioning, configuring, migrating, deploying, and maintaining Shadowly in a production environment.

---

## 1. Runtime Requirements

| Dependency | Minimum Version | Recommended | Notes |
|---|---|---|---|
| **Node.js** | 20.x LTS | 22.x LTS | App Router & Web Cryptography |
| **PostgreSQL** | 14.x | 16.x | Required for durable multi-device persistence |
| **Prisma CLI** | 6.x | 6.19.x | Included in `devDependencies` |
| **Ollama (Optional)** | 0.3.x | Latest | Local LLM inference (`llama3.2:1b`) |

---

## 2. Environment Configuration

Create `.env.production` (or inject through your container/PaaS secret manager):

```env
# Production Node Environment
NODE_ENV=production

# Application Port
PORT=3000

# 1. Cryptographic Authentication Secret (MANDATORY in production)
# Must be at least 32 characters with high entropy.
# Generate: openssl rand -base64 32
AUTH_SECRET=a_very_secure_random_base64_string_with_at_least_32_characters

# 2. Database Connection (MANDATORY in production)
# Connection pooler URL recommended for high concurrency (e.g. Supabase, PgBouncer, Neon)
DATABASE_URL=postgresql://shadowly_user:strong_password@db-host:5432/shadowly?schema=public&sslmode=require

# 3. AI Inference Daemon (Optional - curated fallbacks activate if unavailable)
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:1b
OLLAMA_TIMEOUT_MS=15000
```

> **Security Warning**:
> Never commit `.env` or `.env.production` to version control.
> Never expose `AUTH_SECRET` or `DATABASE_URL` with `NEXT_PUBLIC_` prefixes.

---

## 3. Database Migration Deployment

Before launching or updating application containers, apply committed Prisma database migrations:

```bash
# 1. Verify connection string is set
echo $DATABASE_URL

# 2. Deploy pending migrations safely to PostgreSQL
npx prisma migrate deploy

# 3. (Optional) Verify current migration status
npx prisma migrate status
```

> **Operational Rule**:
> NEVER run `prisma migrate dev` or `prisma migrate reset` in production, as they can cause schema drift or destructive data loss.

---

## 4. Production Build & Execution

```bash
# 1. Install dependencies (frozen lockfile)
npm ci

# 2. Compile Next.js production bundle with Turbopack
npm run build

# 3. Start production server
npm run start
```

For containerized environments (Docker):
```dockerfile
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY . .
RUN npm ci --omit=dev
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 5. Health Checks & Monitoring

The `/api/health` endpoint supports orchestrator liveness and readiness probes:

- **Liveness Probe**:
  `GET /api/health?check=liveness`
  - Returns `HTTP 200 {"status":"alive","uptime":...}`
  - Confirms the Node.js event loop is operational.
  
- **Readiness Probe**:
  `GET /api/health?check=readiness`
  - Returns `HTTP 200` if PostgreSQL connection is verified.
  - Returns `HTTP 503` if PostgreSQL is unreachable in production.

- **Full Status Overview**:
  `GET /api/health`
  - Provides detailed health status of database, memory store, and optional Ollama inference.

---

## 6. Security Headers & Defense

The application automatically enforces the following security headers via `next.config.mjs`:
- `X-Content-Type-Options: nosniff` (Prevents MIME-type sniffing)
- `X-Frame-Options: SAMEORIGIN` (Mitigates clickjacking)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(self), geolocation=()` (Authorizes browser voice shadowing while disabling unused sensors)
- `SameSite=Lax`, `HttpOnly`, `Secure` cookies for session tokens.

---

## 7. PostgreSQL Backup & Disaster Recovery

### Automated Daily Backup (pg_dump)
```bash
pg_dump -h db-host -U shadowly_user -d shadowly -F c -b -v -f /backups/shadowly_$(date +%Y%m%d_%H%M%S).dump
```

### Staging Recovery Test
```bash
# Test restore into an isolated staging database:
createdb -h staging-db -U postgres shadowly_recovery_test
pg_restore -h staging-db -U postgres -d shadowly_recovery_test -v /backups/shadowly_latest.dump
```

---

## 8. Rollback Procedure

In case of a critical failure during a release:

1. **Traffic Rollback**:
   Redirect load balancer traffic back to the previous stable release container/instance.
2. **Database Schema Strategy**:
   All Shadowly migrations are designed to be backward-compatible (non-destructive additive changes).
   If schema rollback is strictly necessary, apply an explicit forward migration with the inverse SQL changes.
3. **Application Restart**:
   Restart previous build artifacts:
   ```bash
   git checkout <PREVIOUS_RELEASE_TAG>
   npm ci
   npm run build
   npm run start
   ```

---

## 9. Post-Deployment Smoke Verification

Run following smoke checks on the deployed instance:

```bash
# 1. Check liveness
curl -f http://localhost:3000/api/health?check=liveness

# 2. Check database readiness
curl -f http://localhost:3000/api/health?check=readiness

# 3. Verify public routes return HTTP 200
curl -I http://localhost:3000/
curl -I http://localhost:3000/coach
curl -I http://localhost:3000/practice

# 4. Verify unauthenticated API protection returns HTTP 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/learning/practice/submit
# Expected: 401

---

## 10. IELTS Mock Exam System & Razorpay Setup

### 10.1 Database Migration
The IELTS Mock Exam system introduces tables for exams, sections, questions, orders, transactions, attempts, and reports. Run:
```bash
npx prisma migrate deploy
```
Migration file: `prisma/migrations/20261023_ielts_exam_system/migration.sql`

### 10.2 Razorpay Webhook Configuration
1. Go to the **Razorpay Dashboard** -> **Settings** -> **Webhooks**.
2. Add a new webhook endpoint:
   - **Webhook URL**: `https://<YOUR_DOMAIN>/api/payments/razorpay/webhook`
   - **Secret**: Set a high-entropy secret and configure it as `RAZORPAY_WEBHOOK_SECRET` in environment variables.
   - **Active Events**: Check `payment.captured` and `payment.failed`.
3. In staging/local testing, you can use the Razorpay webhook tester or CLI to forward events.
```
