import test from "node:test";
import assert from "node:assert/strict";
import {
  hashDateString,
  generateDailyPlan,
  evaluatePlanProgress,
} from "../src/lib/learning/dailyPlan.js";

test("Phase 5 Daily Learning Plan Tests", async (t) => {
  await t.test("Test 1: Date string hash is completely deterministic", () => {
    const h1 = hashDateString("2026-10-22");
    const h2 = hashDateString("2026-10-22");
    assert.equal(h1, h2);
    assert.ok(typeof h1 === "number" && h1 >= 0);

    const hDiff = hashDateString("2026-10-23");
    assert.notEqual(h1, hDiff);
  });

  await t.test("Test 2: Daily plan generates 4 core tasks across all modules", () => {
    const refDate = new Date("2026-10-22T10:00:00");
    const plan = generateDailyPlan(refDate);

    assert.equal(plan.date, "2026-10-22");
    assert.equal(plan.tasks.length, 4);

    const modules = plan.tasks.map((t) => t.module);
    assert.ok(modules.includes("speaking"));
    assert.ok(modules.includes("dictation"));
    assert.ok(modules.includes("grammar"));
    assert.ok(modules.includes("vocabulary"));

    for (const task of plan.tasks) {
      assert.ok(task.id);
      assert.ok(task.title);
      assert.ok(task.exerciseId);
      assert.ok(task.href);
      assert.ok(task.estimatedMinutes > 0);
    }
  });

  await t.test("Test 3: Plan generation is stable across repeated invocations on the same date", () => {
    const refDate = new Date("2026-10-22T14:30:00");
    const plan1 = generateDailyPlan(refDate);
    const plan2 = generateDailyPlan(refDate);

    assert.deepEqual(plan1, plan2);
  });

  await t.test("Test 4: Plan evaluation calculates accurate completion percentage", () => {
    const refDate = new Date("2026-10-22T10:00:00");
    const plan = generateDailyPlan(refDate);

    // Initial state: no activities
    const initialEval = evaluatePlanProgress(plan, [], refDate);
    assert.equal(initialEval.completedCount, 0);
    assert.equal(initialEval.totalCount, 4);
    assert.equal(initialEval.percentage, 0);

    // 2 activities completed today
    const activities = [
      {
        module: "speaking",
        status: "completed",
        timestamp: "2026-10-22T08:00:00",
      },
      {
        module: "dictation",
        status: "completed",
        timestamp: "2026-10-22T09:00:00",
      },
      {
        // Activity from yesterday should not count toward today's plan
        module: "grammar",
        status: "completed",
        timestamp: "2026-10-21T10:00:00",
      },
    ];

    const evalResult = evaluatePlanProgress(plan, activities, refDate);
    assert.equal(evalResult.completedCount, 2);
    assert.equal(evalResult.totalCount, 4);
    assert.equal(evalResult.percentage, 50);

    const speakingTask = evalResult.tasksWithStatus.find((t) => t.module === "speaking");
    assert.equal(speakingTask.isCompleted, true);

    const dictationTask = evalResult.tasksWithStatus.find((t) => t.module === "dictation");
    assert.equal(dictationTask.isCompleted, true);

    const grammarTask = evalResult.tasksWithStatus.find((t) => t.module === "grammar");
    assert.equal(grammarTask.isCompleted, false);
  });

  await t.test("Test 5: Full completion achieves 100% goal", () => {
    const refDate = new Date("2026-10-22T10:00:00");
    const plan = generateDailyPlan(refDate);

    const allCompleted = [
      { module: "speaking", status: "completed", timestamp: "2026-10-22T08:00:00" },
      { module: "dictation", status: "completed", timestamp: "2026-10-22T09:00:00" },
      { module: "grammar", status: "completed", timestamp: "2026-10-22T10:00:00" },
      { module: "vocabulary", status: "completed", timestamp: "2026-10-22T11:00:00" },
    ];

    const evalResult = evaluatePlanProgress(plan, allCompleted, refDate);
    assert.equal(evalResult.completedCount, 4);
    assert.equal(evalResult.percentage, 100);
  });
});
