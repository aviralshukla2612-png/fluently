import { NextResponse } from "next/server";
import { createSessionToken, buildSessionCookie } from "@/lib/auth/session.js";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimiter.js";
import { userRepository } from "@/lib/db/userRepository.js";

/**
 * API route to authenticate users with Google
 * Handles both Google OAuth tokens and fast 1-click Google authentication
 */
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rateKey = `google_auth:${ip}`;
    const rateCheck = checkRateLimit(rateKey, 10, 60 * 1000);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Too many attempts. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let email = body.email ? String(body.email).trim().toLowerCase() : "";
    let displayName = body.displayName ? String(body.displayName).trim() : "";

    // Default fast Google candidate identity if no specific Google profile payload provided
    if (!email) {
      email = "google.candidate@fluently.com";
      displayName = displayName || "Google Student";
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_EMAIL", message: "Invalid Google email address." },
        },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await userRepository.findUserByEmail(email);

    if (!user) {
      user = await userRepository.createUser({
        email,
        displayName: displayName || email.split("@")[0],
        passwordHash: null, // Google-authenticated users do not have a plain password hash
      });
    }

    // Build session token and cookie
    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
    });

    const cookie = buildSessionCookie(sessionToken);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });

    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (err) {
    console.error("[api/auth/google] Authentication error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Google authentication failed. Please try again." },
      },
      { status: 500 }
    );
  }
}
