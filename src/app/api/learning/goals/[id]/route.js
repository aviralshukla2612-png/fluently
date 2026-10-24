export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";

/**
 * PATCH /api/learning/goals/[id]
 * Updates a goal (e.g. pause, resume, edit target)
 */
export async function PATCH(request, { params }) {
  try {
    const session = getAuthUserFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Goal ID is required." } },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const updated = await userRepository.updateLearningGoal(session.userId, id, body);

    return NextResponse.json({
      success: true,
      goal: updated,
    });
  } catch (err) {
    console.error("[api/learning/goals/[id]] Error updating goal:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "UPDATE_FAILED", message: err.message || "Failed to update goal." },
      },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/learning/goals/[id]
 * Deletes a learning goal
 */
export async function DELETE(request, { params }) {
  try {
    const session = getAuthUserFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Goal ID is required." } },
        { status: 400 }
      );
    }

    await userRepository.deleteLearningGoal(session.userId, id);

    return NextResponse.json({
      success: true,
      message: "Goal deleted successfully.",
    });
  } catch (err) {
    console.error("[api/learning/goals/[id]] Error deleting goal:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "DELETE_FAILED", message: err.message || "Failed to delete goal." },
      },
      { status: 400 }
    );
  }
}
