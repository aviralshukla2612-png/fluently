import {
  CONVERSATION_PROMPT_VERSION,
  SUMMARY_PROMPT_VERSION,
} from "./conversationPrompts.js";

const MAX_REPLY_LENGTH = 1500;
const MAX_CORRECTIONS = 3;
const MAX_TEXT_FIELD = 400;

/**
 * Strips HTML tags and script elements from a string
 */
export function sanitizeText(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export const stripHtml = sanitizeText;

/**
 * Extracts and cleans JSON from raw LLM text
 */
export function extractJSON(rawText) {
  if (typeof rawText !== "string") return null;

  let cleaned = rawText.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/i, "");
    cleaned = cleaned.trim();
  }

  // Attempt standard JSON parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt to isolate the outer JSON object {...}
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const substring = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(substring);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Validates and normalizes the AI tutor conversation response schema.
 * 
 * @param {any} parsedObject - Parsed JSON object from model
 * @param {string} rawFallbackText - Raw text to salvage if JSON extraction partially failed
 * @returns {{ valid: boolean, response: Object, error?: string }}
 */
export function validateConversationResponse(parsedObject, rawFallbackText = "") {
  let target = parsedObject;

  // If not a valid object, attempt to extract or salvage
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    const isConfigKeyword = typeof rawFallbackText === "string" &&
      ["gentle", "natural", "tutor", "beginner", "intermediate", "advanced"].includes(rawFallbackText.toLowerCase());

    if (rawFallbackText && typeof rawFallbackText === "string" && !isConfigKeyword) {
      const sanitized = sanitizeText(rawFallbackText);
      if (sanitized.length > 0) {
        const fallbackRes = {
          reply: sanitized.slice(0, MAX_REPLY_LENGTH),
          corrections: [],
          usefulPhrase: null,
          followUpQuestion: null,
          promptVersion: CONVERSATION_PROMPT_VERSION,
        };
        return {
          valid: true,
          isValid: true,
          response: fallbackRes,
          data: fallbackRes,
        };
      }
    }
    const defaultFallback = {
      reply: "I'm listening! Please feel free to continue our conversation.",
      corrections: [],
      usefulPhrase: null,
      followUpQuestion: null,
      promptVersion: CONVERSATION_PROMPT_VERSION,
    };
    return {
      valid: false,
      isValid: false,
      response: null,
      data: defaultFallback,
      fallback: defaultFallback,
      error: "Model output could not be parsed into a valid JSON object.",
    };
  }

  // 1. Reply (mandatory non-empty string)
  const rawReply = typeof target.reply === "string" ? target.reply : "";
  let reply = sanitizeText(rawReply);

  if (!reply) {
    // If reply is missing but followUpQuestion is present, use it as reply
    if (typeof target.followUpQuestion === "string" && target.followUpQuestion.trim()) {
      const res = {
        reply: sanitizeText(target.followUpQuestion).slice(0, MAX_REPLY_LENGTH),
        corrections: [],
        usefulPhrase: null,
        followUpQuestion: null,
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
      return {
        valid: true,
        isValid: true,
        response: res,
        data: res,
      };
    }

    const defaultReply = {
      reply: "That is interesting! Could you tell me more about that?",
      corrections: [],
      usefulPhrase: null,
      followUpQuestion: null,
      promptVersion: CONVERSATION_PROMPT_VERSION,
    };

    return {
      valid: true,
      isValid: true,
      response: defaultReply,
      data: defaultReply,
    };
  }

  // 2. Corrections (array of objects)
  const rawCorrections = Array.isArray(target.corrections) ? target.corrections : [];
  const corrections = [];

  for (const item of rawCorrections.slice(0, MAX_CORRECTIONS)) {
    if (item && typeof item === "object" && typeof item.corrected === "string") {
      const original = sanitizeText(item.original || "").slice(0, MAX_TEXT_FIELD);
      const corrected = sanitizeText(item.corrected).slice(0, MAX_TEXT_FIELD);
      const explanation = sanitizeText(item.explanation || "").slice(0, MAX_TEXT_FIELD);

      if (original.length > 0 && corrected.length > 0) {
        corrections.push({
          original,
          corrected,
          explanation: explanation || "More natural English phrasing.",
        });
      }
    }
  }

  // 3. Useful Phrase (optional string or null)
  let usefulPhrase = null;
  if (typeof target.usefulPhrase === "string" && target.usefulPhrase.trim()) {
    usefulPhrase = sanitizeText(target.usefulPhrase).slice(0, MAX_TEXT_FIELD);
  }

  // 4. Follow-up Question (optional string or null)
  let followUpQuestion = null;
  if (typeof target.followUpQuestion === "string" && target.followUpQuestion.trim()) {
    followUpQuestion = sanitizeText(target.followUpQuestion).slice(0, MAX_TEXT_FIELD);
  } else if (reply && reply.includes("?")) {
    const sentences = reply.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      const lastSentence = sentences[sentences.length - 1].trim();
      if (lastSentence.endsWith("?")) {
        followUpQuestion = lastSentence.slice(0, MAX_TEXT_FIELD);
        reply = sentences.slice(0, -1).join(" ");
      }
    }
  }

  const validatedData = {
    reply: reply.slice(0, MAX_REPLY_LENGTH),
    corrections,
    usefulPhrase,
    followUpQuestion,
    promptVersion: CONVERSATION_PROMPT_VERSION,
  };

  return {
    valid: true,
    isValid: true,
    response: validatedData,
    data: validatedData,
  };
}

export const validateConversationReply = validateConversationResponse;
export const extractJSONFromModelResponse = extractJSON;

/**
 * Validates and normalizes the conversation summary schema.
 */
export function validateConversationSummary(parsedObject) {
  if (!parsedObject || typeof parsedObject !== "object" || Array.isArray(parsedObject)) {
    return {
      valid: false,
      isValid: false,
      summary: null,
      data: null,
      error: "Model output is not a valid JSON summary object.",
    };
  }

  const rawTopics = parsedObject.topicsDiscussed || parsedObject.topics;
  const topicsDiscussed = Array.isArray(rawTopics)
    ? rawTopics.map((t) => sanitizeText(String(t))).filter(Boolean).slice(0, 5)
    : ["English Conversation Practice"];

  const usefulPhrases = Array.isArray(parsedObject.usefulPhrases)
    ? parsedObject.usefulPhrases.map((p) => sanitizeText(String(p))).filter(Boolean).slice(0, 5)
    : [];

  const grammarPatterns = Array.isArray(parsedObject.grammarPatterns)
    ? parsedObject.grammarPatterns.map((g) => sanitizeText(String(g))).filter(Boolean).slice(0, 5)
    : ["Conversational Sentence Flow"];

  const suggestedPractice = typeof parsedObject.suggestedPractice === "string"
    ? sanitizeText(parsedObject.suggestedPractice).slice(0, MAX_TEXT_FIELD)
    : "Continue practicing spoken responses with varied vocabulary.";

  let improvedExpressions = [];
  if (Array.isArray(parsedObject.improvedExpressions)) {
    improvedExpressions = parsedObject.improvedExpressions
      .filter((e) => e && typeof e === "object" && typeof e.improved === "string")
      .map((e) => ({
        original: sanitizeText(e.original || "").slice(0, MAX_TEXT_FIELD),
        improved: sanitizeText(e.improved).slice(0, MAX_TEXT_FIELD),
        explanation: sanitizeText(e.explanation || e.note || "").slice(0, MAX_TEXT_FIELD),
      }));
  }

  let improvedExpression = null;
  if (
    parsedObject.improvedExpression &&
    typeof parsedObject.improvedExpression === "object" &&
    typeof parsedObject.improvedExpression.improved === "string"
  ) {
    improvedExpression = {
      original: sanitizeText(parsedObject.improvedExpression.original || "").slice(0, MAX_TEXT_FIELD),
      improved: sanitizeText(parsedObject.improvedExpression.improved).slice(0, MAX_TEXT_FIELD),
      explanation: sanitizeText(parsedObject.improvedExpression.explanation || "").slice(0, MAX_TEXT_FIELD),
    };
  } else if (improvedExpressions.length > 0) {
    improvedExpression = improvedExpressions[0];
  }

  const summaryData = {
    topicsDiscussed: topicsDiscussed.length > 0 ? topicsDiscussed : ["General Conversation"],
    topics: topicsDiscussed.length > 0 ? topicsDiscussed : ["General Conversation"],
    usefulPhrases,
    grammarPatterns: grammarPatterns.length > 0 ? grammarPatterns : ["Conversational English"],
    suggestedPractice,
    improvedExpression,
    improvedExpressions: improvedExpressions.length > 0 ? improvedExpressions : (improvedExpression ? [improvedExpression] : []),
    promptVersion: SUMMARY_PROMPT_VERSION,
  };

  return {
    valid: true,
    isValid: true,
    summary: summaryData,
    data: summaryData,
  };
}

/**
 * High-speed contextual conversational fallback catalog.
 * Guarantees immediate (<10ms) responses in all supported languages when
 * local CPU-bound Ollama model is processing slowly or timed out.
 */
const MULTILINGUAL_REPLIES = {
  gu: {
    greetings: [
      {
        reply: "નમસ્તે! તમારી સાથે વાતચીત કરીને ઘણો આનંદ થયો. તમે આજે શું નવું શીખી રહ્યા છો?",
        followUpQuestion: "તમારો આજનો દિવસ કેવો રહ્યો?",
        usefulPhrase: "ઘણો આનંદ થયો (Pleased to talk with you)",
      },
      {
        reply: "નમસ્તે! શૅડોલીમાં તમારું હાર્દિક સ્વાગત છે.",
        followUpQuestion: "આજે તમે કયા વિષય પર વાત કરવા માંગો છો?",
        usefulPhrase: "હાર્દિક સ્વાગત (Warm welcome)",
      },
    ],
    general: [
      {
        reply: "ખૂબ સરસ! તમારી વાત સાંભળીને ઘણું સારું લાગ્યું. તમે ગુજરાતીમાં ખૂબ સરસ અભ્યાસ કરી રહ્યા છો.",
        followUpQuestion: "તમે આ વિશે વધુ થોડું કહી શકો છો?",
        usefulPhrase: "ખૂબ સરસ (Very well done)",
      },
      {
        reply: "હું તમારી વાત પૂરી રીતે સમજી શકું છું. આ એક ખૂબ જ રસપ્રદ અને મહત્વનો મુદ્દો છે.",
        followUpQuestion: "તમને આ બાબતમાં સૌથી વધુ શું પસંદ છે?",
        usefulPhrase: "રસપ્રદ મુદ્દો (Interesting topic)",
      },
      {
        reply: "ચોક્કસ! આ રીતે નિયમિત વાતચીત કરવાથી તમારી ભાષાની કુશળતા ખૂબ ઝડપથી વધશે.",
        followUpQuestion: "આગળ આ બાબતે તમારો શું વિચાર છે?",
        usefulPhrase: "નિયમિત વાતચીત (Regular practice)",
      },
    ],
  },
  hi: {
    greetings: [
      {
        reply: "नमस्ते! आपसे बातचीत करके बहुत अच्छा लगा। आज आप किस विषय पर बात करना चाहते हैं?",
        followUpQuestion: "आपका आज का दिन कैसा बीता?",
        usefulPhrase: "बातचीत करके अच्छा लगा (Nice talking to you)",
      },
    ],
    general: [
      {
        reply: "बहुत बढ़िया! आपका यह विचार बहुत दिलचस्प है। आप बहुत अच्छा अभ्यास कर रहे हैं।",
        followUpQuestion: "क्या आप इसके बारे में थोड़ा और विस्तार से बता सकते हैं?",
        usefulPhrase: "बहुत बढ़िया (Very good)",
      },
      {
        reply: "मैं आपकी बात पूरी तरह समझ गया। यह बातचीत करने के लिए एक शानदार विषय है।",
        followUpQuestion: "आपको इसमें सबसे ज्यादा क्या पसंद है?",
        usefulPhrase: "शानदार विषय (Wonderful topic)",
      },
    ],
  },
  es: {
    greetings: [
      {
        reply: "¡Hola! Qué gusto saludarte hoy. Me alegra mucho poder practicar contigo.",
        followUpQuestion: "¿De qué te gustaría hablar hoy?",
        usefulPhrase: "Qué gusto saludarte (Nice to greet you)",
      },
    ],
    general: [
      {
        reply: "¡Excelente! Me parece un tema muy interesante y te estás expresando muy bien.",
        followUpQuestion: "¿Puedes contarme un poco más sobre eso?",
        usefulPhrase: "Me parece interesante (I find it interesting)",
      },
      {
        reply: "Entiendo perfectamente tu punto. Es una gran forma de seguir practicando con fluidez.",
        followUpQuestion: "¿Qué opinas al respecto?",
        usefulPhrase: "Seguir practicando (Keep practicing)",
      },
    ],
  },
  fr: {
    greetings: [
      {
        reply: "Bonjour ! C'est un réel plaisir d'échanger avec toi aujourd'hui.",
        followUpQuestion: "De quoi aimerais-tu discuter aujourd'hui ?",
        usefulPhrase: "Un réel plaisir (A real pleasure)",
      },
    ],
    general: [
      {
        reply: "C'est une excellente réflexion ! Tu t'exprimes avec beaucoup de clarté.",
        followUpQuestion: "Peux-tu m'en dire un peu plus à ce sujet ?",
        usefulPhrase: "Avec beaucoup de clarté (Very clearly)",
      },
    ],
  },
  de: {
    greetings: [
      {
        reply: "Hallo! Es ist schön, heute mit dir zu sprechen. Wie kann ich dir helfen?",
        followUpQuestion: "Worüber möchtest du heute sprechen?",
        usefulPhrase: "Schön mit dir zu sprechen (Nice talking with you)",
      },
    ],
    general: [
      {
        reply: "Das ist sehr interessant! Du machst wirklich tolle Fortschritte beim Sprechen.",
        followUpQuestion: "Kannst du mir etwas mehr darüber erzählen?",
        usefulPhrase: "Tolle Fortschritte (Great progress)",
      },
    ],
  },
  en: {
    greetings: [
      {
        reply: "Hi there! It is wonderful to chat with you today. What is on your mind?",
        followUpQuestion: "How has your day been going so far?",
        usefulPhrase: "wonderful to chat (great talking together)",
      },
    ],
    general: [
      {
        reply: "That is a really thoughtful point! You are expressing your ideas very clearly.",
        followUpQuestion: "Could you tell me a little more about your perspective on that?",
        usefulPhrase: "thoughtful point (insightful observation)",
      },
      {
        reply: "I completely understand what you mean. Practicing this way builds great fluency.",
        followUpQuestion: "What do you enjoy most about this topic?",
        usefulPhrase: "builds fluency (improves natural flow)",
      },
    ],
  },
};

/**
 * Detects explicit educational, vocabulary, translation, or instructional queries from learners.
 * When learners ask "how should i say hi in gujrati", "how to say thank you", "teach me basics",
 * this returns an immediate, authentic pedagogical answer with native script, transliteration, and practical usage.
 * 
 * @param {string} userMessage - Raw message from learner
 * @param {string} language - Target language ID ('gu', 'hi', 'es', 'fr', 'de', 'en')
 * @returns {Object|null} Formatted conversational tutor response or null if not an explicit learning query
 */
export function detectEducationalIntent(userMessage = "", language = "en") {
  const lowerMsg = (userMessage || "").toLowerCase().trim();
  if (!lowerMsg) return null;

  const targetLang = language || "en";

  // 1. Direct instruction: How to say hi / hello / greeting
  const isGreetingQuery =
    lowerMsg.includes("say hi") ||
    lowerMsg.includes("say hello") ||
    lowerMsg.includes("how to greet") ||
    lowerMsg.includes("greeting in") ||
    lowerMsg.includes("what is hi in") ||
    lowerMsg.includes("what is hello in") ||
    /\bhi in\b/.test(lowerMsg) ||
    /\bhello in\b/.test(lowerMsg) ||
    (lowerMsg.includes("how") && (/\bhi\b/.test(lowerMsg) || /\bhello\b/.test(lowerMsg) || lowerMsg.includes("greet"))) ||
    (lowerMsg.includes("say") && (/\bhi\b/.test(lowerMsg) || /\bhello\b/.test(lowerMsg) || /\bhey\b/.test(lowerMsg)));

  if (isGreetingQuery) {
    if (targetLang === "gu") {
      return {
        reply: "In Gujarati, you can say 'નમસ્તે' (Namaste) or 'કેમ છો' (Kem chho) to say hi or hello. In traditional Gujarati culture, people also warmly greet with 'જય શ્રી કૃષ્ણ' (Jai Shri Krishna)!",
        corrections: [],
        usefulPhrase: "નમસ્તે / કેમ છો (Namaste / Kem chho)",
        followUpQuestion: "Try practicing! Type or say 'નમસ્તે' or 'કેમ છો' to reply.",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "In Hindi, you can say 'नमस्ते' (Namaste) or 'नमस्कार' (Namaskar) to say hi or hello. You can also say 'नमस्ते, आप कैसे हैं?' (Namaste, aap kaise hain?) for 'Hello, how are you?'.",
        corrections: [],
        usefulPhrase: "नमस्ते (Namaste - Hello)",
        followUpQuestion: "Try practicing! Type or say 'नमस्ते' to reply.",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "es") {
      return {
        reply: "In Spanish, you say '¡Hola!' to say hi or hello. In the morning, you can say '¡Buenos días!', and in the afternoon '¡Buenas tardes!'!",
        corrections: [],
        usefulPhrase: "¡Hola! (Hello!)",
        followUpQuestion: "¿Puedes escribir '¡Hola!' para practicar?",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "fr") {
      return {
        reply: "In French, you say 'Bonjour' (formal/general) or 'Salut' (informal) to say hi!",
        corrections: [],
        usefulPhrase: "Bonjour / Salut (Hello / Hi)",
        followUpQuestion: "Peux-tu essayer d'écrire 'Bonjour' ?",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "de") {
      return {
        reply: "In German, you say 'Hallo' or 'Guten Tag' to say hi or hello!",
        corrections: [],
        usefulPhrase: "Hallo (Hello)",
        followUpQuestion: "Kannst du 'Hallo' schreiben?",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "en") {
      return {
        reply: "In English, you can say 'Hello!', 'Hi there!', or 'Good morning/afternoon!' depending on the context.",
        corrections: [],
        usefulPhrase: "Hello! / Hi there! (Friendly greeting)",
        followUpQuestion: "How would you like to start our conversation today?",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 2. Good Morning / Afternoon / Evening / Night
  const isTimeOfDayGreeting =
    lowerMsg.includes("good morning") ||
    lowerMsg.includes("good evening") ||
    lowerMsg.includes("good night") ||
    lowerMsg.includes("good afternoon");

  if (isTimeOfDayGreeting) {
    const isNight = lowerMsg.includes("night");
    const isEvening = lowerMsg.includes("evening");
    if (targetLang === "gu") {
      const phrase = isNight
        ? "શુભ રાત્રિ (Shubh raatri - Good night)"
        : isEvening
        ? "શુભ સાંજ (Shubh saanj - Good evening)"
        : "સુપ્રભાત / શુભ સવાર (Suprabhaat / Shubh savaar - Good morning)";
      return {
        reply: `In Gujarati, ${isNight ? "'Good night' is 'શુભ રાત્રિ' (Shubh raatri)" : isEvening ? "'Good evening' is 'શુભ સાંજ' (Shubh saanj)" : "'Good morning' is 'સુપ્રભાત' (Suprabhaat) or 'શુભ સવાર' (Shubh savaar)"}.`,
        corrections: [],
        usefulPhrase: phrase,
        followUpQuestion: `Try typing '${isNight ? "શુભ રાત્રિ" : "શુભ સવાર"}' to practice!`,
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      const phrase = isNight
        ? "शुभ रात्रि (Shubh raatri - Good night)"
        : "सुप्रभात (Suprabhat - Good morning)";
      return {
        reply: `In Hindi, ${isNight ? "'Good night' is 'शुभ रात्रि' (Shubh raatri)" : "'Good morning' is 'सुप्रभात' (Suprabhat) or 'शुभ प्रभात' (Shubh prabhat)"}.`,
        corrections: [],
        usefulPhrase: phrase,
        followUpQuestion: `Try typing '${isNight ? "शुभ रात्रि" : "सुप्रभात"}' to practice!`,
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "es") {
      const phrase = isNight ? "¡Buenas noches! (Good night!)" : "¡Buenos días! (Good morning!)";
      return {
        reply: `In Spanish, ${isNight ? "'Good night' is '¡Buenas noches!'" : "'Good morning' is '¡Buenos días!'"}.`,
        corrections: [],
        usefulPhrase: phrase,
        followUpQuestion: `Try typing '${isNight ? "¡Buenas noches!" : "¡Buenos días!"}'!`,
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 3. Thank you / Gratitude
  const isThankQuery =
    lowerMsg.includes("thank") ||
    lowerMsg.includes("thanks") ||
    lowerMsg.includes("dhanyavad") ||
    lowerMsg.includes("aabhar");

  if (isThankQuery) {
    if (targetLang === "gu") {
      return {
        reply: "To say thank you in Gujarati, say 'આભાર' (Aabhaar) or 'ધન્યવાદ' (Dhanyavaad). For 'thank you very much', say 'તમારો ખૂબ ખૂબ આભાર' (Tamaro khoob khoob aabhaar)!",
        corrections: [],
        usefulPhrase: "તમારો ખૂબ ખૂબ આભાર (Thank you very much)",
        followUpQuestion: "Try practicing: type 'તમારો આભાર' (Thank you)!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "In Hindi, to say thank you, say 'धन्यवाद' (Dhanyavaad) or 'शुक्रिया' (Shukriya). For 'thank you very much', say 'बहुत-बहुत धन्यवाद' (Bahut-bahut dhanyavaad)!",
        corrections: [],
        usefulPhrase: "धन्यवाद (Thank you)",
        followUpQuestion: "Try typing: 'बहुत-बहुत धन्यवाद'!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "es") {
      return {
        reply: "In Spanish, you say 'Gracias' or 'Muchas gracias' (Thank you very much) to say thank you!",
        corrections: [],
        usefulPhrase: "Muchas gracias (Thank you very much)",
        followUpQuestion: "Try typing: '¡Muchas gracias!'",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "fr") {
      return {
        reply: "In French, you say 'Merci' or 'Merci beaucoup' (Thank you very much) to say thank you!",
        corrections: [],
        usefulPhrase: "Merci beaucoup (Thank you very much)",
        followUpQuestion: "Try typing: 'Merci beaucoup !'",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "de") {
      return {
        reply: "In German, you say 'Danke' or 'Vielen Dank' (Thank you very much) to say thank you!",
        corrections: [],
        usefulPhrase: "Vielen Dank (Thank you very much)",
        followUpQuestion: "Try typing: 'Vielen Dank!'",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 4. How are you / Asking well-being
  const isHowAreYouQuery =
    lowerMsg.includes("how are you") ||
    lowerMsg.includes("how r u") ||
    lowerMsg.includes("how do you say how are you") ||
    lowerMsg.includes("say how are you") ||
    lowerMsg.includes("kem cho") ||
    lowerMsg.includes("kem chho") ||
    lowerMsg.includes("kaise ho");

  if (isHowAreYouQuery) {
    if (targetLang === "gu") {
      return {
        reply: "In Gujarati, to ask 'How are you?', say 'તમે કેમ છો?' (Tame kem chho?) for polite/formal, or 'તું કેમ છે?' (Tu kem chhe?) for friends. To answer 'I am fine', say 'હું મજામાં છું' (Hu majaamaa chhu)!",
        corrections: [],
        usefulPhrase: "તમે કેમ છો? / હું મજામાં છું (How are you? / I am fine)",
        followUpQuestion: "તમે કેમ છો? (How are you? Try typing: 'હું મજામાં છું')",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "In Hindi, to ask 'How are you?', say 'आप कैसे हैं?' (Aap kaise hain?) for polite/formal, or 'तुम कैसे हो?' (Tum kaise ho?). To answer 'I am fine', say 'मैं ठीक हूँ' (Main theek hoon)!",
        corrections: [],
        usefulPhrase: "आप कैसे हैं? (How are you?)",
        followUpQuestion: "आप कैसे हैं? (Try typing: 'मैं ठीक हूँ')",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "es") {
      return {
        reply: "In Spanish, to ask 'How are you?', say '¿Cómo estás?' (informal) or '¿Cómo está usted?' (formal). To answer 'I am fine', say 'Estoy bien, gracias'!",
        corrections: [],
        usefulPhrase: "¿Cómo estás? (How are you?)",
        followUpQuestion: "¿Cómo estás hoy? (Try typing: 'Estoy bien')",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 5. Goodbye / Farewell
  const isGoodbyeQuery =
    /(good\s*bye|\bbye\b|farewell|see\s*you|aavjo|alvida|au\s*revoir|adios|tschuess)/i.test(lowerMsg);

  if (isGoodbyeQuery) {
    if (targetLang === "gu") {
      return {
        reply: "In Gujarati, you say 'આવજો' (Aavjo) to say goodbye! In traditional respectful Gujarati, you can also say 'ફરી મળીશું' (Fari malishu), which means 'see you again'!",
        corrections: [],
        usefulPhrase: "આવજો / ફરી મળીશું (Goodbye / See you again)",
        followUpQuestion: "Try practicing! Type or say 'આવજો' (Aavjo) to reply.",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "In Hindi, you say 'अलविदा' (Alvida) or 'फिर मिलेंगे' (Phir milenge - see you again) to say goodbye!",
        corrections: [],
        usefulPhrase: "अलविदा / फिर मिलेंगे (Goodbye / See you again)",
        followUpQuestion: "Try typing: 'फिर मिलेंगे'!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "es") {
      return {
        reply: "In Spanish, you say '¡Adiós!' or '¡Hasta luego!' (See you later) to say goodbye!",
        corrections: [],
        usefulPhrase: "¡Hasta luego! (See you later!)",
        followUpQuestion: "Try typing: '¡Hasta luego!'",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 6. Introductions / What is your name / My name is
  const isNameQuery =
    lowerMsg.includes("your name") ||
    lowerMsg.includes("who are you") ||
    lowerMsg.includes("my name") ||
    lowerMsg.includes("introduce myself") ||
    lowerMsg.includes("what is name in");

  if (isNameQuery) {
    if (targetLang === "gu") {
      return {
        reply: "In Gujarati, to ask someone's name, say 'તમારું નામ શું છે?' (Tamaru naam shu chhe?). To say 'My name is...', say 'મારું નામ [નામ] છે' (Maaru naam ... chhe). My name is Shadowly Tutor!",
        corrections: [],
        usefulPhrase: "મારું નામ ... છે (My name is ...)",
        followUpQuestion: "તમારું નામ શું છે? (What is your name? Try typing: 'મારું નામ [Your Name] છે')",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "In Hindi, to ask 'What is your name?', say 'आपका नाम क्या है?' (Aapka naam kya hai?). To answer, say 'मेरा नाम [नाम] है' (Mera naam ... hai).",
        corrections: [],
        usefulPhrase: "मेरा नाम ... है (My name is ...)",
        followUpQuestion: "आपका नाम क्या है? (Try typing: 'मेरा नाम [Your Name] है')",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "es") {
      return {
        reply: "In Spanish, to ask 'What is your name?', say '¿Cómo te llamas?'. To answer, say 'Me llamo [nombre]' (My name is...)!",
        corrections: [],
        usefulPhrase: "Me llamo ... (My name is ...)",
        followUpQuestion: "¿Cómo te llamas? (Try typing: 'Me llamo...')",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 7. Water / Food / Drink / Hungry / Tea
  const isWaterQuery = lowerMsg.includes("water") || lowerMsg.includes("drink") || lowerMsg.includes("thirsty") || lowerMsg.includes("paani");
  if (isWaterQuery) {
    if (targetLang === "gu") {
      return {
        reply: "In Gujarati, water is called 'પાણી' (Paani). To say 'I want water', say 'મને પાણી જોઈએ છે' (Mane paani joie chhe). To say 'Please give me water', say 'મને પાણી આપો' (Mane paani aapo).",
        corrections: [],
        usefulPhrase: "મને પાણી આપો (Please give me water)",
        followUpQuestion: "Try practicing: type 'મને પાણી જોઈએ છે'!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "In Hindi, water is called 'पानी' (Paani). To say 'I want water', say 'मुझे पानी चाहिए' (Mujhe paani chahiye).",
        corrections: [],
        usefulPhrase: "मुझे पानी चाहिए (I want water)",
        followUpQuestion: "Try typing: 'मुझे पानी चाहिए'!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  const isFoodQuery = lowerMsg.includes("food") || lowerMsg.includes("eat") || lowerMsg.includes("hungry") || lowerMsg.includes("dinner") || lowerMsg.includes("lunch");
  if (isFoodQuery) {
    if (targetLang === "gu") {
      return {
        reply: "In Gujarati, food is 'જમવાનું' (Jamvaanu). To say 'I am hungry', say 'મને ભૂખ લાગી છે' (Mane bhookh laagi chhe). To say 'Let's eat', say 'ચાલો જમીએ' (Chaalo jamie)!",
        corrections: [],
        usefulPhrase: "મને ભૂખ લાગી છે (I am hungry)",
        followUpQuestion: "તમને ગુજરાતી જમવાનું ગમે છે? (Do you like Gujarati food?)",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "In Hindi, food is 'खाना' (Khaana). To say 'I am hungry', say 'मुझे भूख लगी है' (Mujhe bhookh lagi hai).",
        corrections: [],
        usefulPhrase: "मुझे भूख लगी है (I am hungry)",
        followUpQuestion: "Try typing: 'मुझे भूख लगी है'!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 8. Please / Sorry / Excuse me
  const isPoliteQuery =
    lowerMsg.includes("please") ||
    lowerMsg.includes("sorry") ||
    lowerMsg.includes("excuse me") ||
    lowerMsg.includes("welcome");

  if (isPoliteQuery) {
    if (targetLang === "gu") {
      return {
        reply: "In Gujarati, 'Please' is 'કૃપા કરીને' (Krupa karine). 'Sorry / Excuse me' is 'માફ કરશો' (Maaf karsho). 'You are welcome' is 'તમારું સ્વાગત છે' (Tamaru svaagat chhe) or 'કંઈ વાંધો નહીં' (No problem)!",
        corrections: [],
        usefulPhrase: "માફ કરશો / કૃપા કરીને (Excuse me / Please)",
        followUpQuestion: "Try typing: 'માફ કરશો' (Sorry / Excuse me)!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "In Hindi, 'Please' is 'कृपया' (Kripya). 'Sorry' is 'माफ़ कीजिए' (Maaf kijiye). 'You are welcome' is 'आपका स्वागत है' (Aapka swagat hai)!",
        corrections: [],
        usefulPhrase: "कृपया / माफ़ कीजिए (Please / Sorry)",
        followUpQuestion: "Try typing: 'माफ़ कीजिए'!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 9. Yes / No / Okay
  const isYesNoQuery =
    (lowerMsg.includes("yes") && lowerMsg.includes("no")) ||
    lowerMsg.includes("how to say yes") ||
    lowerMsg.includes("how to say no");

  if (isYesNoQuery) {
    if (targetLang === "gu") {
      return {
        reply: "In Gujarati, 'Yes' is 'હા' (Haa) and 'No' is 'ના' (Naa). For 'Okay' or 'Alright', you say 'સારું' (Saaru) or 'બરાબર' (Baraabar)!",
        corrections: [],
        usefulPhrase: "હા / ના / સારું (Yes / No / Okay)",
        followUpQuestion: "Try typing 'હા' (Yes) or 'સારું' (Okay)!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "In Hindi, 'Yes' is 'हाँ' (Haan) and 'No' is 'नहीं' (Nahi). 'Okay' is 'ठीक है' (Theek hai)!",
        corrections: [],
        usefulPhrase: "हाँ / नहीं / ठीक है (Yes / No / Okay)",
        followUpQuestion: "Try typing 'हाँ' or 'ठीक है'!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 10. Counting / Numbers
  const isNumbersQuery =
    lowerMsg.includes("count") ||
    lowerMsg.includes("number") ||
    lowerMsg.includes("1 to 5") ||
    lowerMsg.includes("1 to 10") ||
    lowerMsg.includes("one two");

  if (isNumbersQuery) {
    if (targetLang === "gu") {
      return {
        reply: "Here is how to count 1 to 5 in Gujarati: 1 = એક (Ek), 2 = બે (Be), 3 = ત્રણ (Tran), 4 = ચાર (Chaar), 5 = પાંચ (Paanch)!",
        corrections: [],
        usefulPhrase: "એક, બે, ત્રણ, ચાર, પાંચ (1, 2, 3, 4, 5)",
        followUpQuestion: "Can you practice typing 'એક, બે, ત્રણ' (1, 2, 3)?",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "Here is how to count 1 to 5 in Hindi: 1 = एक (Ek), 2 = दो (Do), 3 = तीन (Teen), 4 = चार (Chaar), 5 = पाँच (Paanch)!",
        corrections: [],
        usefulPhrase: "एक, दो, तीन, चार, पाँच (1, 2, 3, 4, 5)",
        followUpQuestion: "Can you practice typing 'एक, दो, तीन' (1, 2, 3)?",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 11. General "Teach me / Beginner basics"
  const isTeachMeQuery =
    lowerMsg.includes("teach me") ||
    lowerMsg.includes("start learning") ||
    lowerMsg.includes("basics") ||
    lowerMsg.includes("basic words") ||
    lowerMsg.includes("where do i start") ||
    lowerMsg.includes("how to learn") ||
    lowerMsg.includes("how to speak");

  if (isTeachMeQuery) {
    if (targetLang === "gu") {
      return {
        reply: "Welcome to learning Gujarati! Here are 5 essential starter phrases: 1) 'નમસ્તે' (Namaste - Hello), 2) 'કેમ છો?' (Kem chho? - How are you?), 3) 'હું મજામાં છું' (Hu majaamaa chhu - I am fine), 4) 'આભાર' (Aabhaar - Thank you), 5) 'આવજો' (Aavjo - Goodbye)!",
        corrections: [],
        usefulPhrase: "ગુજરાતી શીખવું (Learning Gujarati)",
        followUpQuestion: "Which phrase would you like to practice first? Try replying with 'નમસ્તે'!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "Welcome to learning Hindi! Here are 5 essential starter phrases: 1) 'नमस्ते' (Namaste - Hello), 2) 'आप कैसे हैं?' (Aap kaise hain? - How are you?), 3) 'मैं ठीक हूँ' (Main theek hoon - I am fine), 4) 'धन्यवाद' (Dhanyavaad - Thank you), 5) 'अलविदा' (Alvida - Goodbye)!",
        corrections: [],
        usefulPhrase: "हिंदी सीखना (Learning Hindi)",
        followUpQuestion: "Which phrase would you like to practice first? Try typing 'नमस्ते'!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "es") {
      return {
        reply: "¡Bienvenido! Here are 5 essential Spanish starter phrases: 1) '¡Hola!' (Hello), 2) '¿Cómo estás?' (How are you?), 3) 'Bien, gracias' (Good, thank you), 4) 'Por favor' (Please), 5) '¡Adiós!' (Goodbye)!",
        corrections: [],
        usefulPhrase: "Aprender español (Learning Spanish)",
        followUpQuestion: "¿Cuál quieres practicar primero? ¡Escribe '¡Hola!'!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 12. Welcome / You're welcome
  const isWelcomeQuery = /(welcome|you('?re)?\s*welcome|de\s*nada|svagat)/i.test(lowerMsg);
  if (isWelcomeQuery) {
    if (targetLang === "gu") {
      return {
        reply: "In Gujarati, to welcome someone say 'તમારું હાર્દિક સ્વાગત છે' (Tamaru haardik svaagat chhe). To say 'You're welcome' in response to thank you, say 'કંઈ વાંધો નહીં' (Kan-i vaandho nahi - no problem) or 'તમારું સ્વાગત છે'!",
        corrections: [],
        usefulPhrase: "તમારું સ્વાગત છે (Welcome / You're welcome)",
        followUpQuestion: "Try practicing: type 'તમારું સ્વાગત છે'!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "In Hindi, to say 'Welcome', say 'आपका स्वागत है' (Aapka swagat hai). To reply to thank you, you can say 'कोई बात नहीं' (Koi baat nahi) or 'आपका स्वागत है'!",
        corrections: [],
        usefulPhrase: "आपका स्वागत है (You are welcome)",
        followUpQuestion: "Try typing: 'आपका स्वागत है'!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 13. Help / Assistance
  const isHelpQuery = /(help|can\s*you\s*help|assist|madad)/i.test(lowerMsg);
  if (isHelpQuery) {
    if (targetLang === "gu") {
      return {
        reply: "In Gujarati, to ask for help say 'મને મદદ કરશો?' (Mane madad karsho? - Will you help me?) or 'મને મદદ જોઈએ છે' (Mane madad joie chhe - I need help). I am always here to help you practice!",
        corrections: [],
        usefulPhrase: "મને મદદ કરશો? (Will you help me?)",
        followUpQuestion: "તમને કયા વિષય પર મદદ જોઈએ છે? (What would you like help with?)",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "In Hindi, to ask for help say 'मेरी मदद कीजिए' (Meri madad kijiye) or 'क्या आप मेरी मदद कर सकते हैं?' (Can you help me?). मैं आपकी पूरी मदद करूँगा!",
        corrections: [],
        usefulPhrase: "मेरी मदद कीजिए (Please help me)",
        followUpQuestion: "आपको किस चीज़ में मदद चाहिए?",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 14. Tea / Chai / Coffee
  const isTeaQuery = /(\btea\b|\bchai\b|\bchaa\b|\bcoffee\b)/i.test(lowerMsg);
  if (isTeaQuery) {
    if (targetLang === "gu") {
      return {
        reply: "In Gujarati, tea is called 'ચા' (Chaa). To say 'I want tea', say 'મને ચા જોઈએ છે' (Mane chaa joie chhe). To invite someone: 'ચાલો ચા પીવા જઈએ' (Chaalo chaa peeva jaie - Let's go drink tea)!",
        corrections: [],
        usefulPhrase: "મને ચા જોઈએ છે (I want tea)",
        followUpQuestion: "તમને ચા ગમે છે? (Do you like tea?)",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
    if (targetLang === "hi") {
      return {
        reply: "In Hindi, tea is 'चाय' (Chai). To say 'I want tea', say 'मुझे चाय चाहिए' (Mujhe chai chahiye).",
        corrections: [],
        usefulPhrase: "मुझे चाय चाहिए (I want tea)",
        followUpQuestion: "क्या आपको चाय पसंद है?",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  // 15. Generic "How can I say [word]" / Question extractor
  const genericHowSayMatch = lowerMsg.match(/(?:how\s+(?:can|do|should)\s+i\s+say|how\s+to\s+say|what\s+is\s+the\s+word\s+for|what\s+is)\s+([^?.]+)/i);
  if (genericHowSayMatch) {
    const rawTarget = genericHowSayMatch[1].replace(/(in\s+(?:gujrati|gujarati|hindi|spanish|french|german|english)|please)/gi, "").trim();
    if (rawTarget && targetLang === "gu") {
      return {
        reply: `In Gujarati, expressions like '${rawTarget}' are great to practice! Let's practice saying common everyday words like 'નમસ્તે' (Hello), 'આવજો' (Goodbye), or 'આભાર' (Thank you).`,
        corrections: [],
        usefulPhrase: "ગુજરાતી અભ્યાસ (Gujarati practice)",
        followUpQuestion: "Try practicing: type 'નમસ્તે' or 'આવજો' to continue!",
        promptVersion: CONVERSATION_PROMPT_VERSION,
      };
    }
  }

  return null;
}

export function getMultilingualContextualReply({
  scenarioId = "free",
  language = "en",
  level = "intermediate",
  userMessage = "",
} = {}) {
  // Check for explicit educational intent first
  const educationalReply = detectEducationalIntent(userMessage, language);
  if (educationalReply) {
    return educationalReply;
  }

  const lowerMsg = (userMessage || "").toLowerCase().trim();

  // If the user asked a question in Gujarati mode, offer an educational prompt instead of generic agreement
  const isQuestion =
    lowerMsg.includes("?") ||
    lowerMsg.startsWith("how") ||
    lowerMsg.startsWith("what") ||
    lowerMsg.startsWith("can") ||
    lowerMsg.startsWith("and how");

  if (isQuestion && language === "gu") {
    return {
      reply: "ગુજરાતી શીખવા માટે પ્રશ્નો પૂછવા એ શ્રેષ્ઠ રીત છે! તમે 'નમસ્તે' (હેલો), 'આવજો' (ગુડ બાય), કે 'તમે કેમ છો?' (કેમ છો) જેવા વાક્યોથી શરૂ કરી શકો છો.",
      corrections: [],
      usefulPhrase: "નવા શબ્દો શીખવા (Learning new words)",
      followUpQuestion: "આમાંથી તમે કયો શબ્દ બોલવા કે લખવા માંગો છો?",
      promptVersion: CONVERSATION_PROMPT_VERSION,
    };
  }

  // General fallback pool
  const langKey = MULTILINGUAL_REPLIES[language] ? language : "en";
  const catalog = MULTILINGUAL_REPLIES[langKey];

  const isGreeting =
    lowerMsg === "hi" ||
    lowerMsg === "hello" ||
    lowerMsg.includes("નમસ્તે") ||
    lowerMsg.includes("kem cho") ||
    lowerMsg.includes("kem chho") ||
    lowerMsg.includes("કેમ છો") ||
    lowerMsg.includes("नमस्ते") ||
    lowerMsg.includes("hola") ||
    lowerMsg.includes("bonjour") ||
    lowerMsg.includes("hallo");

  const pool = isGreeting && catalog.greetings ? catalog.greetings : catalog.general;
  const pick = pool[Math.floor(Math.random() * pool.length)] || catalog.general[0];

  return {
    reply: pick.reply,
    corrections: [],
    usefulPhrase: pick.usefulPhrase || null,
    followUpQuestion: pick.followUpQuestion || null,
    promptVersion: CONVERSATION_PROMPT_VERSION,
  };
}

