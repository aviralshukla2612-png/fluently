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
  const planDate = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  const plan = await userRepository.getDailyPlan(session.userId, planDate);
  return NextResponse.json({ success: true, plan });
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
  if (!body || !body.planDate) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_BODY", message: "planDate is required." } },
      { status: 400 }
    );
  }

  const plan = await userRepository.upsertDailyPlan(session.userId, {
    planDate: body.planDate,
    planVersion: body.planVersion || "1.0.0",
    tasks: body.tasks || [],
    completedState: body.completedState || {},
  });

  return NextResponse.json({ success: true, plan });
}
