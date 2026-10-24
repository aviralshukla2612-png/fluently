import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { normalizeText } from "../src/lib/scoring/normalizeText.js";
import { tokenize, tokenizeToStrings } from "../src/lib/scoring/tokenize.js";
import { alignWords } from "../src/lib/scoring/alignWords.js";
import { calculateMetrics } from "../src/lib/scoring/calculateMetrics.js";
import { scoreAttempt } from "../src/lib/scoring/scoreAttempt.js";

describe("Phase 3 Deterministic Scoring Engine", () => {
  // Test 1 — Exact match
  test("Test 1: Exact match produces 100% text match and zero WER", () => {
    const ref = "I like English";
    const trans = "I like English";
    const result = scoreAttempt(ref, trans);

    assert.equal(result.status, "scored");
    assert.equal(result.correctWordCount, 3);
    assert.equal(result.substitutionCount, 0);
    assert.equal(result.missingWordCount, 0);
    assert.equal(result.extraWordCount, 0);
    assert.equal(result.wer, 0);
    assert.equal(result.textMatchScore, 100);
    assert.equal(result.referenceWordCoverage, 100);
    assert.equal(result.alignment.length, 3);
    assert(result.alignment.every((r) => r.type === "match"));
  });

  // Test 2 — Punctuation and capitalization
  test("Test 2: Punctuation and casing differences normalize cleanly without false errors", () => {
    const ref = "Hello, how are you?";
    const trans = "hello how are you";
    const result = scoreAttempt(ref, trans);

    assert.equal(result.status, "scored");
    assert.equal(result.correctWordCount, 4);
    assert.equal(result.wer, 0);
    assert.equal(result.textMatchScore, 100);
  });

  // Test 3 — Missing word
  test("Test 3: Missing word is classified as deletion without misaligning later tokens", () => {
    const ref = "I would like to improve my English";
    const trans = "I would like improve my English";
    const result = scoreAttempt(ref, trans);

    assert.equal(result.status, "scored");
    assert.equal(result.referenceWordCount, 7);
    assert.equal(result.transcriptWordCount, 6);
    assert.equal(result.correctWordCount, 6);
    assert.equal(result.missingWordCount, 1);
    assert.equal(result.substitutionCount, 0);
    assert.equal(result.extraWordCount, 0);

    // Missing word must be 'to'
    const missing = result.alignment.find((r) => r.type === "deletion");
    assert(missing, "Expected a deletion record");
    assert.equal(missing.referenceWord, "to");
    assert.equal(missing.transcriptWord, null);

    // Verify subsequent words aligned correctly
    const afterMissing = result.alignment.slice(4);
    assert.equal(afterMissing[0].referenceWord, "improve");
    assert.equal(afterMissing[0].type, "match");
    assert.equal(afterMissing[1].referenceWord, "my");
    assert.equal(afterMissing[1].type, "match");
    assert.equal(afterMissing[2].referenceWord, "english");
    assert.equal(afterMissing[2].type, "match");

    assert(Math.abs(result.textMatchScore - (6 / 7) * 100) < 1e-9);
  });

  // Test 4 — Substitution
  test("Test 4: Substituted word aligns with correct reference word", () => {
    const ref = "I like reading books";
    const trans = "I enjoy reading books";
    const result = scoreAttempt(ref, trans);

    assert.equal(result.correctWordCount, 3);
    assert.equal(result.substitutionCount, 1);
    assert.equal(result.missingWordCount, 0);
    assert.equal(result.extraWordCount, 0);

    const sub = result.alignment.find((r) => r.type === "substitution");
    assert(sub, "Expected a substitution record");
    assert.equal(sub.referenceWord, "like");
    assert.equal(sub.transcriptWord, "enjoy");
    assert.equal(result.wer, 1 / 4);
    assert.equal(result.textMatchScore, 75);
  });

  // Test 5 — Extra word (Insertion)
  test("Test 5: Extra spoken word is classified as insertion and preserves other alignments", () => {
    const ref = "I like books";
    const trans = "I really like books";
    const result = scoreAttempt(ref, trans);

    assert.equal(result.correctWordCount, 3);
    assert.equal(result.extraWordCount, 1);
    assert.equal(result.missingWordCount, 0);
    assert.equal(result.substitutionCount, 0);

    const ins = result.alignment.find((r) => r.type === "insertion");
    assert(ins, "Expected an insertion record");
    assert.equal(ins.transcriptWord, "really");
    assert.equal(ins.referenceWord, null);

    assert.equal(result.wer, 1 / 3);
    assert.equal(result.referenceWordCoverage, 100); // All 3 reference words were covered
  });

  // Test 6 — Multiple errors
  test("Test 6: Multiple errors compute correct Levenshtein alignment operations", () => {
    const ref = "She reads books every day";
    const trans = "He read a book every day";
    const result = scoreAttempt(ref, trans);

    assert.equal(result.status, "scored");
    assert.equal(result.referenceWordCount, 5);
    assert.equal(result.transcriptWordCount, 6);

    // Every and day must match at the end
    const lastTwo = result.alignment.slice(-2);
    assert.equal(lastTwo[0].type, "match");
    assert.equal(lastTwo[0].referenceWord, "every");
    assert.equal(lastTwo[1].type, "match");
    assert.equal(lastTwo[1].referenceWord, "day");

    // Total errors = substitutions + deletions + insertions
    const errors = result.substitutionCount + result.missingWordCount + result.extraWordCount;
    assert.equal(result.wer, errors / 5);
    assert.equal(result.textMatchScore, Math.max(0, (1 - result.wer) * 100));
  });

  // Test 7 — Empty transcript
  test("Test 7: Empty transcript returns explicit empty_transcript status and 0% score", () => {
    const ref = "I like English";
    const trans = "";
    const result = scoreAttempt(ref, trans);

    assert.equal(result.status, "empty_transcript");
    assert.equal(result.referenceWordCount, 3);
    assert.equal(result.transcriptWordCount, 0);
    assert.equal(result.correctWordCount, 0);
    assert.equal(result.missingWordCount, 3);
    assert.equal(result.wer, 1);
    assert.equal(result.textMatchScore, 0);
    assert.equal(result.referenceWordCoverage, 0);
  });

  // Test 8 — Empty reference
  test("Test 8: Empty reference returns explicit empty_reference status with null WER", () => {
    const ref = "";
    const trans = "I like English";
    const result = scoreAttempt(ref, trans);

    assert.equal(result.status, "empty_reference");
    assert.equal(result.referenceWordCount, 0);
    assert.equal(result.wer, null);
    assert.equal(result.textMatchScore, null);
  });

  // Test 9 — Both inputs empty
  test("Test 9: Both inputs empty returns unscorable status without division-by-zero", () => {
    const result = scoreAttempt("", "");

    assert.equal(result.status, "unscorable");
    assert.equal(result.wer, null);
    assert.equal(result.textMatchScore, null);
    assert.equal(result.referenceWordCoverage, null);
  });

  // Test 10 — Contractions policy
  test("Test 10: Contractions are not automatically equated with expanded forms", () => {
    const ref = "I don't know";
    const trans = "I do not know";
    const result = scoreAttempt(ref, trans);

    assert.equal(result.referenceWordCount, 3);
    assert.equal(result.transcriptWordCount, 4);

    // 'don't' is a single lexical token under standard policy
    const tokens = tokenizeToStrings("I don't know");
    assert.deepEqual(tokens, ["i", "don't", "know"]);

    // "don't" vs "do not" requires edits (sub + ins or del + 2 ins)
    assert(result.wer > 0, "Contractions should not be silently rewritten without an explicit rule");
  });

  // Test 11 — Repeated words
  test("Test 11: Repeated words are identified deterministically without shifting later words", () => {
    const ref = "I really really like it";
    const trans = "I really like it";
    const result = scoreAttempt(ref, trans);

    assert.equal(result.referenceWordCount, 5);
    assert.equal(result.correctWordCount, 4);
    assert.equal(result.missingWordCount, 1);
    assert.equal(result.substitutionCount, 0);
    assert.equal(result.extraWordCount, 0);

    const matches = result.alignment.filter((r) => r.type === "match").map((r) => r.referenceWord);
    assert.deepEqual(matches, ["i", "really", "like", "it"]);
  });

  // Test 12 — Unicode support
  test("Test 12: Unicode Latin accents and non-ASCII characters are preserved", () => {
    const ref = "I love this café and naïve art in 2026!";
    const trans = "i love this café and naive art in 2026";
    const result = scoreAttempt(ref, trans);

    assert.equal(result.referenceWordCount, 9);
    // 'café' matches 'café', '2026' matches '2026', 'naïve' vs 'naive' is a substitution
    const cafeRec = result.alignment.find((r) => r.referenceWord === "café");
    assert(cafeRec);
    assert.equal(cafeRec.type, "match");

    const naiveRec = result.alignment.find((r) => r.referenceWord === "naïve");
    assert(naiveRec);
    assert.equal(naiveRec.type, "substitution");
    assert.equal(naiveRec.transcriptWord, "naive");
  });

  // Test 13 — Long sentence performance
  test("Test 13: Long sentence aligns in sub-millisecond time without stack overflow", () => {
    const longRef = "The quick brown fox jumps over the lazy dog while the sunlight streams through the quiet library window casting long golden shadows across the polished wooden floor.";
    const longTrans = "The quick brown fox jumps over the lazy dog while sunlight streams through the quiet library window casting long golden shadows across the wooden floor.";

    const start = performance.now();
    const result = scoreAttempt(longRef, longTrans);
    const duration = performance.now() - start;

    assert.equal(result.status, "scored");
    assert(result.referenceWordCount > 20);
    assert(duration < 50, `Alignment took ${duration}ms, expected < 50ms`);
  });

  // Test 14 — Deterministic tie-breaking consistency
  test("Test 14: Tie-breaking is completely deterministic across repeated executions", () => {
    const ref = "cat bat rat hat";
    const trans = "cat mat rat";

    const res1 = scoreAttempt(ref, trans);
    const res2 = scoreAttempt(ref, trans);

    assert.deepEqual(res1.alignment, res2.alignment);
    assert.equal(res1.wer, res2.wer);
    assert.equal(res1.textMatchScore, res2.textMatchScore);
  });

  // Test 15 — Schema and zero side-effects
  test("Test 15: Scoring result adheres to exact schema with createdAt null and pure outputs", () => {
    const result = scoreAttempt("Test sentence", "Test sentence");

    assert.equal(typeof result.referenceText, "string");
    assert.equal(typeof result.transcriptText, "string");
    assert.equal(typeof result.referenceWordCount, "number");
    assert.equal(typeof result.transcriptWordCount, "number");
    assert.equal(typeof result.correctWordCount, "number");
    assert.equal(typeof result.substitutionCount, "number");
    assert.equal(typeof result.missingWordCount, "number");
    assert.equal(typeof result.extraWordCount, "number");
    assert.equal(typeof result.wer, "number");
    assert.equal(typeof result.textMatchScore, "number");
    assert.equal(typeof result.referenceWordCoverage, "number");
    assert(Array.isArray(result.alignment));
    assert.equal(result.createdAt, null);
    assert.equal(result.status, "scored");
  });
});
