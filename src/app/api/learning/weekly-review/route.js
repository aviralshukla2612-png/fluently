export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";
import { generateWeeklyReview } from "@/lib/learning/weeklyReview.js";

/**
 * GET /api/learning/weekly-review
 * Generates an aggregated weekly learning review for the authenticated user
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

    const { searchParams } = new URL(request.url);
    const weekOffset = parseInt(searchParams.get("weekOffset") || "0", 10);

    const { items = [] } = await userRepository.getLearningActivities(session.userId, {
      limit: 1000,
    });

    const normalized = items.map((act) => ({
      ...act,
      timestamp: act.createdAt ? new Date(act.createdAt).toISOString() : act.timestamp,
    }));

    const review = generateWeeklyReview(normalized, { weekOffset });

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (err) {
    console.error("[api/learning/weekly-review] Error generating weekly review:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to generate weekly review." },
      },
      { status: 500 }
    );
  }
}
