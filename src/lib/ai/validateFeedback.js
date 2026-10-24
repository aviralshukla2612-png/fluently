import { PROMPT_VERSION } from "./prompts.js";

/**
 * Strips potential HTML tags from text to ensure safe rendering in UI.
 */
function sanitizeText(str) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").trim();
}

/**
 * Truncates string to a maximum length safely.
 */
function truncateString(str, maxLength) {
  const clean = sanitizeText(str);
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength - 3) + "...";
}

/**
 * Robust JSON extraction from raw model response strings.
 * Handles markdown code fences (```json ... ```) or accidental preceding/trailing text.
 * 
 * @param {string} raw
 * @returns {Object|null}
 */
export function extractJSONFromModelResponse(raw) {
  if (!raw || typeof raw !== "string") return null;

  let text = raw.trim();

  // 1. Remove markdown code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }

  // 2. Try direct JSON parse
  try {
    return JSON.parse(text);
  } catch {
    // 3. Fallback: find the first outer { and last }
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Validates and sanitizes structured feedback returned by the AI model.
 * 
 * @param {any} rawInput - Parsed JSON object from model
 * @param {string} referenceText - The expected reference sentence
 * @param {string} [modelName="llama3.2:1b"] - Model identifier for audit
 * @returns {{ isValid: boolean, data: Object|null, error: string|null }}
 */
export function validateFeedback(rawInput, referenceText = "", modelName = "llama3.2:1b") {
  if (!rawInput || typeof rawInput !== "object" || Array.isArray(rawInput)) {
    return {
      isValid: false,
      data: null,
      error: "Model output is not a valid JSON object.",
    };
  }

  // 1. Validate & sanitize overallFeedback
  if (!rawInput.overallFeedback || typeof rawInput.overallFeedback !== "string") {
    return {
      isValid: false,
      data: null,
      error: "Missing required 'overallFeedback' string in model response.",
    };
  }
  const overallFeedback = truncateString(rawInput.overallFeedback, 400);

  // 2. Validate & sanitize mistakeExplanations (optional array)
  const rawMistakes = Array.isArray(rawInput.mistakeExplanations)
    ? rawInput.mistakeExplanations
    : [];

  const mistakeExplanations = rawMistakes.slice(0, 5).map((m) => ({
    word: truncateString(m?.word || "", 50),
    type: ["missing", "substitution", "extra"].includes(m?.type) ? m.type : "substitution",
    explanation: truncateString(m?.explanation || "", 250),
  })).filter((m) => m.word && m.explanation);

  // 3. Corrected sentence (fallback to referenceText if model deviates)
  const correctedSentence = referenceText || truncateString(rawInput.correctedSentence || "", 300);

  // 4. Practice tips (array of 2-4 strings)
  const rawTips = Array.isArray(rawInput.practiceTips) ? rawInput.practiceTips : [];
  const practiceTips = rawTips
    .slice(0, 4)
    .map((t) => truncateString(String(t), 200))
    .filter(Boolean);

  if (practiceTips.length === 0) {
    practiceTips.push("Listen to the reference speaker model once again to internalize the natural rhythm.");
    practiceTips.push("Shadow the sentence out loud, focusing on connected word links.");
  }

  // 5. Practice examples (up to 3 strings)
  const rawExamples = Array.isArray(rawInput.practiceExamples) ? rawInput.practiceExamples : [];
  const practiceExamples = rawExamples
    .slice(0, 3)
    .map((e) => truncateString(String(e), 150))
    .filter(Boolean);

  // 6. Grammar notes
  const grammarNotes = rawInput.grammarNotes && typeof rawInput.grammarNotes === "string"
    ? truncateString(rawInput.grammarNotes, 300)
    : null;

  // 7. Next step
  const nextStep = rawInput.nextStep && typeof rawInput.nextStep === "string"
    ? truncateString(rawInput.nextStep, 200)
    : "Try recording one more attempt to increase fluency and confidence.";

  // 8. Difficulty note
  const difficultyNote = rawInput.difficultyNote && typeof rawInput.difficultyNote === "string"
    ? truncateString(rawInput.difficultyNote, 200)
    : null;

  return {
    isValid: true,
    data: {
      overallFeedback,
      mistakeExplanations,
      correctedSentence,
      practiceTips,
      practiceExamples,
      grammarNotes,
      nextStep,
      difficultyNote,
      promptVersion: PROMPT_VERSION,
      modelUsed: modelName,
      generatedAt: new Date().toISOString(),
    },
    error: null,
  };
}
