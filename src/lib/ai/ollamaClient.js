import { SYSTEM_PROMPT, buildFeedbackPrompt } from "./prompts.js";
import { extractJSONFromModelResponse, validateFeedback } from "./validateFeedback.js";
import { buildConversationSystemPrompt, buildConversationSummaryPrompt } from "./conversationPrompts.js";
import { extractJSON, validateConversationResponse, validateConversationSummary } from "./validateConversation.js";

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";
export const DEFAULT_MODEL = "llama3.2:1b";
export const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Gets server-side Ollama configuration from environment variables.
 * Note: Never exposed to client-side code (no NEXT_PUBLIC_ prefix).
 */
export function getOllamaConfig() {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || DEFAULT_OLLAMA_URL,
    model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
  };
}

/**
 * Requests structured educational feedback from the Ollama chat API.
 * 
 * @param {Object} params
 * @param {string} params.referenceText
 * @param {string} params.transcriptText
 * @param {Object} params.scoringResult
 * @param {string} [params.difficulty]
 * @param {string} [params.contextNote]
 * @param {Object} [options] - Overrides for testing or custom timeouts
 * @param {Function} [options.fetchFn] - Injected fetch implementation (useful for mocks)
 * @param {string} [options.baseUrl] - Custom Ollama URL
 * @param {string} [options.model] - Custom model name
 * @param {number} [options.timeoutMs] - Custom timeout in ms
 * @returns {Promise<{ success: boolean, feedback?: Object, error?: { code: string, message: string } }>}
 */
export async function generateLearningFeedback(
  { referenceText, transcriptText, scoringResult, difficulty, contextNote },
  options = {}
) {
  const config = getOllamaConfig();
  const baseUrl = (options.baseUrl || config.baseUrl).replace(/\/+$/, "");
  const model = options.model || config.model;
  const timeoutMs = options.timeoutMs || config.timeoutMs;
  const fetchClient = options.fetchFn || globalThis.fetch;

  // Build the centralized system and user prompts
  const userContent = buildFeedbackPrompt({
    referenceText,
    transcriptText,
    scoringResult,
    difficulty,
    contextNote,
  });

  const requestBody = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    stream: false,
    options: {
      temperature: 0.3,
      num_predict: 260,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = `${baseUrl}/api/chat`;
    const response = await fetchClient(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle HTTP error codes from Ollama
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");

      if (response.status === 404 || errorText.toLowerCase().includes("not found")) {
        return {
          success: false,
          error: {
            code: "MODEL_NOT_FOUND",
            message: `The configured model '${model}' was not found on the Ollama server. Ensure it is pulled with 'ollama pull ${model}'.`,
          },
        };
      }

      return {
        success: false,
        error: {
          code: "OLLAMA_ERROR",
          message: `Ollama returned HTTP ${response.status}: ${errorText.slice(0, 150) || "Upstream error."}`,
        },
      };
    }

    const jsonResponse = await response.json();
    const rawContent = jsonResponse?.message?.content;

    if (!rawContent || typeof rawContent !== "string") {
      return {
        success: false,
        error: {
          code: "EMPTY_RESPONSE",
          message: "Ollama returned an empty response.",
        },
      };
    }

    // Defensive JSON extraction & validation
    const parsedJSON = extractJSONFromModelResponse(rawContent);
    if (!parsedJSON) {
      return {
        success: false,
        error: {
          code: "MALFORMED_JSON",
          message: "Could not parse valid JSON from the AI model's response.",
        },
      };
    }

    const validation = validateFeedback(parsedJSON, referenceText, model);
    if (!validation.isValid) {
      return {
        success: false,
        error: {
          code: "SCHEMA_VALIDATION_ERROR",
          message: validation.error || "Model output did not meet the required schema.",
        },
      };
    }

    return {
      success: true,
      feedback: validation.data,
    };
  } catch (err) {
    clearTimeout(timeoutId);

    // Timeout detection
    if (err.name === "AbortError" || controller.signal.aborted) {
      return {
        success: false,
        error: {
          code: "TIMEOUT",
          message: `Ollama request timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
        },
      };
    }

    // Unreachable / Connection Refused
    return {
      success: false,
      error: {
        code: "OLLAMA_UNREACHABLE",
        message: "Ollama AI service is currently unreachable. Please check if the Ollama server is running.",
      },
    };
  }
}

const MAX_CONVERSATION_TURNS = 12;
const MAX_MESSAGE_CHARACTERS = 500;

/**
 * Sends a multi-turn conversation history to Ollama and receives structured tutor replies.
 * 
 * @param {Object} params
 * @param {Array<{role: string, content: string}>} params.messages - Validated conversation history
 * @param {Object} [params.scenario] - Scenario object (name, tutorContext)
 * @param {string} [params.level] - 'beginner' | 'intermediate' | 'advanced'
 * @param {string} [params.correctionMode] - 'natural' | 'gentle' | 'tutor'
 * @param {Object} [options] - Overrides for testing
 * @returns {Promise<{ success: boolean, response?: Object, error?: { code: string, message: string } }>}
 */
export async function generateConversationReply(
  { messages = [], scenario = {}, level = "intermediate", correctionMode = "natural", language = "en" },
  options = {}
) {
  const config = getOllamaConfig();
  const baseUrl = (options.baseUrl || config.baseUrl).replace(/\/+$/, "");
  const model = options.model || config.model;
  const timeoutMs = options.timeoutMs || config.timeoutMs;
  const fetchClient = options.fetchFn || globalThis.fetch;

  // 1. Validate & filter messages: only allow 'user' and 'assistant' from client
  const safeHistory = [];
  if (Array.isArray(messages)) {
    for (const msg of messages) {
      if (
        msg &&
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0
      ) {
        safeHistory.push({
          role: msg.role,
          content: msg.content.trim().slice(0, MAX_MESSAGE_CHARACTERS),
        });
      }
    }
  }

  if (safeHistory.length === 0) {
    return {
      success: false,
      error: {
        code: "EMPTY_HISTORY",
        message: "Conversation history must contain at least one valid user message.",
      },
    };
  }

  // 2. Bound history to recent turns
  const boundedHistory =
    safeHistory.length > MAX_CONVERSATION_TURNS
      ? safeHistory.slice(safeHistory.length - MAX_CONVERSATION_TURNS)
      : safeHistory;

  // 3. Assemble trusted server-side system prompt
  const systemPrompt = buildConversationSystemPrompt({
    scenarioName: scenario.name || "Free Conversation",
    scenarioContext: scenario.tutorContext || "Act as a friendly, supportive conversation partner.",
    level,
    correctionMode,
    language,
  });

  const requestBody = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...boundedHistory,
    ],
    stream: false,
    options: {
      temperature: 0.3,
      num_predict: options.numPredict || 110,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = `${baseUrl}/api/chat`;
    const response = await fetchClient(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      if (response.status === 404 || errorText.toLowerCase().includes("not found")) {
        return {
          success: false,
          error: {
            code: "MODEL_NOT_FOUND",
            message: `The configured model '${model}' was not found on the Ollama server. Ensure it is pulled with 'ollama pull ${model}'.`,
          },
        };
      }

      return {
        success: false,
        error: {
          code: "OLLAMA_ERROR",
          message: `Ollama returned HTTP ${response.status}: ${errorText.slice(0, 150) || "Upstream error."}`,
        },
      };
    }

    const jsonResponse = await response.json();
    const rawContent = jsonResponse?.message?.content;

    if (!rawContent || typeof rawContent !== "string") {
      return {
        success: false,
        error: {
          code: "EMPTY_RESPONSE",
          message: "Ollama returned an empty response.",
        },
      };
    }

    const parsed = extractJSON(rawContent);
    const validation = validateConversationResponse(parsed, rawContent);

    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: "INVALID_RESPONSE_SCHEMA",
          message: validation.error || "Model response failed schema validation.",
        },
      };
    }

    return {
      success: true,
      response: validation.response,
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === "AbortError" || controller.signal.aborted) {
      return {
        success: false,
        error: {
          code: "TIMEOUT",
          message: `Ollama request timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
        },
      };
    }

    return {
      success: false,
      error: {
        code: "OLLAMA_UNREACHABLE",
        message: "Ollama AI service is currently unreachable. Please check if the Ollama server is running.",
      },
    };
  }
}

/**
 * Generates an educational summary for a completed conversation session.
 */
export async function generateConversationSummary(
  { messages = [], scenario = {}, level = "intermediate", language = "en" },
  options = {}
) {
  const config = getOllamaConfig();
  const baseUrl = (options.baseUrl || config.baseUrl).replace(/\/+$/, "");
  const model = options.model || config.model;
  const timeoutMs = options.timeoutMs || config.timeoutMs;
  const fetchClient = options.fetchFn || globalThis.fetch;

  const safeHistory = [];
  if (Array.isArray(messages)) {
    for (const msg of messages) {
      if (msg && (msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string") {
        safeHistory.push({
          role: msg.role,
          content: msg.content.trim().slice(0, MAX_MESSAGE_CHARACTERS),
        });
      }
    }
  }

  if (safeHistory.length === 0) {
    return {
      success: false,
      error: {
        code: "EMPTY_HISTORY",
        message: "At least one message exchange is required to generate a summary.",
      },
    };
  }

  const systemPrompt = buildConversationSummaryPrompt({
    scenarioName: scenario.name || "Free Conversation",
    level,
    language,
  });

  const requestBody = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...safeHistory.slice(-16), // Use last 16 turns for summary
    ],
    stream: false,
    options: {
      temperature: 0.3,
      num_predict: 250,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = `${baseUrl}/api/chat`;
    const response = await fetchClient(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: { code: "OLLAMA_ERROR", message: `Ollama returned HTTP ${response.status}` },
      };
    }

    const jsonResponse = await response.json();
    const rawContent = jsonResponse?.message?.content;
    const parsed = extractJSON(rawContent);
    const validation = validateConversationSummary(parsed);

    if (!validation.valid) {
      return {
        success: false,
        error: { code: "INVALID_SUMMARY_SCHEMA", message: validation.error },
      };
    }

    return {
      success: true,
      summary: validation.summary,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      success: false,
      error: {
        code: err.name === "AbortError" ? "TIMEOUT" : "OLLAMA_UNREACHABLE",
        message: "Could not generate session summary at this time.",
      },
    };
  }
}
