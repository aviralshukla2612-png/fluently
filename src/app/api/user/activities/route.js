export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";
import { VALID_MODULES } from "@/lib/learning/progressService.js";

export async function GET(request) {
  const session = getAuthUserFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const moduleParam = searchParams.get("module") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const result = await userRepository.getLearningActivities(session.userId, {
    module: moduleParam,
    page,
    limit,
  });

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
      { success: false, error: { code: "INVALID_BODY", message: "Expected activity JSON." } },
      { status: 400 }
    );
  }

  const { module: moduleName, exerciseId, score, difficulty, duration, metadata, status } = body;

  if (!moduleName || !VALID_MODULES.includes(moduleName)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_MODULE",
          message: `Module must be one of: ${VALID_MODULES.join(", ")}`,
        },
      },
      { status: 400 }
    );
  }

  if (!exerciseId || typeof exerciseId !== "string") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_EXERCISE", message: "exerciseId is required." } },
      { status: 400 }
    );
  }

  const activity = await userRepository.recordLearningActivity(session.userId, {
    module: moduleName,
    exerciseId,
    score: typeof score === "number" ? score : null,
    difficulty: difficulty || "intermediate",
    duration: typeof duration === "number" ? duration : null,
    metadata: metadata || {},
    status: status || "completed",
  });

  return NextResponse.json({ success: true, activity }, { status: 201 });
}
