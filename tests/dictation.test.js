import test from "node:test";
import assert from "node:assert/strict";
import { DICTATION_EXERCISES } from "../src/data/dictation/exercises.js";
import { scoreAttempt } from "../src/lib/scoring/scoreAttempt.js";

test("Phase 5 Dictation Module Tests", async (t) => {
  await t.test("Test 1: Starter dataset contains valid exercises across all difficulty tiers", () => {
    assert.ok(DICTATION_EXERCISES.length >= 10, "Should have at least 10 starter exercises");

    const difficulties = new Set(DICTATION_EXERCISES.map((e) => e.difficulty));
    assert.ok(difficulties.has("beginner"), "Must include beginner tier");
    assert.ok(difficulties.has("intermediate"), "Must include intermediate tier");
    assert.ok(difficulties.has("advanced"), "Must include advanced tier");

    for (const ex of DICTATION_EXERCISES) {
      assert.ok(ex.id, "Exercise must have an ID");
      assert.ok(ex.text && ex.text.length > 10, "Exercise must have substantive text");
      assert.ok(ex.category, "Exercise must have a category");
      assert.ok(ex.hints?.firstWord, "Exercise must specify first word hint");
      assert.ok(ex.hints?.wordCount > 0, "Exercise must specify word count hint");
    }
  });

  await t.test("Test 2: Exact transcription achieves 100% score and zero WER", () => {
    const ex = DICTATION_EXERCISES[0];
    const result = scoreAttempt(ex.text, ex.text);

    assert.equal(result.status, "scored");
    assert.equal(result.textMatchScore, 100);
    assert.equal(result.wer, 0);
    assert.equal(result.missingWordCount, 0);
    assert.equal(result.substitutionCount, 0);
    assert.equal(result.extraWordCount, 0);
  });

  await t.test("Test 3: Casing and minor punctuation differences evaluate cleanly without penalty", () => {
    const ref = "Could you please pass the water bottle?";
    const typed = "could you please pass the water bottle";
    const result = scoreAttempt(ref, typed);

    assert.equal(result.status, "scored");
    assert.equal(result.textMatchScore, 100);
    assert.equal(result.correctWordCount, 7);
    assert.equal(result.wer, 0);
  });

  await t.test("Test 4: Missing word is classified as deletion without breaking subsequent alignments", () => {
    const ref = "We are meeting at the coffee shop at noon.";
    const typed = "We are meeting at coffee shop at noon."; // "the" deleted
    const result = scoreAttempt(ref, typed);

    assert.equal(result.status, "scored");
    assert.equal(result.missingWordCount, 1);
    assert.equal(result.correctWordCount, 8);
    assert.ok(result.textMatchScore < 100 && result.textMatchScore > 80);
  });

  await t.test("Test 5: Substituted word aligns with target reference word", () => {
    const ref = "The train leaves the station every fifteen minutes.";
    const typed = "The bus leaves the station every fifteen minutes."; // train -> bus
    const result = scoreAttempt(ref, typed);

    assert.equal(result.status, "scored");
    assert.equal(result.substitutionCount, 1);
    assert.equal(result.missingWordCount, 0);
    assert.equal(result.extraWordCount, 0);

    const subItem = result.alignment.find((a) => a.type === "substitution");
    assert.ok(subItem);
    assert.equal(subItem.referenceWord, "train");
    assert.equal(subItem.transcriptWord, "bus");
  });

  await t.test("Test 6: Extra typed word is classified as insertion without corrupting alignment", () => {
    const ref = "We are meeting at the coffee shop at noon.";
    const typed = "We are meeting up at the coffee shop at noon."; // extra "up"
    const result = scoreAttempt(ref, typed);

    assert.equal(result.status, "scored");
    assert.equal(result.extraWordCount, 1);
    assert.equal(result.correctWordCount, 9);
  });

  await t.test("Test 7: Empty typed answer yields zero score and explicit empty_transcript status", () => {
    const ref = "Could you please pass the water bottle?";
    const result = scoreAttempt(ref, "   ");

    assert.equal(result.status, "empty_transcript");
    assert.equal(result.textMatchScore, 0);
    assert.equal(result.correctWordCount, 0);
    assert.equal(result.missingWordCount, 7);
  });
});
