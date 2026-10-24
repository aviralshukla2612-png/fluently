export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";

export async function GET(request) {
  try {
    const session = getAuthUserFromRequest(request);

    if (!session) {
      return NextResponse.json({
        success: true,
        user: null,
        preferences: null,
      });
    }

    const [user, preferences] = await Promise.all([
      userRepository.findUserById(session.userId),
      userRepository.getUserPreferences(session.userId),
    ]);

    if (!user) {
      return NextResponse.json({
        success: true,
        user: null,
        preferences: null,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      preferences,
    });
  } catch (err) {
    console.error("[me] Error fetching session user:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to retrieve session." },
      },
      { status: 500 }
    );
  }
}
