/**
 * Shadowly — In-Memory Rate Limiter
 * Provides sliding-window rate limiting for authentication endpoints.
 */

const rateLimitBuckets = new Map();

/**
 * Checks and records an attempt under a specific action key.
 * 
 * @param {string} key - Unique rate-limiting identifier (e.g. `login:127.0.0.1`)
 * @param {number} maxAttempts - Maximum allowed requests within window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remaining: number, retryAfterSeconds: number }}
 */
export function checkRateLimit(key, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = rateLimitBuckets.get(key) || [];

  // Filter timestamps within current window
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= maxAttempts) {
    const oldestTimestamp = timestamps[0];
    const retryAfterMs = oldestTimestamp + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  timestamps.push(now);
  rateLimitBuckets.set(key, timestamps);

  // Periodically cleanup very old buckets
  if (rateLimitBuckets.size > 1000) {
    cleanupBuckets(windowMs);
  }

  return {
    allowed: true,
    remaining: maxAttempts - timestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Resets/clears a rate limit key (e.g. after a successful login)
 * @param {string} key
 */
export function resetRateLimit(key) {
  rateLimitBuckets.delete(key);
}

function cleanupBuckets(windowMs) {
  const cutoff = Date.now() - windowMs;
  for (const [key, timestamps] of rateLimitBuckets.entries()) {
    const fresh = timestamps.filter((t) => t > cutoff);
    if (fresh.length === 0) {
      rateLimitBuckets.delete(key);
    } else {
      rateLimitBuckets.set(key, fresh);
    }
  }
}

/**
 * Helper to extract client IP from Next.js Request headers
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  if (!request) return "127.0.0.1";
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
