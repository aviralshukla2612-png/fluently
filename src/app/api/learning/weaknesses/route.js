export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";
import { detectWeaknesses } from "@/lib/learning/weaknessDetector.js";

/**
 * GET /api/learning/weaknesses
 * Returns detected learner weaknesses prioritized by severity, repetition, and evidence.
 */
export async function GET(request) {
  try {
    const session = getAuthUserFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
        { status: 401 }
      );
    }

    const { items = [] } = await userRepository.getLearningActivities(session.userId, {
      limit: 1000,
    });

    const normalized = items.map((act) => ({
      ...act,
      timestamp: act.createdAt ? new Date(act.createdAt).toISOString() : act.timestamp,
    }));

    const weaknesses = detectWeaknesses(normalized);

    return NextResponse.json({
      success: true,
      weaknesses,
    });
  } catch (err) {
    console.error("[api/learning/weaknesses] Error detecting weaknesses:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to detect weaknesses." },
      },
      { status: 500 }
    );
  }
}
