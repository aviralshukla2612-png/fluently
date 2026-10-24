import { normalizeText } from "./normalizeText.js";

/**
 * Unicode-aware regex matching word tokens:
 * - \p{L}: any Unicode letter (including Latin accents like é, ü, ç, etc.)
 * - \p{N}: any numeric character
 * - Allows internal apostrophes or hyphens for contractions and compounds (e.g. don't, mother-in-law)
 */
const WORD_TOKEN_REGEX = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

/**
 * Tokenizes text into an array of clean word tokens.
 * 
 * @param {string} text - Raw input string
 * @param {Object} [options]
 * @param {boolean} [options.caseSensitive=false] - Case sensitivity flag
 * @returns {Array<{ text: string, raw: string, index: number }>}
 */
export function tokenize(text, options = {}) {
  if (typeof text !== "string" || !text.trim()) {
    return [];
  }

  const normalized = normalizeText(text, options);
  if (!normalized) {
    return [];
  }

  const tokens = [];
  const matches = normalized.matchAll(WORD_TOKEN_REGEX);

  let index = 0;
  for (const match of matches) {
    const word = match[0];
    if (word) {
      tokens.push({
        text: word,
        raw: word,
        index: index++,
      });
    }
  }

  return tokens;
}

/**
 * Convenience helper returning token text strings only.
 * 
 * @param {string} text
 * @param {Object} [options]
 * @returns {string[]}
 */
export function tokenizeToStrings(text, options = {}) {
  return tokenize(text, options).map((t) => t.text);
}
