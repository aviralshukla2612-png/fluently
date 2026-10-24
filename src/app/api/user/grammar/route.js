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

  const progress = await userRepository.getGrammarProgress(session.userId);
  return NextResponse.json({ success: true, progress });
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

  const { lessonId, score, status } = body;
  if (!lessonId || typeof lessonId !== "string") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_LESSON", message: "lessonId is required." } },
      { status: 400 }
    );
  }

  const updated = await userRepository.updateGrammarProgress(session.userId, {
    lessonId,
    score: typeof score === "number" ? score : null,
    status: status || "completed",
  });

  return NextResponse.json({ success: true, progress: updated });
}
