/**
 * Shadowly — Adaptive Practice Generator
 * Phase 9 AI Learning Coach & Smart Practice
 *
 * Generates personalized, level-appropriate practice exercises tailored to
 * identified learner weaknesses, with strict schema validation and verified curated fallbacks.
 */

import { getOllamaConfig } from "../ai/ollamaClient.js";
import { extractJSONFromModelResponse } from "../ai/validateFeedback.js";
import { sanitizeInputText } from "../ai/learningCoach.js";

export const SUPPORTED_EXERCISE_TYPES = [
  "grammar",
  "vocabulary",
  "sentence_construction",
  "dictation",
];

export const PRACTICE_GENERATION_SYSTEM_PROMPT = `You are Fluently's expert curriculum designer and language exercise generator.
Your job is to generate high-quality, pedagogically sound English practice exercises tailored to the learner's exact proficiency level and focus area.

Rules:
1. Generate exercises strictly matching the requested target skill, concept, difficulty, and question count.
2. For "multiple_choice" questions:
   - Provide 3 or 4 distinct, plausible options.
   - The "correctAnswer" MUST EXACTLY MATCH one of the strings in "options".
3. For "fill_blank" questions:
   - Mark the blank with "____" in the prompt.
   - Provide "acceptedAnswers" as an array of valid strings (e.g., lowercase variations or contractions).
4. For "sentence_construction":
   - Provide a jumbled set of words or partial sentence in prompt.
   - Provide accepted complete sentences in "acceptedAnswers".
5. For "dictation":
   - Provide a natural English sentence in prompt/referenceText.
6. Provide a clear, educational explanation for each question explaining why the correct answer is right.
7. Return ONLY a valid JSON object matching the exact schema below without any code fences or preamble.

JSON Schema:
{
  "title": "Exercise Title (e.g. Mastering Irregular Past Tense)",
  "instructions": "Clear instruction for the learner (e.g. Choose the correct verb form for each sentence.)",
  "targetConcept": "Concept being practiced",
  "estimatedMinutes": 3,
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice | fill_blank | sentence_construction | dictation",
      "prompt": "The question text or sentence with blank",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "Exact matching option",
      "acceptedAnswers": ["option A"],
      "explanation": "Why this answer is grammatically correct"
    }
  ]
}`;

/**
 * High-quality curated fallback exercises for offline or model error recovery
 */
export const CURATED_FALLBACK_EXERCISES = {
  grammar: {
    beginner: {
      title: "Essential Present & Past Tenses",
      instructions: "Select the correct verb form to complete each everyday sentence.",
      targetConcept: "Present and Past Simple Verbs",
      estimatedMinutes: 3,
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          prompt: "Yesterday, she ____ to the library to study.",
          options: ["go", "goes", "went", "going"],
          correctAnswer: "went",
          acceptedAnswers: ["went"],
          explanation: "'Went' is the irregular past simple form of 'go', required for an action finished yesterday.",
        },
        {
          id: "q2",
          type: "multiple_choice",
          prompt: "They usually ____ breakfast at 7:30 AM every morning.",
          options: ["eat", "eats", "ate", "eating"],
          correctAnswer: "eat",
          acceptedAnswers: ["eat"],
          explanation: "With the plural subject 'they' in the present simple, the base form 'eat' is used.",
        },
        {
          id: "q3",
          type: "fill_blank",
          prompt: "He ____ not like cold weather. (do / does)",
          options: ["does", "do"],
          correctAnswer: "does",
          acceptedAnswers: ["does"],
          explanation: "Third-person singular subjects (he/she/it) require the auxiliary 'does' in negative sentences.",
        },
      ],
    },
    intermediate: {
      title: "Mastering Conditionals & Time Clauses",
      instructions: "Choose the correct clause structure for hypothetical and future situations.",
      targetConcept: "Second Conditional & Future Real Clauses",
      estimatedMinutes: 4,
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          prompt: "If I ____ more free time, I would learn how to play guitar.",
          options: ["have", "had", "will have", "would have"],
          correctAnswer: "had",
          acceptedAnswers: ["had"],
          explanation: "Second conditional uses 'if + past simple' to express an imaginary present situation.",
        },
        {
          id: "q2",
          type: "multiple_choice",
          prompt: "We will leave as soon as it ____ raining.",
          options: ["stops", "stopped", "will stop", "is stopping"],
          correctAnswer: "stops",
          acceptedAnswers: ["stops"],
          explanation: "Time clauses starting with 'as soon as' or 'when' use present simple for future events.",
        },
        {
          id: "q3",
          type: "fill_blank",
          prompt: "If you heat water to 100 degrees Celsius, it ____. (boil / boils)",
          options: ["boils", "boil"],
          correctAnswer: "boils",
          acceptedAnswers: ["boils"],
          explanation: "Zero conditional for scientific truths uses present simple in both clauses.",
        },
      ],
    },
    advanced: {
      title: "Inversion & Nuanced Subjunctive Structures",
      instructions: "Identify the correct formal inverted syntax for emphasis.",
      targetConcept: "Negative Inversion & Formal Syntax",
      estimatedMinutes: 5,
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          prompt: "Rarely ____ such a breathtaking performance on this stage.",
          options: ["we have witnessed", "have we witnessed", "we witnessed", "had witnessed we"],
          correctAnswer: "have we witnessed",
          acceptedAnswers: ["have we witnessed"],
          explanation: "Negative adverbs like 'Rarely' or 'Seldom' at the start of a clause trigger subject-auxiliary inversion.",
        },
        {
          id: "q2",
          type: "multiple_choice",
          prompt: "The committee recommended that the proposal ____ approved immediately.",
          options: ["is", "was", "be", "would be"],
          correctAnswer: "be",
          acceptedAnswers: ["be"],
          explanation: "The English mandative subjunctive uses the bare base form ('be') after verbs like 'recommend' or 'insist'.",
        },
        {
          id: "q3",
          type: "fill_blank",
          prompt: "Hardly had the meeting started ____ the power went out. (when / than)",
          options: ["when", "than"],
          correctAnswer: "when",
          acceptedAnswers: ["when"],
          explanation: "'Hardly had... when' is the correct correlative pair for sequential past actions.",
        },
      ],
    },
  },
  vocabulary: {
    beginner: {
      title: "Everyday Essential Collocations",
      instructions: "Select the natural verb or adjective partner for each noun.",
      targetConcept: "Common English Collocations",
      estimatedMinutes: 3,
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          prompt: "Please remember to ____ your bed every morning.",
          options: ["do", "make", "create", "build"],
          correctAnswer: "make",
          acceptedAnswers: ["make"],
          explanation: "In English, we say 'make the bed', not 'do the bed'.",
        },
        {
          id: "q2",
          type: "multiple_choice",
          prompt: "I need to ____ a quick phone call before we leave.",
          options: ["do", "make", "speak", "talk"],
          correctAnswer: "make",
          acceptedAnswers: ["make"],
          explanation: "The natural collocation is 'make a phone call'.",
        },
        {
          id: "q3",
          type: "fill_blank",
          prompt: "Could you please ____ me a favor? (do / make)",
          options: ["do", "make"],
          correctAnswer: "do",
          acceptedAnswers: ["do"],
          explanation: "We say 'do someone a favor' in standard English.",
        },
      ],
    },
    intermediate: {
      title: "Phrasal Verbs in Context",
      instructions: "Choose the phrasal verb that best fits the sentence meaning.",
      targetConcept: "Contextual Phrasal Verbs",
      estimatedMinutes: 4,
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          prompt: "The flight was delayed, so they had to ____ the meeting.",
          options: ["call off", "put off", "take off", "give off"],
          correctAnswer: "put off",
          acceptedAnswers: ["put off"],
          explanation: "'Put off' means to postpone or reschedule an event to a later time.",
        },
        {
          id: "q2",
          type: "multiple_choice",
          prompt: "She accidentally ____ an old high school friend at the supermarket.",
          options: ["ran into", "ran over", "ran through", "ran away"],
          correctAnswer: "ran into",
          acceptedAnswers: ["ran into"],
          explanation: "'Run into' means to encounter someone unexpectedly.",
        },
        {
          id: "q3",
          type: "fill_blank",
          prompt: "Don't give ____; you are making great progress every single day! (up / in)",
          options: ["up", "in"],
          correctAnswer: "up",
          acceptedAnswers: ["up"],
          explanation: "'Give up' means to surrender or cease trying.",
        },
      ],
    },
    advanced: {
      title: "Precision Lexicon & Nuanced Diction",
      instructions: "Select the most precise academic or professional word for each context.",
      targetConcept: "Academic Word List & Register",
      estimatedMinutes: 4,
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          prompt: "The new evidence served to ____ the investigator's initial hypothesis.",
          options: ["corroborate", "congratulate", "collude", "congregate"],
          correctAnswer: "corroborate",
          acceptedAnswers: ["corroborate"],
          explanation: "'Corroborate' means to confirm or give support to a statement, theory, or finding.",
        },
        {
          id: "q2",
          type: "multiple_choice",
          prompt: "Her argument was remarkably ____, leaving no room for misunderstanding.",
          options: ["lucid", "opaque", "tangential", "ephemeral"],
          correctAnswer: "lucid",
          acceptedAnswers: ["lucid"],
          explanation: "'Lucid' means expressed clearly and easy to understand.",
        },
        {
          id: "q3",
          type: "fill_blank",
          prompt: "The company sought to ____ the impact of the economic downturn. (mitigate / agitate)",
          options: ["mitigate", "agitate"],
          correctAnswer: "mitigate",
          acceptedAnswers: ["mitigate"],
          explanation: "'Mitigate' means to make less severe, serious, or painful.",
        },
      ],
    },
  },
  sentence_construction: {
    beginner: {
      title: "Building Clear English Sentences",
      instructions: "Select the correctly ordered English sentence.",
      targetConcept: "Subject-Verb-Object Word Order",
      estimatedMinutes: 3,
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          prompt: "Arrange the words into a correct sentence: [English / she / speaks / very well]",
          options: [
            "She speaks English very well.",
            "Speaks she English very well.",
            "She English speaks very well.",
            "Very well speaks she English.",
          ],
          correctAnswer: "She speaks English very well.",
          acceptedAnswers: ["She speaks English very well."],
          explanation: "Standard English sentence order follows Subject (She) + Verb (speaks) + Object (English) + Adverbial (very well).",
        },
        {
          id: "q2",
          type: "multiple_choice",
          prompt: "Arrange into a question: [you / live / where / do / ?]",
          options: [
            "Where do you live?",
            "Where you do live?",
            "Do where you live?",
            "You do live where?",
          ],
          correctAnswer: "Where do you live?",
          acceptedAnswers: ["Where do you live?"],
          explanation: "Wh-questions require Question Word (Where) + Auxiliary (do) + Subject (you) + Base Verb (live)?",
        },
      ],
    },
    intermediate: {
      title: "Relative Clauses & Connecting Sentences",
      instructions: "Combine ideas using proper relative pronouns and conjunctions.",
      targetConcept: "Defining & Non-Defining Relative Clauses",
      estimatedMinutes: 4,
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          prompt: "This is the engineer ____ designed the innovative speech recognition algorithm.",
          options: ["who", "which", "whose", "whom"],
          correctAnswer: "who",
          acceptedAnswers: ["who"],
          explanation: "'Who' is the subject relative pronoun used for people.",
        },
        {
          id: "q2",
          type: "multiple_choice",
          prompt: "The laptop, ____ I bought last year, is still running smoothly.",
          options: ["which", "that", "what", "where"],
          correctAnswer: "which",
          acceptedAnswers: ["which"],
          explanation: "Non-defining relative clauses set off by commas use 'which', not 'that', for things.",
        },
      ],
    },
  },
  dictation: {
    beginner: {
      title: "Auditory Word Boundary Practice",
      instructions: "Type the exact spoken sentence you hear.",
      targetConcept: "Connected Speech & Contractions",
      estimatedMinutes: 3,
      questions: [
        {
          id: "q1",
          type: "dictation",
          prompt: "Listen and type: 'She is listening to the podcast.'",
          correctAnswer: "She is listening to the podcast.",
          acceptedAnswers: ["She is listening to the podcast.", "She's listening to the podcast."],
          explanation: "Clear pronunciation of the progressive aspect '-ing' and the preposition 'to'.",
        },
      ],
    },
    intermediate: {
      title: "Conversational Connected Speech Dictation",
      instructions: "Type the full sentence recognizing reduced vowel sounds.",
      targetConcept: "Weak Forms and Linking Sounds",
      estimatedMinutes: 4,
      questions: [
        {
          id: "q1",
          type: "dictation",
          prompt: "Listen and type: 'We would have called you if we had known.'",
          correctAnswer: "We would have called you if we had known.",
          acceptedAnswers: [
            "We would have called you if we had known.",
            "We'd have called you if we had known.",
            "We would've called you if we had known.",
          ],
          explanation: "In spoken English, 'would have' frequently reduces to 'would've' (/wʊdəv/).",
        },
      ],
    },
  },
};

/**
 * Validate a generated or fallback exercise structure
 */
export function validatePracticeExercise(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { valid: false, error: "Exercise payload must be a non-null JSON object." };
  }

  if (typeof parsed.title !== "string" || !parsed.title.trim()) {
    return { valid: false, error: "Exercise must have a nonempty 'title'." };
  }

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return { valid: false, error: "Exercise must contain at least one question." };
  }

  const seenIds = new Set();
  const validatedQuestions = [];

  for (let i = 0; i < parsed.questions.length; i++) {
    const q = parsed.questions[i];
    if (!q || typeof q !== "object") {
      return { valid: false, error: `Question at index ${i} is not a valid object.` };
    }

    const qId = q.id || `q${i + 1}`;
    if (seenIds.has(qId)) {
      return { valid: false, error: `Duplicate question ID '${qId}' detected.` };
    }
    seenIds.add(qId);

    if (typeof q.prompt !== "string" || !q.prompt.trim()) {
      return { valid: false, error: `Question '${qId}' is missing a valid prompt.` };
    }

    const qType = ["multiple_choice", "fill_blank", "sentence_construction", "dictation"].includes(q.type)
      ? q.type
      : "multiple_choice";

    let options = null;
    let correctAnswer = typeof q.correctAnswer === "string" ? q.correctAnswer.trim() : "";
    let acceptedAnswers = Array.isArray(q.acceptedAnswers)
      ? q.acceptedAnswers.map((a) => String(a).trim()).filter(Boolean)
      : [];

    if (qType === "multiple_choice") {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return { valid: false, error: `Multiple-choice question '${qId}' must have at least 2 options.` };
      }
      options = q.options.map((o) => String(o).trim()).filter(Boolean);

      // Verify correct answer matches one of the options
      if (!options.includes(correctAnswer)) {
        // If not exact, check case-insensitive match
        const matching = options.find((o) => o.toLowerCase() === correctAnswer.toLowerCase());
        if (matching) {
          correctAnswer = matching;
        } else {
          return {
            valid: false,
            error: `Multiple-choice question '${qId}' correctAnswer "${correctAnswer}" is not among valid options: [${options.join(", ")}].`,
          };
        }
      }

      if (acceptedAnswers.length === 0) {
        acceptedAnswers = [correctAnswer];
      }
    } else {
      // For fill_blank or sentence_construction
      if (!correctAnswer && acceptedAnswers.length > 0) {
        correctAnswer = acceptedAnswers[0];
      }
      if (acceptedAnswers.length === 0 && correctAnswer) {
        acceptedAnswers = [correctAnswer];
      }
    }

    validatedQuestions.push({
      id: qId,
      type: qType,
      prompt: q.prompt.trim(),
      options,
      correctAnswer,
      acceptedAnswers,
      explanation: typeof q.explanation === "string" && q.explanation.trim()
        ? q.explanation.trim()
        : "Standard English grammar rule applies.",
    });
  }

  return {
    valid: true,
    data: {
      title: parsed.title.trim(),
      instructions: typeof parsed.instructions === "string" ? parsed.instructions.trim() : "Complete the exercise below.",
      targetConcept: typeof parsed.targetConcept === "string" ? parsed.targetConcept.trim() : "General Practice",
      estimatedMinutes: typeof parsed.estimatedMinutes === "number" && parsed.estimatedMinutes > 0 ? parsed.estimatedMinutes : 3,
      questions: validatedQuestions,
    },
  };
}

/**
 * Retrieve curated fallback exercise for the skill and level
 */
export function getCuratedFallbackExercise({ skill = "grammar", difficulty = "intermediate" } = {}) {
  const safeSkill = CURATED_FALLBACK_EXERCISES[skill] ? skill : "grammar";
  const skillCollection = CURATED_FALLBACK_EXERCISES[safeSkill];
  const safeDiff = skillCollection[difficulty] ? difficulty : Object.keys(skillCollection)[0];
  const template = skillCollection[safeDiff];

  const exerciseId = `curated_${safeSkill}_${safeDiff}_${Date.now()}`;

  return {
    id: exerciseId,
    version: "1.0",
    exerciseType: safeSkill,
    skill: safeSkill,
    difficulty: safeDiff,
    source: "curated_fallback",
    title: template.title,
    instructions: template.instructions,
    targetConcept: template.targetConcept,
    estimatedMinutes: template.estimatedMinutes,
    questions: template.questions.map((q, idx) => ({
      ...q,
      id: `${exerciseId}_q${idx + 1}`,
    })),
  };
}

/**
 * Generate a smart practice exercise tailored to learner needs
 */
export async function generatePracticeExercise(
  {
    skill = "grammar",
    targetConcept = "",
    difficulty = "intermediate",
    exerciseType = "grammar",
    questionCount = 3,
    level = "intermediate",
    language = "English",
  },
  options = {}
) {
  const safeSkill = SUPPORTED_EXERCISE_TYPES.includes(skill) ? skill : "grammar";
  const safeDiff = ["beginner", "intermediate", "advanced"].includes(difficulty) ? difficulty : "intermediate";
  const safeCount = Math.max(1, Math.min(5, Number(questionCount) || 3));
  const safeConcept = sanitizeInputText(targetConcept) || "Core Grammatical Accuracy";

  const fetchClient = options.fetchFn || globalThis.fetch;
  const config = getOllamaConfig();
  const baseUrl = (options.baseUrl || config.baseUrl).replace(/\/+$/, "");
  const model = options.model || config.model;
  const timeoutMs = options.timeoutMs || 20000; // 20s timeout for exercise generation

  const fallback = getCuratedFallbackExercise({ skill: safeSkill, difficulty: safeDiff });

  const prompt = `Generate a ${safeCount}-question ${safeSkill} exercise for an ${safeDiff} learner.
Focus Area / Target Concept: ${safeConcept}
Learner Level: ${level}
Preferred Language for Explanations: ${language}

Generate exactly ${safeCount} questions following the required JSON schema.`;

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
          { role: "system", content: PRACTICE_GENERATION_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        stream: false,
        options: {
          temperature: 0.4,
          num_predict: 450,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return { success: true, exercise: fallback, source: "curated_fallback" };
    }

    const json = await res.json();
    const rawContent = json?.message?.content;
    const parsed = extractJSONFromModelResponse(rawContent);

    const validation = validatePracticeExercise(parsed);
    if (!validation.valid) {
      return { success: true, exercise: fallback, source: "curated_fallback" };
    }

    const exerciseId = `ai_${safeSkill}_${safeDiff}_${Date.now()}`;
    const exercise = {
      id: exerciseId,
      version: "1.0",
      exerciseType: safeSkill,
      skill: safeSkill,
      difficulty: safeDiff,
      source: "ollama_model",
      title: validation.data.title,
      instructions: validation.data.instructions,
      targetConcept: validation.data.targetConcept,
      estimatedMinutes: validation.data.estimatedMinutes,
      questions: validation.data.questions.map((q, idx) => ({
        ...q,
        id: `${exerciseId}_q${idx + 1}`,
      })),
    };

    return {
      success: true,
      exercise,
      source: "ollama_model",
    };
  } catch {
    clearTimeout(timeoutId);
    return {
      success: true,
      exercise: fallback,
      source: "curated_fallback",
    };
  }
}
