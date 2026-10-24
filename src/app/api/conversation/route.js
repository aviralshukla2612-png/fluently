import { NextResponse } from "next/server";
import { generateConversationReply } from "@/lib/ai/ollamaClient.js";
import {
  getMultilingualContextualReply,
  detectEducationalIntent,
} from "@/lib/ai/validateConversation.js";
import { CONVERSATION_SCENARIOS } from "@/data/conversation/scenarios.js";
import { getLanguageConfig } from "@/lib/languages.js";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimiter.js";

const MAX_TURNS = 20;
const MAX_MESSAGE_LENGTH = 1000;

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`conv:${ip}`, 20, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Too many conversation requests. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
          },
        },
        { status: 429 }
      );
    }

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

    const {
      messages,
      scenarioId = "free",
      level = "intermediate",
      correctionMode = "natural",
      language = "en",
    } = body || {};

    const langConfig = getLanguageConfig(language);

    // 1. Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMPTY_MESSAGES",
            message: "A non-empty array of messages is required.",
          },
        },
        { status: 400 }
      );
    }

    if (messages.length > MAX_TURNS) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_TURNS",
            message: `Request exceeds maximum allowed history of ${MAX_TURNS} turns.`,
          },
        },
        { status: 400 }
      );
    }

    // 2. Validate roles and content
    for (const msg of messages) {
      if (!msg || typeof msg !== "object") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_MESSAGE_OBJECT",
              message: "Every message must be a valid object.",
            },
          },
          { status: 400 }
        );
      }

      if (msg.role !== "user" && msg.role !== "assistant") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "UNSUPPORTED_ROLE",
              message: `Unsupported message role '${msg.role}'. Only 'user' and 'assistant' are allowed.`,
            },
          },
          { status: 400 }
        );
      }

      if (typeof msg.content !== "string" || !msg.content.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "EMPTY_CONTENT",
              message: "Message content cannot be empty.",
            },
          },
          { status: 400 }
        );
      }

      if (msg.content.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MESSAGE_TOO_LONG",
              message: `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Ensure the last message is from user
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LAST_MESSAGE_NOT_USER",
            message: "The final message in the conversation must be from the user.",
          },
        },
        { status: 400 }
      );
    }

    // 3. Resolve scenario context
    const scenario =
      CONVERSATION_SCENARIOS.find((s) => s.id === scenarioId) ||
      CONVERSATION_SCENARIOS[0];

    // 3.5 Fast-path: Check for explicit educational/instructional/vocabulary queries
    // When learners ask "how should i say hi in gujrati", "how to say thank you", "teach me gujarati basics",
    // they require immediate, authentic pedagogical instruction rather than waiting 7-10s for local CPU inference.
    const lastUserMessage = lastMessage?.content || "";
    const educationalReply = detectEducationalIntent(lastUserMessage, langConfig.id);
    if (educationalReply) {
      return NextResponse.json(
        {
          success: true,
          response: educationalReply,
          isEducationalIntent: true,
        },
        { status: 200 }
      );
    }

    // 4. Generate AI reply with responsive timeout
    // Non-English low-resource scripts (like Gujarati/Hindi) take 60-90s on CPU if unconstrained.
    // We give Ollama 7s to respond; if CPU is busy or slow, we serve an immediate authentic native response.
    const conversationalTimeoutMs = langConfig.id === "en" ? 12000 : 7000;
    const result = await generateConversationReply(
      {
        messages,
        scenario,
        level,
        correctionMode,
        language: langConfig.id,
      },
      { timeoutMs: conversationalTimeoutMs }
    );

    if (!result.success) {
      // In interactive conversation mode, if the local AI model is slow on CPU, timed out, or offline,
      // gracefully serve an authentic, high-quality conversational response in the target language.
      if (
        ["TIMEOUT", "OLLAMA_UNREACHABLE", "MODEL_NOT_FOUND", "EMPTY_RESPONSE", "INVALID_RESPONSE_SCHEMA"].includes(
          result.error?.code
        )
      ) {
        const lastUserMessage = messages[messages.length - 1]?.content || "";
        const fallbackReply = getMultilingualContextualReply({
          scenarioId: scenario.id,
          language: langConfig.id,
          level,
          userMessage: lastUserMessage,
        });

        return NextResponse.json(
          {
            success: true,
            response: fallbackReply,
            isFallback: true,
          },
          { status: 200 }
        );
      }

      const statusMap = {
        MODEL_NOT_FOUND: 503,
        OLLAMA_UNREACHABLE: 503,
        TIMEOUT: 504,
        INVALID_RESPONSE_SCHEMA: 502,
        EMPTY_RESPONSE: 502,
        EMPTY_HISTORY: 400,
      };

      const statusCode = statusMap[result.error?.code] || 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: true,
        response: result.response,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: err.message || "An unexpected error occurred while processing conversation.",
        },
      },
      { status: 500 }
    );
  }
}
