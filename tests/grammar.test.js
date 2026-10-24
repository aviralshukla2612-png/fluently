import test from "node:test";
import assert from "node:assert/strict";
import { GRAMMAR_LESSONS } from "../src/data/grammar/lessons.js";

test("Phase 5 Grammar Module Tests", async (t) => {
  await t.test("Test 1: Curriculum contains structured lessons across beginner, intermediate, and advanced", () => {
    assert.ok(GRAMMAR_LESSONS.length >= 6, "Should have at least 6 core lessons");

    const tiers = new Set(GRAMMAR_LESSONS.map((l) => l.difficulty));
    assert.ok(tiers.has("beginner"), "Must include beginner lessons");
    assert.ok(tiers.has("intermediate"), "Must include intermediate lessons");
    assert.ok(tiers.has("advanced"), "Must include advanced lessons");

    for (const lesson of GRAMMAR_LESSONS) {
      assert.ok(lesson.id, "Lesson must have an ID");
      assert.ok(lesson.title, "Lesson must have a title");
      assert.ok(lesson.grammarRule, "Lesson must have a rule formula");
      assert.ok(lesson.examples?.length >= 2, "Lesson must have at least 2 examples");
      assert.ok(lesson.practiceQuestions?.length >= 1, "Lesson must have practice questions");
    }
  });

  await t.test("Test 2: Multiple-choice questions validate correct choice deterministically", () => {
    const presentSimpleLesson = GRAMMAR_LESSONS.find((l) => l.id === "gram-b-pres-simple");
    const mcq = presentSimpleLesson.practiceQuestions.find((q) => q.type === "multiple_choice");

    assert.ok(mcq);
    assert.equal(mcq.correctAnswer, "lives");
    assert.ok(mcq.options.includes("lives"));

    // Verify distractors do not match correct answer
    const distractors = mcq.options.filter((o) => o !== mcq.correctAnswer);
    assert.ok(distractors.length >= 2);
    for (const d of distractors) {
      assert.notEqual(d, mcq.correctAnswer);
    }
  });

  await t.test("Test 3: Fill-in-the-blank questions support explicitly defined accepted variants", () => {
    const presentSimpleLesson = GRAMMAR_LESSONS.find((l) => l.id === "gram-b-pres-simple");
    const fillQ = presentSimpleLesson.practiceQuestions.find((q) => q.type === "fill_blank");

    assert.ok(fillQ);
    assert.ok(Array.isArray(fillQ.acceptedAnswers));
    assert.ok(fillQ.acceptedAnswers.length >= 2);

    const checkAnswer = (input) => {
      const clean = input.trim().toLowerCase();
      const validVariants = fillQ.acceptedAnswers.map((a) => a.trim().toLowerCase());
      return validVariants.includes(clean);
    };

    // Standard forms
    assert.equal(checkAnswer("does"), true);
    assert.equal(checkAnswer("doesn't"), true);
    assert.equal(checkAnswer("does not"), true);

    // Casing variations
    assert.equal(checkAnswer("DOES"), true);
    assert.equal(checkAnswer("  doesn't  "), true);

    // Incorrect forms
    assert.equal(checkAnswer("do"), false);
    assert.equal(checkAnswer("is"), false);
  });

  await t.test("Test 4: Choose correct sentence verifies grammatical syntax", () => {
    const articlesLesson = GRAMMAR_LESSONS.find((l) => l.id === "gram-b-articles");
    const chooseQ = articlesLesson.practiceQuestions.find((q) => q.type === "choose_correct");

    assert.ok(chooseQ);
    assert.equal(chooseQ.correctAnswer, "She bought a European car.");
    assert.ok(chooseQ.options.includes(chooseQ.correctAnswer));
  });

  await t.test("Test 5: Common mistakes provide explicit incorrect, correct, and explanation fields", () => {
    for (const lesson of GRAMMAR_LESSONS) {
      if (lesson.commonMistakes && lesson.commonMistakes.length > 0) {
        for (const m of lesson.commonMistakes) {
          assert.ok(m.incorrect, "Must describe incorrect usage");
          assert.ok(m.correct, "Must provide correct usage");
          assert.ok(m.explanation, "Must explain the rule");
        }
      }
    }
  });
});
