import { NextResponse } from "next/server";
import { generateConversationSummary } from "@/lib/ai/ollamaClient.js";
import { CONVERSATION_SCENARIOS } from "@/data/conversation/scenarios.js";
import { getLanguageConfig } from "@/lib/languages.js";

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_JSON",
            message: "Malformed JSON request body.",
          },
        },
        { status: 400 }
      );
    }

    const { messages, scenarioId = "free", level = "intermediate", language = "en" } = body || {};
    const langConfig = getLanguageConfig(language);

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMPTY_MESSAGES",
            message: "At least one message exchange is required to generate a summary.",
          },
        },
        { status: 400 }
      );
    }

    const scenario =
      CONVERSATION_SCENARIOS.find((s) => s.id === scenarioId) ||
      CONVERSATION_SCENARIOS[0];

    const result = await generateConversationSummary({
      messages,
      scenario,
      level,
      language: langConfig.id,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        summary: result.summary,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: err.message || "Failed to generate session summary.",
        },
      },
      { status: 500 }
    );
  }
}
