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

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  const result = await userRepository.getConversationSessions(session.userId, { page, limit });
  return NextResponse.json({ success: true, ...result });
}

export async function POST(request) {
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

  const newSession = await userRepository.createConversationSession(session.userId, {
    scenarioId: body.scenarioId || "free",
    level: body.level || "intermediate",
    correctionMode: body.correctionMode || "gentle",
  });

  return NextResponse.json({ success: true, session: newSession }, { status: 201 });
}
