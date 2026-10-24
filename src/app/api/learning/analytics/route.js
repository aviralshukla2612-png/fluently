export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";
import { computeLearningAnalytics } from "@/lib/learning/learningAnalytics.js";

/**
 * GET /api/learning/analytics
 * Returns calculated skill mastery metrics, historical trends, and duration totals.
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

    // Normalize timestamp field (DB uses createdAt, client uses timestamp)
    const normalized = items.map((act) => ({
      ...act,
      timestamp: act.createdAt ? new Date(act.createdAt).toISOString() : act.timestamp,
    }));

    const analytics = computeLearningAnalytics(normalized);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (err) {
    console.error("[api/learning/analytics] Error computing analytics:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to compute learning analytics." },
      },
      { status: 500 }
    );
  }
}
