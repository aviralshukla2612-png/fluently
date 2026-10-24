/**
 * Text Normalization Module
 * Pure functions for cleaning and preparing text for deterministic comparison.
 */

// Common typographical apostrophes to map to standard ASCII single quote
const APOSTROPHE_REGEX = /[\u2019\u2018\u02BC\u02B9`´]/g;

// Punctuation to strip from token boundaries (Unicode-aware, preserves internal apostrophes)
const LEADING_TRAILING_PUNCTUATION_REGEX = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

/**
 * Normalizes text for comparison without altering the original display text.
 * 
 * Rules:
 * 1. Normalize Unicode text using canonical composition (NFC).
 * 2. Trim leading/trailing whitespace and collapse consecutive whitespace to a single space.
 * 3. Standardize typographical quotes/apostrophes to ASCII single quote (').
 * 4. Lowercase string by default for case-insensitive matching.
 * 
 * @param {string} text - Raw input string
 * @param {Object} [options]
 * @param {boolean} [options.caseSensitive=false] - Whether to preserve casing
 * @returns {string} Normalized string
 */
export function normalizeText(text, options = {}) {
  if (typeof text !== "string") {
    return "";
  }

  // 1. Unicode NFC normalization
  let normalized = text.normalize("NFC");

  // 2. Standardize quotation marks & apostrophes (e.g. ’ -> ')
  normalized = normalized.replace(APOSTROPHE_REGEX, "'");

  // 3. Case normalization
  if (!options.caseSensitive) {
    normalized = normalized.toLowerCase();
  }

  // 4. Collapse whitespace
  normalized = normalized.trim().replace(/\s+/g, " ");

  return normalized;
}

/**
 * Strips leading/trailing punctuation from a word token while preserving
 * internal letters, numbers, and contractions (e.g., "hello," -> "hello", "don't." -> "don't").
 * 
 * @param {string} token
 * @returns {string} Clean token
 */
export function stripTokenPunctuation(token) {
  if (typeof token !== "string") return "";
  return token.replace(LEADING_TRAILING_PUNCTUATION_REGEX, "");
}
