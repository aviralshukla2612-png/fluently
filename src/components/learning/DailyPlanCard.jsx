"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  generateAdaptiveDailyPlan,
  evaluateAdaptivePlan,
  ALLOWED_TIME_BUDGETS,
  DEFAULT_TIME_BUDGET,
} from "@/lib/learning/dailyLearningPlan.js";
import { detectWeaknesses } from "@/lib/learning/weaknessDetector.js";
import { useProgress } from "@/lib/learning/useProgress.js";
import { useGoals } from "@/lib/goals/useGoals.js";
import { useIsMounted } from "@/lib/learning/useIsMounted.js";
import {
  Calendar,
  CheckCircle2,
  Circle,
  ArrowRight,
  Languages,
  Headphones,
  BookOpen,
  BookMarked,
  MessageSquare,
  Sparkles,
  Clock,
  AlertTriangle,
} from "lucide-react";

const MODULE_ICONS = {
  speaking: Languages,
  dictation: Headphones,
  grammar: BookOpen,
  vocabulary: BookMarked,
  conversation: MessageSquare,
};

export default function DailyPlanCard() {
  const { activities } = useProgress();
  const { goals } = useGoals();
  const mounted = useIsMounted();
  const [selectedBudget, setSelectedBudget] = useState(DEFAULT_TIME_BUDGET);

  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);

  // Compute detected weaknesses from recorded activities
  const weaknesses = useMemo(() => {
    return mounted ? detectWeaknesses(activities) : [];
  }, [mounted, activities]);

  // Generate adaptive plan tailored to target minutes, weaknesses, and active goals
  const plan = useMemo(() => {
    if (!mounted) {
      return generateAdaptiveDailyPlan({
        activities: [],
        weaknesses: [],
        targetMinutes: selectedBudget,
        referenceDate: "2026-01-01",
      });
    }
    return generateAdaptiveDailyPlan({
      activities,
      weaknesses,
      targetMinutes: selectedBudget,
      goals: activeGoals,
    });
  }, [mounted, activities, weaknesses, selectedBudget, activeGoals]);

  // Evaluate real completion against today's activities
  const evaluation = useMemo(() => {
    return mounted
      ? evaluateAdaptivePlan(plan, activities)
      : evaluateAdaptivePlan(plan, []);
  }, [mounted, plan, activities]);

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-3xl p-4 sm:p-6 md:p-8 shadow-card flex flex-col gap-5 sm:gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2F0E9] pb-4 sm:pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#466657]">
              Today&apos;s Personalized Plan
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#716F65] bg-[#FAF9F5] border border-[#E6E2D9] px-2 py-0.5 rounded-full flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{plan.date}</span>
            </span>
            {plan.isStarterPlan && (
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#E7F2E9] text-[#327653] border border-[#CEDDD2]">
                Starter Regimen
              </span>
            )}
          </div>
          <h2 className="font-heading font-bold text-lg sm:text-xl md:text-2xl text-[#30362F] mt-1">
            Adaptive Practice • {plan.estimatedMinutes} Minutes
          </h2>
        </div>

        {/* Time Budget Selector & Completion Badge */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-4 w-full sm:w-auto">
          {/* Budget Pills */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-[#FAF9F5] border border-[#E6E2D9] p-0.5 sm:p-1 rounded-xl overflow-x-auto no-scrollbar">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#716F65] ml-1 mr-0.5 shrink-0" aria-hidden="true" />
            {ALLOWED_TIME_BUDGETS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setSelectedBudget(mins)}
                className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors focus-accessible shrink-0 ${
                  selectedBudget === mins
                    ? "bg-[#203D35] text-white shadow-xs"
                    : "text-[#716F65] hover:text-[#30362F]"
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* Radial Completion Percentage */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FAF9F5] border-2 border-[#CEDDD2] flex items-center justify-center font-heading font-bold text-xs sm:text-sm text-[#203D35] shrink-0">
            {evaluation.percentage}%
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs text-[#716F65]">
          <span>
            {evaluation.completedCount} of {evaluation.totalCount} completed
          </span>
          <span className="font-medium">
            {evaluation.completedMinutes}m done • {evaluation.remainingMinutes}m left
          </span>
        </div>
        <div className="w-full h-2.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-full overflow-hidden">
          <div
            style={{ width: `${evaluation.percentage}%` }}
            className="h-full bg-[#203D35] rounded-full transition-all duration-500 ease-out"
          />
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {evaluation.tasksWithStatus.map((task) => {
          const Icon = MODULE_ICONS[task.module] || Sparkles;

          return (
            <Link
              key={task.id}
              href={task.href}
              className={`p-4 rounded-2xl border transition-all duration-200 flex items-start justify-between gap-3 focus-accessible group ${
                task.isCompleted
                  ? "bg-[#FAF9F5]/70 border-[#CEDDD2] text-[#716F65]"
                  : "bg-white border-[#E6E2D9] hover:border-[#CEDDD2] hover:bg-[#FAF9F5] text-[#30362F] shadow-xs"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    task.isCompleted
                      ? "bg-[#E7F2E9] text-[#327653]"
                      : "bg-[#FAF9F5] border border-[#E6E2D9] text-[#203D35] group-hover:bg-white"
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        task.isCompleted ? "line-through text-[#929087]" : "text-[#30362F]"
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.priority === "high" && !task.isCompleted && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#FDF0EE] text-[#A5413B] border border-[#F2C2BD]">
                        Focus
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#716F65]">
                    {task.subtitle}
                  </span>
                  <span className="text-[11px] text-[#929087] mt-0.5">
                    {task.reason}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 mt-1">
                <span className="text-xs text-[#716F65] font-mono">
                  {task.estimatedMinutes}m
                </span>

                {task.isCompleted ? (
                  <CheckCircle2
                    className="w-5 h-5 text-[#327653] fill-[#E7F2E9]"
                    aria-label="Completed"
                  />
                ) : (
                  <Circle
                    className="w-5 h-5 text-[#CEDDD2] group-hover:text-[#466657] transition-colors"
                    aria-label="Not completed"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer Encouragement */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#716F65] border-t border-[#F2F0E9] pt-4">
        <span>
          {evaluation.completedCount === evaluation.totalCount && evaluation.totalCount > 0
            ? "🎉 All daily tasks complete! Fantastic effort reinforcing your English skills."
            : "Tasks adapt automatically based on your detected weaknesses and daily time budget."}
        </span>
        <Link
          href="/progress"
          className="text-[#203D35] hover:text-[#294C42] font-semibold flex items-center gap-1 group shrink-0"
        >
          <span>View Detailed Analytics</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
