/**
 * Shadowly — AI Learning Coach & Context-Aware Tutor
 * Phase 9 AI Learning Coach & Smart Practice
 *
 * Provides personalized error explanations, grammar rules, level-appropriate
 * guidance, and practice recommendations grounded in verified learning data.
 */

import { getOllamaConfig } from "./ollamaClient.js";
import { extractJSONFromModelResponse } from "./validateFeedback.js";
import { SUPPORTED_LANGUAGES } from "../languages.js";

export const COACH_SYSTEM_PROMPT = `You are Shadowly's expert AI English Learning Coach and pedagogical tutor.
Your mission is to help learners understand their mistakes, master grammar rules, and build natural fluency.

Core Principles:
1. Ground your advice in the learner's actual mistake and context provided.
2. NEVER invent previous attempts, scores, streaks, or learning statistics.
3. Tailor explanation complexity to the learner's proficiency level:
   - beginner: Simple sentence structures, friendly tone, minimal jargon, clear intuitive examples.
   - intermediate: Clear structural rules, common pitfalls, practical everyday usage.
   - advanced: Precise grammatical distinctions, nuances, style differences, edge cases.
4. If a preferred explanation language is requested, provide clear explanations in that language while keeping English example phrases and target sentences intact.
5. Return ONLY a valid JSON object matching the exact schema below without any conversational preamble or markdown code fences.

JSON Schema:
{
  "title": "Short descriptive title of the concept or mistake",
  "explanation": "Clear, friendly explanation of why the answer was incorrect and how to form it properly",
  "correctAnswer": "The accurate answer",
  "grammarRule": "The underlying grammatical or lexical rule (or null if not applicable)",
  "examples": [
    { "phrase": "English sentence illustrating correct usage", "usage": "Brief note on why this works", "isContrasting": false },
    { "phrase": "Contrasting sentence or common error to avoid", "usage": "Why this is incorrect or different", "isContrasting": true }
  ],
  "learnerFriendlyTip": "1 memorable rule of thumb or memory trick",
  "relatedSkill": "grammar | vocabulary | speaking | dictation | conversation",
  "recommendedAction": "Suggested practice drill or next step",
  "confidence": "high | medium | low"
}`;

/**
 * Build a compact, sanitized learner context object
 */
export function buildLearnerContext({
  activities = [],
  preferences = {},
  weaknesses = [],
  goals = [],
  currentMistake = null,
} = {}) {
  const level = preferences.learningLevel || "intermediate";
  const preferredLangCode = preferences.preferredLanguage || "en";
  const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === preferredLangCode) || SUPPORTED_LANGUAGES[0];

  // Filter and bound recent activities (last 5)
  const safeActivities = (Array.isArray(activities) ? activities : [])
    .filter((a) => a && typeof a === "object" && a.status === "completed")
    .slice(-5)
    .map((a) => ({
      module: a.module,
      score: a.score,
      exerciseId: String(a.exerciseId || "").slice(0, 50),
    }));

  // Extract top 2 detected weaknesses
  const safeWeaknesses = (Array.isArray(weaknesses) ? weaknesses : [])
    .slice(0, 2)
    .map((w) => ({
      category: w.category,
      topicName: w.topicName,
      status: w.status,
      evidence: w.evidence,
    }));

  // Extract active goals
  const activeGoals = (Array.isArray(goals) ? goals : [])
    .filter((g) => g && g.status === "active")
    .slice(0, 2)
    .map((g) => ({
      goalType: g.goalType,
      targetValue: g.targetValue,
      targetUnit: g.targetUnit,
      skill: g.skill,
    }));

  return {
    level,
    language: langConfig.name,
    languageCode: langConfig.code,
    recentActivityCount: safeActivities.length,
    recentActivities: safeActivities,
    topWeaknesses: safeWeaknesses,
    activeGoals,
    currentMistake: currentMistake ? sanitizeInputText(currentMistake) : null,
  };
}

/**
 * Sanitize untrusted user text inputs to prevent prompt injection
 */
export function sanitizeInputText(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/[<>{}[\]]/g, "") // strip code brackets
    .slice(0, 400)             // bound max length
    .trim();
}

/**
 * Validate coach response structure
 */
export function validateCoachResponse(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { valid: false, error: "Response must be a non-null JSON object." };
  }

  if (typeof parsed.title !== "string" || !parsed.title.trim()) {
    return { valid: false, error: "Missing or invalid 'title'." };
  }

  if (typeof parsed.explanation !== "string" || !parsed.explanation.trim()) {
    return { valid: false, error: "Missing or invalid 'explanation'." };
  }

  // Ensure examples is an array
  const examples = Array.isArray(parsed.examples)
    ? parsed.examples.filter((ex) => ex && typeof ex.phrase === "string")
    : [];

  return {
    valid: true,
    data: {
      title: parsed.title.trim(),
      explanation: parsed.explanation.trim(),
      correctAnswer: typeof parsed.correctAnswer === "string" ? parsed.correctAnswer.trim() : null,
      grammarRule: typeof parsed.grammarRule === "string" ? parsed.grammarRule.trim() : null,
      examples,
      learnerFriendlyTip: typeof parsed.learnerFriendlyTip === "string" ? parsed.learnerFriendlyTip.trim() : null,
      relatedSkill: typeof parsed.relatedSkill === "string" ? parsed.relatedSkill.trim() : "grammar",
      recommendedAction: typeof parsed.recommendedAction === "string" ? parsed.recommendedAction.trim() : null,
      confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium",
    },
  };
}

/**
 * Deterministic fallback coach explanation when AI model is offline or invalid
 */
export function generateDeterministicCoachFallback({
  question = "",
  userAnswer = "",
  correctAnswer = "",
  skill = "grammar",
  concept = "",
  level = "intermediate",
  language = "English",
} = {}) {
  const safeQ = sanitizeInputText(question);
  const safeUser = sanitizeInputText(userAnswer);
  const safeCorrect = sanitizeInputText(correctAnswer);
  const safeConcept = sanitizeInputText(concept) || "Target Pattern";

  const isVocab = skill === "vocabulary";

  return {
    source: "deterministic_coach",
    title: safeConcept ? `Understanding ${safeConcept}` : "Language Guidance & Correction",
    explanation: safeCorrect && safeUser
      ? `You answered "${safeUser}". The correct response is "${safeCorrect}". In English, this form maintains accurate agreement and standard usage in this context.`
      : `Let's focus on mastering ${safeConcept}. Consistent attention to this pattern will build confidence and precision.`,
    correctAnswer: safeCorrect || null,
    grammarRule: isVocab
      ? "Word choices in English depend on context, collocation, and part of speech."
      : "Standard English requires verb tenses and agreement to match the time frame and subject of the clause.",
    examples: [
      {
        phrase: safeCorrect ? `Example: ${safeCorrect}` : "She speaks English fluently every day.",
        usage: "Standard verified form demonstrating proper agreement and flow.",
        isContrasting: false,
      },
      {
        phrase: safeUser ? `Common slip: ${safeUser}` : "She speak English fluently yesterday.",
        usage: "Common mistake involving missing inflection or mismatched tense.",
        isContrasting: true,
      },
    ],
    learnerFriendlyTip: level === "beginner"
      ? "Take your time to check the subject and time words (like 'yesterday' or 'every day') before choosing your answer."
      : "Pay close attention to auxiliary verbs and prepositional collocations in similar sentence structures.",
    relatedSkill: skill || "grammar",
    recommendedAction: `Complete 3 targeted ${skill} drills to reinforce this concept.`,
    confidence: "high",
    language,
  };
}

/**
 * Request AI Learning Coach explanation with guaranteed deterministic fallback
 */
export async function explainErrorOrConcept(
  {
    question = "",
    userAnswer = "",
    correctAnswer = "",
    skill = "grammar",
    concept = "",
    contextNote = "",
  },
  learnerContext = {},
  options = {}
) {
  const level = learnerContext.level || "intermediate";
  const language = learnerContext.language || "English";
  const fetchClient = options.fetchFn || globalThis.fetch;
  const config = getOllamaConfig();
  const baseUrl = (options.baseUrl || config.baseUrl).replace(/\/+$/, "");
  const model = options.model || config.model;
  const timeoutMs = options.timeoutMs || 15000; // 15s timeout for coach explanations

  const fallback = generateDeterministicCoachFallback({
    question,
    userAnswer,
    correctAnswer,
    skill,
    concept,
    level,
    language,
  });

  // Assemble prompt
  const userPrompt = `Analyze this learner's mistake and provide actionable coaching:
- Target Skill: ${skill}
- Proficiency Level: ${level}
- Target Concept: ${concept || "General Syntax"}
- Exercise Question/Sentence: "${sanitizeInputText(question)}"
- Learner's Answer: "${sanitizeInputText(userAnswer)}"
- Correct Answer: "${sanitizeInputText(correctAnswer)}"
- Context Note: "${sanitizeInputText(contextNote)}"
- Preferred Explanation Language: ${language}

Remember to return only the JSON schema specified in system instructions.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchClient(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: COACH_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 350,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return { success: true, coachResponse: fallback, source: "deterministic_fallback" };
    }

    const jsonResponse = await res.json();
    const rawContent = jsonResponse?.message?.content;
    const parsed = extractJSONFromModelResponse(rawContent);

    const validation = validateCoachResponse(parsed);
    if (!validation.valid) {
      return { success: true, coachResponse: fallback, source: "deterministic_fallback" };
    }

    return {
      success: true,
      coachResponse: {
        ...validation.data,
        language,
        source: "ollama_model",
      },
    };
  } catch {
    clearTimeout(timeoutId);
    return {
      success: true,
      coachResponse: fallback,
      source: "deterministic_fallback",
    };
  }
}
