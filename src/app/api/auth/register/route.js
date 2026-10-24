import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password.js";
import { createSessionToken, buildSessionCookie } from "@/lib/auth/session.js";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimiter.js";
import { userRepository } from "@/lib/db/userRepository.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000); // 5 per 15 min

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Too many registration attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
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

    const { email, password, displayName } = body;

    // Validate email
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_EMAIL", message: "Please provide a valid email address." },
        },
        { status: 400 }
      );
    }

    // Validate password (min 8 chars)
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "WEAK_PASSWORD",
            message: "Password must be at least 8 characters long.",
          },
        },
        { status: 400 }
      );
    }

    // Validate displayName
    const safeDisplayName =
      typeof displayName === "string" && displayName.trim().length > 0
        ? displayName.trim().slice(0, 50)
        : email.split("@")[0].slice(0, 50);

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await userRepository.findUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message: "An account with this email address already exists. Please log in.",
          },
        },
        { status: 409 }
      );
    }

    // Hash password & create user
    const passwordHash = await hashPassword(password);
    const user = await userRepository.createUser({
      email: normalizedEmail,
      passwordHash,
      displayName: safeDisplayName,
    });

    // Create session token
    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      },
      { status: 201 }
    );

    response.headers.set("Set-Cookie", buildSessionCookie(token));
    return response;
  } catch (err) {
    console.error("[register] Internal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to create account. Please try again." },
      },
      { status: 500 }
    );
  }
}
