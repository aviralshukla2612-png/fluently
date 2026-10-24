export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest, buildClearSessionCookie } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";

export async function DELETE(request) {
  const session = getAuthUserFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  if (body.confirm !== true) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "CONFIRMATION_REQUIRED", message: "Explicit confirmation { confirm: true } is required to delete your account." },
      },
      { status: 400 }
    );
  }

  await userRepository.deleteUserAccount(session.userId);

  const response = NextResponse.json({
    success: true,
    message: "Your account and all associated learning data have been permanently deleted.",
  });
  response.headers.set("Set-Cookie", buildClearSessionCookie());
  return response;
}
