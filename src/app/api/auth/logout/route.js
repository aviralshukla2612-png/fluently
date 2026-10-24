import { NextResponse } from "next/server";
import { buildClearSessionCookie } from "@/lib/auth/session.js";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", buildClearSessionCookie());
  return response;
}
