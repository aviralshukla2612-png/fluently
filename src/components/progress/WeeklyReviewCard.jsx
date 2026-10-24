"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Award,
  Clock,
  Flame,
  ArrowRight,
  BookOpen,
  Headphones,
  Languages,
  BookMarked,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { generateWeeklyReview } from "@/lib/learning/weeklyReview.js";

const SKILL_ICONS = {
  speaking: Languages,
  dictation: Headphones,
  grammar: BookOpen,
  vocabulary: BookMarked,
  conversation: MessageSquare,
};

export default function WeeklyReviewCard({ activities = [] }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const review = useMemo(() => {
    return generateWeeklyReview(activities, { weekOffset });
  }, [activities, weekOffset]);

  const { weekRange, overview, skillSummaries, analysis, nextWeekFocus } = review;

  const handlePrevWeek = () => {
    setWeekOffset((prev) => prev + 1);
  };

  const handleNextWeek = () => {
    setWeekOffset((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
      {/* Header with week navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2F0E9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
              Reflection & Progress
            </span>
            {weekRange.isCurrentWeek && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#E7F2E9] text-[#327653] border border-[#CEDDD2]">
                Current Week
              </span>
            )}
          </div>
          <h3 className="font-heading font-semibold text-lg sm:text-xl text-[#30362F] mt-0.5">
            Weekly Learning Review
          </h3>
        </div>

        {/* Date Selector Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePrevWeek}
            aria-label="Previous week"
            className="p-1.5 rounded-lg bg-[#FAF9F5] border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-white transition-colors focus-accessible"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-lg text-xs font-medium text-[#30362F]">
            <Calendar className="w-3.5 h-3.5 text-[#466657]" />
            <span>{weekRange.label}</span>
          </div>

          <button
            type="button"
            onClick={handleNextWeek}
            disabled={weekRange.isCurrentWeek}
            aria-label="Next week"
            className="p-1.5 rounded-lg bg-[#FAF9F5] border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-white transition-colors focus-accessible disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!overview.hasActivity ? (
        <div className="py-12 px-4 text-center bg-[#FAF9F5] border border-dashed border-[#E6E2D9] rounded-xl flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E7F2E9] border border-[#CEDDD2] flex items-center justify-center text-[#203D35]">
            <Calendar className="w-5 h-5 text-[#466657]" aria-hidden="true" />
          </div>
          <div>
            <h4 className="font-heading font-semibold text-sm text-[#30362F]">
              No Practice Logged For This Week
            </h4>
            <p className="text-xs text-[#716F65] max-w-sm mt-1">
              Complete exercises in Speaking, Dictation, Grammar, Vocabulary, or Conversation to populate your weekly review.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* 4 Stat Overview Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase text-[#716F65]">
                Activities
              </span>
              <div className="font-heading font-bold text-2xl text-[#203D35] mt-1">
                {overview.totalCompletedActivities}
              </div>
              <span className="text-[10px] text-[#929087] mt-1">
                {overview.priorWeekCompletedActivities > 0
                  ? `${overview.priorWeekCompletedActivities} in prior week`
                  : "Verified practice drills"}
              </span>
            </div>

            <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase text-[#716F65]">
                Practice Time
              </span>
              <div className="font-heading font-bold text-2xl text-[#203D35] mt-1">
                {overview.totalPracticeMinutes} <span className="text-sm font-normal text-[#716F65]">min</span>
              </div>
              <span className="text-[10px] text-[#929087] mt-1">
                Active learning duration
              </span>
            </div>

            <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase text-[#716F65]">
                Active Days
              </span>
              <div className="font-heading font-bold text-2xl text-[#203D35] mt-1">
                {overview.activeDaysCount} <span className="text-sm font-normal text-[#716F65]">/ 7</span>
              </div>
              <span className="text-[10px] text-[#929087] mt-1">
                Distinct practice dates
              </span>
            </div>

            <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase text-[#716F65]">
                Habit Streak
              </span>
              <div className="font-heading font-bold text-2xl text-[#203D35] mt-1 flex items-baseline gap-1">
                <span>{overview.currentStreak}</span>
                <span className="text-xs font-normal text-[#716F65]">days</span>
              </div>
              <span className="text-[10px] text-[#929087] mt-1">
                Peak streak: {overview.longestStreak} days
              </span>
            </div>
          </div>

          {/* Skill Performance Table */}
          <div className="border border-[#E6E2D9] rounded-xl overflow-hidden">
            <div className="bg-[#FAF9F5] px-4 py-2.5 border-b border-[#E6E2D9] flex items-center justify-between text-xs font-semibold text-[#30362F]">
              <span>Skill Area</span>
              <div className="flex items-center gap-6">
                <span>Drills</span>
                <span className="w-16 text-right">Avg Score</span>
                <span className="w-24 text-right">Trend</span>
              </div>
            </div>

            <div className="divide-y divide-[#E6E2D9]/70 bg-white">
              {Object.values(skillSummaries).map((s) => {
                const Icon = SKILL_ICONS[s.module] || BookOpen;

                return (
                  <div
                    key={s.module}
                    className="px-4 py-3 flex items-center justify-between text-xs hover:bg-[#FAF9F5]/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#FAF9F5] border border-[#E6E2D9] flex items-center justify-center text-[#203D35]">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-[#30362F] capitalize">
                        {s.module}
                      </span>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="text-[#716F65]">{s.drillsCount}</span>

                      <span className="w-16 text-right font-medium text-[#30362F]">
                        {s.averageScore !== null ? `${s.averageScore}%` : "—"}
                      </span>

                      <div className="w-24 flex items-center justify-end gap-1">
                        {s.trend === "improving" && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#327653] bg-[#E7F2E9] border border-[#CEDDD2] px-1.5 py-0.5 rounded">
                            <TrendingUp className="w-3 h-3" />
                            <span>+{s.scoreChange}%</span>
                          </span>
                        )}
                        {s.trend === "declining" && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#A5413B] bg-[#F8E8E5] border border-[#E6B6B0] px-1.5 py-0.5 rounded">
                            <TrendingDown className="w-3 h-3" />
                            <span>{s.scoreChange}%</span>
                          </span>
                        )}
                        {s.trend === "stable" && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#716F65] bg-[#FAF9F5] border border-[#E6E2D9] px-1.5 py-0.5 rounded">
                            <Minus className="w-3 h-3" />
                            <span>Stable</span>
                          </span>
                        )}
                        {s.trend === "insufficient_data" && (
                          <span className="text-[10px] text-[#929087]">
                            {s.drillsCount === 0 ? "No drills" : "Baseline"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Highlights & Recommended Focus */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Improvements */}
            <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#30362F] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#327653]" />
                <span>Week Highlights</span>
              </span>
              {analysis.improvements.length > 0 ? (
                <ul className="text-xs text-[#716F65] flex flex-col gap-1.5 mt-1">
                  {analysis.improvements.map((imp) => (
                    <li key={imp.module} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#327653] shrink-0" />
                      <span>
                        <strong className="capitalize text-[#30362F]">{imp.module}</strong>{" "}
                        improved by +{imp.change}% (now {imp.currentScore}%).
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#716F65] mt-1">
                  Consistent practice logged across modules. Continue challenging yourself to measure score progression!
                </p>
              )}
            </div>

            {/* Next Week's Focus */}
            <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#30362F] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#203D35]" />
                <span>Recommended Next Week Focus</span>
              </span>

              {nextWeekFocus.length > 0 ? (
                <div className="flex flex-col gap-1.5 mt-1">
                  {nextWeekFocus.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2 bg-white border border-[#E6E2D9] rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-[#30362F]">{rec.title}</span>
                        <p className="text-[11px] text-[#716F65] truncate">{rec.reason}</p>
                      </div>
                      <Link
                        href={rec.actionRoute || "/progress"}
                        className="text-[#203D35] hover:text-[#294C42] shrink-0 flex items-center gap-1 font-semibold text-[11px]"
                      >
                        <span>Start</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#716F65] mt-1">
                  Keep maintaining your daily practice rhythm across speaking and dictation!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
