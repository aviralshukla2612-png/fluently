import { NextResponse } from "next/server";
import { verifyPassword, hashPassword } from "@/lib/auth/password.js";
import { createSessionToken, buildSessionCookie } from "@/lib/auth/session.js";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/auth/rateLimiter.js";
import { userRepository } from "@/lib/db/userRepository.js";

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rateKey = `login:${ip}`;
    const rateCheck = checkRateLimit(rateKey, 5, 60 * 1000); // 5 per 60s

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Too many login attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "Request body must be a valid JSON object." },
        },
        { status: 400 }
      );
    }

    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
        },
        { status: 401 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = await userRepository.findUserByEmail(normalizedEmail);

    // Auto-provision test account for developer convenience if not already created
    if (
      !user &&
      (normalizedEmail === "test@fluently.com" || normalizedEmail === "test@shadowly.com") &&
      password === "password123"
    ) {
      try {
        const passwordHash = await hashPassword("password123");
        user = await userRepository.createUser({
          email: normalizedEmail,
          passwordHash,
          displayName: "Test Candidate",
        });
      } catch (provisionErr) {
        console.warn("[login] Auto-provisioning test user failed:", provisionErr.message);
      }
    }

    if (!user || !user.passwordHash) {
      // Do not leak whether the email exists
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
        },
        { status: 401 }
      );
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
        },
        { status: 401 }
      );
    }

    // Reset rate limiter on successful authentication
    resetRateLimit(rateKey);

    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });

    response.headers.set("Set-Cookie", buildSessionCookie(token));
    return response;
  } catch (err) {
    console.error("[login] Internal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Login failed. Please try again." },
      },
      { status: 500 }
    );
  }
}
