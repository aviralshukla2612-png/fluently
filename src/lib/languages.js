/**
 * Shadowly — Supported Languages & Speech Configuration
 * Centralized registry of supported languages with BCP 47 locale mappings
 * for both Speech Recognition (STT) and Speech Synthesis (TTS).
 */

export const SUPPORTED_LANGUAGES = [
  {
    id: "en",
    code: "en",
    name: "English",
    nativeName: "English",
    locale: "en-US",
    speechRecognitionLocale: "en-US",
    speechSynthesisLocale: "en-US",
    flag: "🇺🇸",
    sampleText: "Hello! Welcome to Fluently. How can I help you practice today?",
  },
  {
    id: "hi",
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    locale: "hi-IN",
    speechRecognitionLocale: "hi-IN",
    speechSynthesisLocale: "hi-IN",
    flag: "🇮🇳",
    sampleText: "नमस्ते! शैडोली में आपका स्वागत है। आज आप क्या अभ्यास करना चाहते हैं?",
  },
  {
    id: "gu",
    code: "gu",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    locale: "gu-IN",
    speechRecognitionLocale: "gu-IN",
    speechSynthesisLocale: "gu-IN",
    flag: "🇮🇳",
    sampleText: "નમસ્તે! શૅડોલીમાં તમારું સ્વાગત છે. આજે તમે શું વાત કરવા માંગો છો?",
  },
  {
    id: "es",
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    locale: "es-ES",
    speechRecognitionLocale: "es-ES",
    speechSynthesisLocale: "es-ES",
    flag: "🇪🇸",
    sampleText: "¡Hola! Bienvenido a Fluently. ¿De qué te gustaría hablar hoy?",
  },
  {
    id: "fr",
    code: "fr",
    name: "French",
    nativeName: "Français",
    locale: "fr-FR",
    speechRecognitionLocale: "fr-FR",
    speechSynthesisLocale: "fr-FR",
    flag: "🇫🇷",
    sampleText: "Bonjour ! Bienvenue sur Fluently. De quoi aimeriez-vous parler aujourd'hui ?",
  },
  {
    id: "de",
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    locale: "de-DE",
    speechRecognitionLocale: "de-DE",
    speechSynthesisLocale: "de-DE",
    flag: "🇩🇪",
    sampleText: "Hallo! Willkommen bei Fluently. Worüber möchtest du heute sprechen?",
  },
];

export const DEFAULT_LANGUAGE_ID = "en";
export const DEFAULT_LANGUAGE_CONFIG = SUPPORTED_LANGUAGES[0];

/**
 * Normalizes an arbitrary language string, id, or locale to a supported language ID.
 * Falls back to DEFAULT_LANGUAGE_ID ('en') if not recognized.
 *
 * @param {string} [idOrLocale]
 * @returns {string} Normalized language id (e.g. 'en', 'hi', 'gu')
 */
export function normalizeLanguageId(idOrLocale) {
  if (!idOrLocale || typeof idOrLocale !== "string") {
    return DEFAULT_LANGUAGE_ID;
  }

  const query = idOrLocale.trim().toLowerCase();

  // 1. Direct match on id or code
  const exact = SUPPORTED_LANGUAGES.find(
    (lang) => lang.id.toLowerCase() === query || lang.code.toLowerCase() === query
  );
  if (exact) return exact.id;

  // 2. Match on BCP 47 locale (e.g. 'hi-IN', 'en-US')
  const localeMatch = SUPPORTED_LANGUAGES.find(
    (lang) => lang.locale.toLowerCase() === query
  );
  if (localeMatch) return localeMatch.id;

  // 3. Match on primary language subtag (e.g. 'hi' from 'hi-in')
  const primarySubtag = query.split(/[-_]/)[0];
  const subtagMatch = SUPPORTED_LANGUAGES.find(
    (lang) => lang.id.toLowerCase() === primarySubtag || lang.code.toLowerCase() === primarySubtag
  );
  if (subtagMatch) return subtagMatch.id;

  // 4. Match on English name
  const nameMatch = SUPPORTED_LANGUAGES.find(
    (lang) => lang.name.toLowerCase() === query
  );
  if (nameMatch) return nameMatch.id;

  return DEFAULT_LANGUAGE_ID;
}

/**
 * Resolves full language configuration for a given ID or locale.
 * Always returns a valid language object (defaults to English).
 *
 * @param {string} [idOrLocale]
 * @returns {typeof SUPPORTED_LANGUAGES[0]}
 */
export function getLanguageConfig(idOrLocale) {
  const normalizedId = normalizeLanguageId(idOrLocale);
  return (
    SUPPORTED_LANGUAGES.find((lang) => lang.id === normalizedId) ||
    DEFAULT_LANGUAGE_CONFIG
  );
}

/**
 * Checks whether a language is supported.
 *
 * @param {string} [idOrLocale]
 * @returns {boolean}
 */
export function isLanguageSupported(idOrLocale) {
  if (!idOrLocale || typeof idOrLocale !== "string") return false;
  const query = idOrLocale.trim().toLowerCase();
  return SUPPORTED_LANGUAGES.some(
    (lang) =>
      lang.id.toLowerCase() === query ||
      lang.code.toLowerCase() === query ||
      lang.locale.toLowerCase() === query ||
      lang.name.toLowerCase() === query ||
      lang.id.toLowerCase() === query.split(/[-_]/)[0]
  );
}
