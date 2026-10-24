import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "shadowly_session";
export const SESSION_EXPIRY_DAYS = 7;
export const SESSION_EXPIRY_MS = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.trim().length >= 32) {
    return secret;
  }
  // Safe development fallback with consistent entropy
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET environment variable must be set with at least 32 characters in production.");
  }
  return "shadowly-default-dev-auth-secret-minimum-32-chars-key";
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

function signHmac(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

/**
 * Creates a cryptographically signed session token.
 * 
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.email
 * @param {string} [payload.displayName]
 * @returns {string}
 */
export function createSessionToken(payload) {
  const secret = getAuthSecret();
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + SESSION_EXPIRY_DAYS * 24 * 60 * 60;
  const jti = crypto.randomBytes(16).toString("hex");

  const fullPayload = {
    ...payload,
    iat,
    exp,
    jti,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = signHmac(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a signed session token.
 * 
 * @param {string} token
 * @returns {Object|null} Payload if valid and not expired, null otherwise
 */
export function verifySessionToken(token) {
  if (typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const secret = getAuthSecret();

  // Verify HMAC signature in constant time
  const expectedSignature = signHmac(`${encodedHeader}.${encodedPayload}`, secret);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    // Check expiration
    if (typeof payload.exp !== "number" || payload.exp < now) {
      return null;
    }

    if (!payload.userId || !payload.email) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the authenticated user from a Next.js Request.
 * Inspects both HttpOnly cookies and optional Authorization header.
 * 
 * @param {Request} request
 * @returns {Object|null}
 */
export function getAuthUserFromRequest(request) {
  if (!request) return null;

  // 1. Try Cookie header
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = parseCookies(cookieHeader);
  const cookieToken = cookies[SESSION_COOKIE_NAME];

  if (cookieToken) {
    const user = verifySessionToken(cookieToken);
    if (user) return user;
  }

  // 2. Try Authorization Bearer header
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7).trim();
    return verifySessionToken(bearerToken);
  }

  return null;
}

/**
 * Cookie parsing utility
 */
function parseCookies(cookieHeader) {
  const result = {};
  if (!cookieHeader) return result;

  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [name, ...values] = pair.trim().split("=");
    if (name) {
      result[name] = decodeURIComponent(values.join("="));
    }
  }
  return result;
}

/**
 * Builds standard Set-Cookie string for session creation
 * @param {string} token
 * @returns {string}
 */
export function buildSessionCookie(token) {
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = SESSION_EXPIRY_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${
    isProd ? "; Secure" : ""
  }`;
}

/**
 * Builds standard Set-Cookie string for session termination
 * @returns {string}
 */
export function buildClearSessionCookie() {
  const isProd = process.env.NODE_ENV === "production";
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
    isProd ? "; Secure" : ""
  }`;
}
