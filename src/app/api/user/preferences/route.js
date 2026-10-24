export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";

export async function GET(request) {
  const session = getAuthUserFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
      { status: 401 }
    );
  }

  const preferences = await userRepository.getUserPreferences(session.userId);
  return NextResponse.json({ success: true, preferences });
}

export async function PUT(request) {
  const session = getAuthUserFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_BODY", message: "Expected JSON object." } },
      { status: 400 }
    );
  }

  const updated = await userRepository.updateUserPreferences(session.userId, body);
  return NextResponse.json({ success: true, preferences: updated });
}
