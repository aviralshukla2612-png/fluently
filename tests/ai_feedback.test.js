import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { PROMPT_VERSION, SYSTEM_PROMPT, buildFeedbackPrompt } from "../src/lib/ai/prompts.js";
import {
  extractJSONFromModelResponse,
  validateFeedback,
} from "../src/lib/ai/validateFeedback.js";
import { generateLearningFeedback } from "../src/lib/ai/ollamaClient.js";
import { scoreAttempt } from "../src/lib/scoring/scoreAttempt.js";

describe("Phase 4 AI Learning Assistant (Ollama Integration)", () => {
  // Test 1: Valid structured model response
  test("Test 1: Valid structured JSON response parses and validates successfully", () => {
    const validRaw = JSON.stringify({
      overallFeedback: "Great job keeping up with the rhythm of the sentence!",
      mistakeExplanations: [
        {
          word: "English",
          type: "substitution",
          explanation: "Ensure the 'sh' sound at the end is soft and prolonged.",
        },
      ],
      correctedSentence: "I would like to improve my English.",
      practiceTips: [
        "Focus on linking 'would' and 'like' smoothly.",
        "Practice speaking with a gentle pitch drop at the end.",
      ],
      practiceExamples: [
        "I would like to practice speaking.",
        "Could you improve this sentence?",
      ],
      grammarNotes: "'Would like' is a polite form expressing desire.",
      nextStep: "Try the sentence once more focusing on the final consonant.",
      difficultyNote: "Repeat this sentence to solidify the cadence.",
    });

    const parsed = extractJSONFromModelResponse(validRaw);
    assert(parsed !== null, "JSON should parse");

    const validation = validateFeedback(parsed, "I would like to improve my English.", "llama3.2:1b");
    assert.equal(validation.isValid, true);
    assert.equal(validation.data.overallFeedback, "Great job keeping up with the rhythm of the sentence!");
    assert.equal(validation.data.mistakeExplanations.length, 1);
    assert.equal(validation.data.mistakeExplanations[0].word, "English");
    assert.equal(validation.data.practiceTips.length, 2);
    assert.equal(validation.data.promptVersion, PROMPT_VERSION);
  });

  // Test 2: Markdown code fence stripping
  test("Test 2: Markdown code fences (```json ... ```) are stripped cleanly", () => {
    const markdownWrapped = "```json\n" + JSON.stringify({
      overallFeedback: "Solid effort with natural pace.",
      practiceTips: ["Link words naturally.", "Keep practicing."],
      practiceExamples: [],
      nextStep: "Move to the next sentence.",
    }) + "\n```";

    const parsed = extractJSONFromModelResponse(markdownWrapped);
    assert(parsed !== null, "Markdown fences should be stripped");
    assert.equal(parsed.overallFeedback, "Solid effort with natural pace.");
  });

  // Test 3: Missing or malformed JSON
  test("Test 3: Completely malformed or non-JSON text returns null gracefully", () => {
    assert.equal(extractJSONFromModelResponse("Sorry, as an AI language model..."), null);
    assert.equal(extractJSONFromModelResponse(""), null);
    assert.equal(extractJSONFromModelResponse(null), null);
    assert.equal(extractJSONFromModelResponse("{broken json: 123"), null);
  });

  // Test 4: Missing required fields rejected by validator
  test("Test 4: Missing overallFeedback is rejected with a validation error", () => {
    const invalidObj = {
      practiceTips: ["Some tip"],
    };

    const validation = validateFeedback(invalidObj, "Reference sentence");
    assert.equal(validation.isValid, false);
    assert(validation.error.includes("overallFeedback"));
  });

  // Test 5: Excessively long strings and HTML tags are sanitized and bounded
  test("Test 5: HTML tags are stripped and excessively long strings are bounded", () => {
    const hugeString = "a".repeat(1000);
    const htmlString = "<b>Great</b> attempt! <script>alert(1)</script>";

    const input = {
      overallFeedback: htmlString + " " + hugeString,
      practiceTips: ["Safe tip with <i>accent</i>"],
      nextStep: "Continue",
    };

    const validation = validateFeedback(input, "Reference");
    assert.equal(validation.isValid, true);
    assert(!validation.data.overallFeedback.includes("<script>"));
    assert(!validation.data.overallFeedback.includes("<b>"));
    assert(validation.data.overallFeedback.length <= 400);
  });

  // Test 6: Ollama unavailable (mock fetch error)
  test("Test 6: Network failure (Ollama offline) returns OLLAMA_UNREACHABLE", async () => {
    const mockFetch = async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:11434");
    };

    const scoring = scoreAttempt("I like English", "I like English");
    const result = await generateLearningFeedback(
      {
        referenceText: "I like English",
        transcriptText: "I like English",
        scoringResult: scoring,
      },
      { fetchFn: mockFetch }
    );

    assert.equal(result.success, false);
    assert.equal(result.error.code, "OLLAMA_UNREACHABLE");
    assert(result.error.message.includes("unreachable"));
  });

  // Test 7: Model timeout handling
  test("Test 7: Model request timeout aborts and returns TIMEOUT error", async () => {
    const mockSlowFetch = async (_url, { signal }) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve(new Response(JSON.stringify({ message: { content: "{}" } })));
        }, 500);

        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    };

    const scoring = scoreAttempt("Test sentence", "Test sentence");
    const result = await generateLearningFeedback(
      {
        referenceText: "Test sentence",
        transcriptText: "Test sentence",
        scoringResult: scoring,
      },
      { fetchFn: mockSlowFetch, timeoutMs: 50 }
    );

    assert.equal(result.success, false);
    assert.equal(result.error.code, "TIMEOUT");
  });

  // Test 8: Model not found (404 from Ollama)
  test("Test 8: Ollama 404 response returns MODEL_NOT_FOUND error", async () => {
    const mock404Fetch = async () => {
      return new Response(JSON.stringify({ error: "model 'llama3.2:1b' not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    };

    const scoring = scoreAttempt("Test", "Test");
    const result = await generateLearningFeedback(
      {
        referenceText: "Test",
        transcriptText: "Test",
        scoringResult: scoring,
      },
      { fetchFn: mock404Fetch }
    );

    assert.equal(result.success, false);
    assert.equal(result.error.code, "MODEL_NOT_FOUND");
    assert(result.error.message.includes("llama3.2:1b"));
  });

  // Test 9: Empty model response content
  test("Test 9: Empty model content produces EMPTY_RESPONSE", async () => {
    const mockEmptyFetch = async () => {
      return new Response(JSON.stringify({ message: { content: "" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const scoring = scoreAttempt("Test", "Test");
    const result = await generateLearningFeedback(
      {
        referenceText: "Test",
        transcriptText: "Test",
        scoringResult: scoring,
      },
      { fetchFn: mockEmptyFetch }
    );

    assert.equal(result.success, false);
    assert.equal(result.error.code, "EMPTY_RESPONSE");
  });

  // Test 10: Successful end-to-end feedback generation with valid mock
  test("Test 10: Successful feedback generation returns complete schema", async () => {
    const mockResponsePayload = {
      overallFeedback: "Excellent pronunciation! Your words were recognized clearly.",
      mistakeExplanations: [],
      correctedSentence: "I would like to improve my English.",
      practiceTips: ["Try saying it slightly faster while keeping clarity."],
      practiceExamples: ["I would like to visit tomorrow."],
      nextStep: "Move to Drill 2.",
    };

    const mockFetch = async () => {
      return new Response(
        JSON.stringify({
          message: {
            content: JSON.stringify(mockResponsePayload),
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const scoring = scoreAttempt("I would like to improve my English.", "I would like to improve my English.");
    const result = await generateLearningFeedback(
      {
        referenceText: "I would like to improve my English.",
        transcriptText: "I would like to improve my English.",
        scoringResult: scoring,
      },
      { fetchFn: mockFetch }
    );

    assert.equal(result.success, true);
    assert.equal(result.feedback.overallFeedback, mockResponsePayload.overallFeedback);
    assert.equal(result.feedback.correctedSentence, "I would like to improve my English.");
    assert.equal(result.feedback.modelUsed, "llama3.2:1b");
  });

  // Test 11: AI failure does not alter or corrupt deterministic scoring
  test("Test 11: AI service failure leaves Phase 3 deterministic score completely intact", async () => {
    const ref = "I would like to improve my English.";
    const trans = "I would like improve my English.";
    const originalScore = scoreAttempt(ref, trans);

    assert.equal(originalScore.correctWordCount, 6);
    assert.equal(originalScore.missingWordCount, 1);
    assert(Math.abs(originalScore.textMatchScore - (6 / 7) * 100) < 1e-9);

    // Simulate AI failure
    const mockFailingFetch = async () => {
      throw new Error("Network timeout");
    };

    const aiResult = await generateLearningFeedback(
      {
        referenceText: ref,
        transcriptText: trans,
        scoringResult: originalScore,
      },
      { fetchFn: mockFailingFetch }
    );

    assert.equal(aiResult.success, false);
    // Deterministic score values must remain unmodified
    assert.equal(originalScore.correctWordCount, 6);
    assert.equal(originalScore.missingWordCount, 1);
    assert(Math.abs(originalScore.textMatchScore - (6 / 7) * 100) < 1e-9);
  });

  // Test 12: Prompt version and system prompt rules
  test("Test 12: System prompt contains strict rules prohibiting invented audio claims", () => {
    assert(SYSTEM_PROMPT.includes("NO AUDIO CLAIMS"));
    assert(SYSTEM_PROMPT.includes("NO HALLUCINATIONS"));
    assert(SYSTEM_PROMPT.includes("SOURCE OF TRUTH"));
    assert.equal(PROMPT_VERSION, "v1.0.0-say-it-coach");
  });

  // Test 13: Prompt construction with perfect transcript
  test("Test 13: Prompt construction for a perfect attempt provides zero error evidence", () => {
    const perfectScore = scoreAttempt("I like English", "I like English");
    const prompt = buildFeedbackPrompt({
      referenceText: "I like English",
      transcriptText: "I like English",
      scoringResult: perfectScore,
    });

    assert(prompt.includes("All words were matched perfectly."));
    assert(!prompt.includes("Missing word"));
  });
});
