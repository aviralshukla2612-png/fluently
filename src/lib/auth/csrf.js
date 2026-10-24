/**
 * Shadowly — CSRF & Origin Verification
 * Hardens authenticated mutating requests (POST, PUT, DELETE, PATCH)
 * against Cross-Site Request Forgery.
 */

/**
 * Validates that an incoming mutating request comes from the same origin.
 * Inspects `origin` and `referer` headers against `host` / `x-forwarded-host`.
 * 
 * @param {Request} request
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function verifySameOrigin(request) {
  if (!request) return { allowed: true };

  const method = request.method ? request.method.toUpperCase() : "GET";
  // Safe idempotent read methods do not require CSRF origin validation
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { allowed: true };
  }

  // If request is authenticated via Bearer token (API client), origin check is optional
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return { allowed: true };
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host") || request.headers.get("x-forwarded-host");

  if (!origin && !referer) {
    // Top-level or programmatic same-origin requests without headers (e.g. node scripts, direct curl)
    // Allowed in non-browser context if session cookie is present and SameSite=Lax handles it
    return { allowed: true };
  }

  try {
    if (origin) {
      const originUrl = new URL(origin);
      if (host && originUrl.host !== host) {
        return {
          allowed: false,
          reason: `Origin mismatch: expected host '${host}', received origin '${originUrl.host}'`,
        };
      }
      return { allowed: true };
    }

    if (referer) {
      const refererUrl = new URL(referer);
      if (host && refererUrl.host !== host) {
        return {
          allowed: false,
          reason: `Referer mismatch: expected host '${host}', received referer '${refererUrl.host}'`,
        };
      }
      return { allowed: true };
    }
  } catch {
    return {
      allowed: false,
      reason: "Malformed Origin or Referer header.",
    };
  }

  return { allowed: true };
}
