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

  const [savedWords, progress] = await Promise.all([
    userRepository.getSavedVocabulary(session.userId),
    userRepository.getVocabularyProgress(session.userId),
  ]);

  return NextResponse.json({ success: true, savedWords, progress });
}

export async function POST(request) {
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
      { success: false, error: { code: "INVALID_BODY", message: "Expected JSON object." } },
      { status: 400 }
    );
  }

  const { action, wordId, reviewRecord } = body;

  if (action === "toggleSaved") {
    if (!wordId || typeof wordId !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_WORD_ID", message: "wordId is required." } },
        { status: 400 }
      );
    }

    const result = await userRepository.toggleSavedWord(session.userId, wordId);
    return NextResponse.json({ success: true, ...result });
  }

  if (action === "updateProgress") {
    if (!reviewRecord || !reviewRecord.wordId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PROGRESS", message: "reviewRecord with wordId is required." } },
        { status: 400 }
      );
    }

    const updated = await userRepository.updateVocabularyProgress(session.userId, reviewRecord);
    return NextResponse.json({ success: true, progress: updated });
  }

  return NextResponse.json(
    { success: false, error: { code: "UNKNOWN_ACTION", message: "Action must be 'toggleSaved' or 'updateProgress'." } },
    { status: 400 }
  );
}
