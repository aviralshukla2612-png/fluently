export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";

export async function POST(request) {
  try {
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
        { success: false, error: { code: "INVALID_BODY", message: "Expected JSON object containing local learning state." } },
        { status: 400 }
      );
    }

    const result = await userRepository.importLegacyLocalData(session.userId, {
      activities: Array.isArray(body.activities) ? body.activities : [],
      savedWords: Array.isArray(body.savedWords) ? body.savedWords : [],
      vocabularyReviews: Array.isArray(body.vocabularyReviews) ? body.vocabularyReviews : [],
      grammarCompletions: Array.isArray(body.grammarCompletions) ? body.grammarCompletions : [],
    });

    return NextResponse.json({
      success: true,
      imported: result,
      message: "Local device learning progress successfully merged into your cloud account.",
    });
  } catch (err) {
    console.error("[sync] Sync failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SYNC_ERROR", message: "Failed to synchronize learning progress." },
      },
      { status: 500 }
    );
  }
}
