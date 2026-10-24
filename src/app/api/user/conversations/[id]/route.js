export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session.js";
import { userRepository } from "@/lib/db/userRepository.js";

export async function GET(request, { params }) {
  const auth = getAuthUserFromRequest(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const session = await userRepository.getConversationSessionById(auth.userId, id);

  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Conversation session not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, session });
}

export async function POST(request, { params }) {
  const auth = getAuthUserFromRequest(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body || !body.role || !body.content) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_BODY", message: "Role and content are required." } },
      { status: 400 }
    );
  }

  try {
    const message = await userRepository.addConversationMessage(auth.userId, id, {
      role: body.role,
      content: body.content,
      corrections: body.corrections || null,
      usefulPhrase: body.usefulPhrase || null,
      followUpQuestion: body.followUpQuestion || null,
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: err.message } },
      { status: 404 }
    );
  }
}

export async function PATCH(request, { params }) {
  const auth = getAuthUserFromRequest(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_BODY", message: "Expected JSON object." } },
      { status: 400 }
    );
  }

  try {
    const updated = await userRepository.updateConversationSession(auth.userId, id, body);
    return NextResponse.json({ success: true, session: updated });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: err.message } },
      { status: 404 }
    );
  }
}

export async function DELETE(request, { params }) {
  const auth = getAuthUserFromRequest(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  try {
    await userRepository.deleteConversationSession(auth.userId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: err.message } },
      { status: 404 }
    );
  }
}
