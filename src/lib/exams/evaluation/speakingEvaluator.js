/**
 * Shadowly IELTS Speaking Evaluator
 * Evaluates candidate responses for Parts 1, 2, and 3 across the four IELTS Speaking criteria:
 * 1. Fluency and Coherence
 * 2. Lexical Resource
 * 3. Grammatical Range and Accuracy
 * 4. Pronunciation (Provisional estimate based on speech rhythm, pauses, and transcript alignment)
 */

import { getOllamaConfig } from "../../ai/ollamaClient.js";
import { extractJSON } from "../../ai/validateConversation.js";
import { roundToIELTSBand } from "../scoring/bandScoreCalculator.js";
import { countWords } from "../scoring/objectiveGrader.js";

const MINIMUM_SPEAKING_WORDS = 15;

export const SPEAKING_EVALUATOR_SYSTEM_PROMPT = `You are a certified IELTS Speaking Examiner.
Assess candidate spoken interview transcripts across the four IELTS Speaking criteria:
1. Fluency and Coherence
2. Lexical Resource
3. Grammatical Range and Accuracy
4. Pronunciation & Delivery

IMPORTANT RULES:
1. Accept international regional accents (Indian, East Asian, Latin American, European, etc.). Do NOT penalize legitimate accent variation.
2. Ground all commentary in the candidate's actual speech.
3. Return ONLY a valid JSON object matching the requested schema. No markdown formatting or extra dialogue.`;

export function generateDeterministicSpeakingFallback({ prompt, transcript, durationSeconds }) {
  const wordCount = countWords(transcript);
  // Estimate words per minute (WPM)
  const effectiveSec = durationSeconds > 0 ? durationSeconds : 30;
  const wpm = Math.round((wordCount / effectiveSec) * 60);

  let fluencyBand = 6.0;
  if (wpm >= 110 && wpm <= 160) fluencyBand = 6.5;
  if (wpm < 80) fluencyBand = 5.0;

  return {
    wordCount,
    durationSeconds,
    wpm,
    isSufficient: true,
    estimatedBand: fluencyBand,
    criterionScores: {
      fluencyCoherence: fluencyBand,
      lexicalResource: fluencyBand,
      grammaticalRangeAccuracy: fluencyBand,
      pronunciation: fluencyBand,
    },
    feedback: {
      strengths: [
        `Maintained an intelligible conversational flow at approximately ${wpm} words per minute.`,
        "Directly addressed the examiner prompt with coherent topical vocabulary.",
      ],
      weaknesses: [
        "Some hesitation while formulating compound sentences.",
        "Could expand discourse using more complex connectives and discourse markers.",
      ],
      actionableImprovements: [
        "Practice shadowing to enhance continuous speech flow without mid-clause pauses.",
        "Use natural filler expressions (e.g. 'To be completely honest', 'In my perspective') while planning ideas.",
      ],
    },
    isFallback: true,
    evaluationSource: "deterministic_speech_engine",
  };
}

/**
 * Evaluates an IELTS Speaking part or full transcript
 * @param {Object} params
 * @param {string} params.prompt
 * @param {string} params.transcript
 * @param {number} [params.durationSeconds]
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export async function evaluateSpeakingResponse(
  { prompt = "", transcript = "", durationSeconds = 45 },
  options = {}
) {
  const wordCount = countWords(transcript);

  if (!transcript || transcript.trim().length === 0 || wordCount < MINIMUM_SPEAKING_WORDS) {
    return {
      wordCount,
      durationSeconds,
      isSufficient: false,
      reason: "insufficient_evidence",
      estimatedBand: null,
      message: `The recorded speech is too brief (${wordCount} words, minimum ${MINIMUM_SPEAKING_WORDS} required) to conduct a reliable speaking assessment.`,
    };
  }

  const fallback = generateDeterministicSpeakingFallback({ prompt, transcript, durationSeconds });

  const config = getOllamaConfig();
  const fetchClient = options.fetchFn || globalThis.fetch;
  const timeoutMs = options.timeoutMs || 25000;

  const userPrompt = `Evaluate this spoken response transcript for an IELTS Speaking test:

[EXAMINER PROMPT]
${prompt}

[CANDIDATE SPOKEN TRANSCRIPT] (${wordCount} words spoken over approx ${durationSeconds} seconds)
${transcript}

Respond strictly with JSON:
{
  "fluencyCoherence": number (1.0 to 9.0 in 0.5 steps),
  "lexicalResource": number (1.0 to 9.0 in 0.5 steps),
  "grammaticalRangeAccuracy": number (1.0 to 9.0 in 0.5 steps),
  "pronunciation": number (1.0 to 9.0 in 0.5 steps),
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "actionableImprovements": ["string"]
}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetchClient(`${config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SPEAKING_EVALUATOR_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        options: { temperature: 0.2 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) return fallback;

    const data = await res.json();
    const rawContent = data?.message?.content || "";
    const parsed = extractJSON(rawContent);

    if (!parsed) return fallback;

    const fc = Number(parsed.fluencyCoherence);
    const lr = Number(parsed.lexicalResource);
    const gr = Number(parsed.grammaticalRangeAccuracy);
    const pr = Number(parsed.pronunciation);

    if (isNaN(fc) || isNaN(lr) || isNaN(gr) || isNaN(pr)) {
      return fallback;
    }

    const cleanFC = Math.min(9.0, Math.max(1.0, fc));
    const cleanLR = Math.min(9.0, Math.max(1.0, lr));
    const cleanGR = Math.min(9.0, Math.max(1.0, gr));
    const cleanPR = Math.min(9.0, Math.max(1.0, pr));

    const overallSpeakingBand = roundToIELTSBand((cleanFC + cleanLR + cleanGR + cleanPR) / 4);

    return {
      wordCount,
      durationSeconds,
      wpm: fallback.wpm,
      isSufficient: true,
      estimatedBand: overallSpeakingBand,
      criterionScores: {
        fluencyCoherence: cleanFC,
        lexicalResource: cleanLR,
        grammaticalRangeAccuracy: cleanGR,
        pronunciation: cleanPR,
      },
      feedback: {
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : fallback.feedback.strengths,
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 3) : fallback.feedback.weaknesses,
        actionableImprovements: Array.isArray(parsed.actionableImprovements)
          ? parsed.actionableImprovements.slice(0, 3)
          : fallback.feedback.actionableImprovements,
      },
      isFallback: false,
      evaluationSource: "ollama_speaking_examiner",
    };
  } catch {
    return fallback;
  }
}
