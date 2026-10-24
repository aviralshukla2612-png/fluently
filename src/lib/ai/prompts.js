/**
 * Centralized, Versioned AI Coach Prompts for Shadowly
 * Designed for local/remote Ollama with models such as llama3.2:1b.
 */

export const PROMPT_VERSION = "v1.0.0-say-it-coach";

/**
 * System prompt instructing the model to act as a patient, concise English tutor.
 * Strictly enforces evidence-based feedback grounded only in the provided lexical alignment.
 */
export const SYSTEM_PROMPT = `You are a patient, encouraging, and concise English language coach for the Shadowly speaking app.
Your task is to provide constructive learning feedback to a student who just shadowed a reference sentence.

STRICT OPERATIONAL RULES:
1. SOURCE OF TRUTH: The provided reference sentence and the deterministic word-level alignment are your ONLY source of truth.
2. NO HALLUCINATIONS: Do NOT invent errors that are not listed in the scoring alignment.
3. NO AUDIO CLAIMS: You received ONLY the text transcript, NOT audio. Never claim to hear their voice, accent, pitch, intonation, or pronunciation quality. Clearly refer only to "words recognized" or "transcription".
4. PERFECT ATTEMPTS: If all words matched with zero missing or substituted words, warmly celebrate their accuracy and suggest a natural extension or follow-up sentence challenge. Do NOT manufacture mistakes.
5. CONCISE & PRACTICAL: Keep explanations short, simple, and encouraging (suitable for A2-B2 learners). Avoid long essays or repetitive filler.
6. OUTPUT FORMAT: You must respond ONLY with a valid JSON object matching the exact schema provided. Do not include markdown code fences, commentary, or text outside the JSON.`;

/**
 * Builds the user prompt supplying the validated reference sentence, transcript, and alignment details.
 * 
 * @param {Object} params
 * @param {string} params.referenceText
 * @param {string} params.transcriptText
 * @param {Object} params.scoringResult
 * @param {string} [params.difficulty]
 * @param {string} [params.contextNote]
 * @returns {string}
 */
export function buildFeedbackPrompt({
  referenceText,
  transcriptText,
  scoringResult,
  difficulty = "Intermediate",
  contextNote = "",
}) {
  const {
    correctWordCount = 0,
    missingWordCount = 0,
    substitutionCount = 0,
    extraWordCount = 0,
    referenceWordCount = 0,
    textMatchScore = 0,
    alignment = [],
  } = scoringResult || {};

  // Extract only meaningful errors from alignment for the model's focus
  const errorDetails = alignment
    .filter((a) => a.type !== "match")
    .map((a) => {
      if (a.type === "deletion") {
        return `- Missing word: "${a.referenceWord}"`;
      }
      if (a.type === "substitution") {
        return `- Substituted word: expected "${a.referenceWord}", but transcript had "${a.transcriptWord}"`;
      }
      if (a.type === "insertion") {
        return `- Extra word spoken: "${a.transcriptWord}"`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");

  const hasErrors = missingWordCount > 0 || substitutionCount > 0 || extraWordCount > 0;

  return `STUDENT ATTEMPT DETAILS:
- Target Reference Sentence: "${referenceText}"
- Recognized Transcript: "${transcriptText || "(no words recognized)"}"
- Level: ${difficulty}
${contextNote ? `- Pedagogical Focus: ${contextNote}` : ""}
- Score: ${Math.round(textMatchScore)}% text match (${correctWordCount}/${referenceWordCount} words correct)
- Breakdown: ${missingWordCount} missing, ${substitutionCount} substituted, ${extraWordCount} extra words

SCORING EVIDENCE:
${hasErrors ? errorDetails : "None! All words were matched perfectly."}

OUTPUT SCHEMA:
Provide your response strictly as a JSON object with this exact shape:
{
  "overallFeedback": "Short 1-2 sentence warm, constructive overview of the attempt.",
  "mistakeExplanations": [
    ${hasErrors ? '{"word": "word_name", "type": "missing|substitution|extra", "explanation": "Simple 1-sentence tip on why this word matters or how to articulate it."}' : ""}
  ],
  "correctedSentence": "${referenceText}",
  "practiceTips": [
    "Tip 1 on linking or cadence",
    "Tip 2 on vocabulary or sentence rhythm"
  ],
  "practiceExamples": [
    "Short example sentence 1",
    "Short example sentence 2"
  ],
  "grammarNotes": "Brief optional grammar tip if applicable, or null",
  "nextStep": "1 actionable sentence on what to try next",
  "difficultyNote": "Guidance on whether to repeat or advance"
}`;
}
