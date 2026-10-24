/**
 * Shadowly — AI Learning Insights & Coach Summary
 * Phase 7 Learning Intelligence
 *
 * Prompts Ollama to generate an encouraging, evidence-grounded summary of
 * the learner's verified progress.
 *
 * Strict Guardrails:
 * - Deterministic analytics remain the source of truth for all numbers.
 * - Ollama is given only a compact verified summary.
 * - Deterministic fallback is always returned if Ollama is unreachable.
 */

import { getOllamaConfig } from "./ollamaClient.js";

export const INSIGHTS_SYSTEM_PROMPT = `You are Shadowly's friendly, encouraging AI English learning tutor.
Your job is to provide a concise, motivating summary of the student's actual learning analytics.

Rules:
1. ONLY refer to the metrics, weaknesses, and recommendations provided in the prompt.
2. NEVER fabricate scores, attempts, tests, or learning history that was not provided.
3. NEVER claim to evaluate pronunciation or accent acoustics (all speech data is text-match only).
4. Keep your output concise, constructive, and easy to read.
5. Return ONLY a valid JSON object matching the requested schema. No conversational preamble.`;

/**
 * Build the prompt for Ollama using strictly verified data
 */
export function buildInsightsPrompt({ analytics, weaknesses = [], language = "en" }) {
  const summary = analytics?.summary || {};
  const topWeakness = Array.isArray(weaknesses) && weaknesses.length > 0 ? weaknesses[0] : null;

  return `Here is the learner's verified progress data:
- Completed activities: ${summary.totalCompletedActivities || 0}
- Current streak: ${summary.currentStreak || 0} day(s)
- Overall average score: ${summary.overallAverageScore !== null ? `${summary.overallAverageScore}%` : "No scores recorded yet"}
- Active practice time: ${summary.totalDurationMinutes || 0} minutes
- Primary focus area: ${topWeakness ? `${topWeakness.category} (${topWeakness.evidence})` : "General English foundations"}
- Preferred response language: ${language}

Generate a friendly JSON response with this exact structure:
{
  "summary": "1-2 concise sentences summarizing recent progress based on the data above.",
  "encouragement": "1 inspiring sentence celebrating their consistency.",
  "focusTip": "1 practical actionable tip for today's practice."
}`;
}

/**
 * Generate a guaranteed deterministic fallback if Ollama is offline or invalid
 */
export function generateDeterministicInsightsFallback({ analytics, weaknesses = [] }) {
  const summary = analytics?.summary || {};
  const count = summary.totalCompletedActivities || 0;
  const streak = summary.currentStreak || 0;
  const topWeakness = Array.isArray(weaknesses) && weaknesses.length > 0 ? weaknesses[0] : null;

  if (count === 0) {
    return {
      source: "deterministic_engine",
      summary: "Welcome to Shadowly! Begin with your personalized daily plan to calibrate your baseline across speaking, listening, and grammar.",
      encouragement: "Every language journey begins with a single sentence. Let's make today count!",
      focusTip: "Start with 5 minutes of speech shadowing to establish your rhythm.",
    };
  }

  const focusTopic = topWeakness ? topWeakness.category : "daily vocabulary and listening";

  return {
    source: "deterministic_engine",
    summary: `You have completed ${count} learning exercise${count === 1 ? "" : "s"} with an active streak of ${streak} day${streak === 1 ? "" : "s"}. ${
      topWeakness ? `Your primary growth area right now is ${focusTopic}.` : "You are maintaining balanced progress across all core modules."
    }`,
    encouragement: streak > 1
      ? `Impressive ${streak}-day streak! Consistency is the number one driver of language fluency.`
      : "Great effort on today's practice. Keep building the habit!",
    focusTip: topWeakness
      ? `Dedicate your next session to ${focusTopic} to turn challenges into strengths.`
      : "Try tackling an interactive AI conversation session to apply your skills in context.",
  };
}

/**
 * Request learning insights from Ollama with guaranteed deterministic fallback
 */
export async function generateLearningInsights({ analytics, weaknesses = [], language = "en" }) {
  const config = getOllamaConfig();
  const fallback = generateDeterministicInsightsFallback({ analytics, weaknesses });

  try {
    const userPrompt = buildInsightsPrompt({ analytics, weaknesses, language });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: INSIGHTS_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        options: { temperature: 0.3 },
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return fallback;
    }

    const data = await res.json();
    const rawContent = data.message?.content || "";

    // Parse JSON from Ollama output
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallback;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.summary && parsed.encouragement && parsed.focusTip) {
      return {
        source: "ollama_ai",
        summary: String(parsed.summary).trim(),
        encouragement: String(parsed.encouragement).trim(),
        focusTip: String(parsed.focusTip).trim(),
      };
    }

    return fallback;
  } catch {
    // If Ollama is offline or times out, safely return deterministic fallback
    return fallback;
  }
}
