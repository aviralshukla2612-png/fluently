"use client";

import { useMemo, useState } from "react";
import { useProgress } from "@/lib/learning/useProgress.js";
import { clearAllProgress } from "@/lib/learning/progressService.js";
import { computeLearningAnalytics } from "@/lib/learning/learningAnalytics.js";
import { detectWeaknesses } from "@/lib/learning/weaknessDetector.js";
import PerformanceTrendChart from "@/components/progress/PerformanceTrendChart.jsx";
import WeaknessRadarCard from "@/components/progress/WeaknessRadarCard.jsx";
import AITutorInsightsCard from "@/components/progress/AITutorInsightsCard.jsx";
import DailyPlanCard from "@/components/learning/DailyPlanCard.jsx";
import AchievementToast from "@/components/notifications/AchievementToast.jsx";
import { useGoals } from "@/lib/goals/useGoals.js";
import { useAchievements } from "@/lib/achievements/useAchievements.js";
import {
  Flame,
  Award,
  Target,
  Clock,
  ArrowRight,
  Headphones,
  Languages,
  BookOpen,
  BookMarked,
  RotateCcw,
  Sparkles,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Trophy,
  CheckCircle2,
  Calendar,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

function formatActivityTime(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return "";
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = String(hours % 12 || 12).padStart(2, "0");
  return `${displayHours}:${minutes} ${ampm}`;
}

export default function ProgressDashboard() {
  const { isLoaded, activities, streak, stats, refreshProgress } = useProgress();

  // Compute verified learning analytics and weaknesses
  const analytics = useMemo(() => {
    return computeLearningAnalytics(activities);
  }, [activities]);

  const weaknesses = useMemo(() => {
    return detectWeaknesses(activities);
  }, [activities]);

  const { goals } = useGoals();
  const {
    achievements,
    totalPoints,
    unlockedCount,
    totalCount,
    activeToast,
    dismissToast,
  } = useAchievements();

  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);
  const recentlyUnlocked = useMemo(() => {
    return achievements.filter((a) => a.isUnlocked).sort((a, b) => new Date(b.unlockedAt || 0) - new Date(a.unlockedAt || 0))[0] || null;
  }, [achievements]);

  const nextMilestone = useMemo(() => {
    const lockedWithProgress = achievements
      .filter((a) => !a.isUnlocked && !a.hidden)
      .sort((a, b) => (b.progress || 0) - (a.progress || 0));
    return lockedWithProgress[0] || null;
  }, [achievements]);

  if (!isLoaded) {
    return (
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-12 text-center text-[#716F65] animate-pulse">
        Loading your personalized learning intelligence...
      </div>
    );
  }

  const hasAnyActivity = activities.length > 0;

  const handleResetData = () => {
    if (confirm("Are you sure you want to reset your local practice progress on this device?")) {
      clearAllProgress();
      refreshProgress();
    }
  };

  const skillsList = [
    {
      id: "speaking",
      name: "Speaking (Text-Match)",
      disclaimer: "Speech recognition text-matching, not acoustic phonetics.",
      score: analytics.skills.speaking.averageScore,
      attempts: analytics.skills.speaking.attempts,
      trend: analytics.skills.speaking.trend,
      icon: Languages,
      href: "/say-it",
    },
    {
      id: "dictation",
      name: "Listening & Dictation",
      disclaimer: "Auditory recognition and spelling precision.",
      score: analytics.skills.dictation.averageScore,
      attempts: analytics.skills.dictation.attempts,
      trend: analytics.skills.dictation.trend,
      icon: Headphones,
      href: "/dictation",
    },
    {
      id: "grammar",
      name: "Grammar & Structure",
      disclaimer: "Sentence patterns, verb tenses, and syntax rules.",
      score: analytics.skills.grammar.averageScore,
      attempts: analytics.skills.grammar.attempts,
      trend: analytics.skills.grammar.trend,
      icon: BookOpen,
      href: "/grammar",
    },
    {
      id: "vocabulary",
      name: "Vocabulary Recall",
      disclaimer: "Spaced repetition retention and lexical memory.",
      score: analytics.skills.vocabulary.averageScore,
      attempts: analytics.skills.vocabulary.attempts,
      trend: analytics.skills.vocabulary.trend,
      icon: BookMarked,
      href: "/vocabulary",
    },
    {
      id: "conversation",
      name: "AI Conversation",
      disclaimer: "Interactive dialogue, context, and spontaneous replies.",
      score: null,
      attempts: analytics.skills.conversation.attempts,
      trend: null,
      icon: MessageSquare,
      href: "/conversation",
    },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-[1040px] mx-auto pb-12">
      {/* 4 Top Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Completed Activities */}
        <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#716F65] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Activities Completed
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#E6E2D9] flex items-center justify-center text-[#203D35]">
              <Award className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div>
            <div className="font-heading font-bold text-3xl sm:text-4xl text-[#203D35]">
              {analytics.summary.totalCompletedActivities}
            </div>
            <p className="text-xs text-[#929087] mt-1">Verified practice drills</p>
          </div>
        </div>

        {/* Metric 2: Day Streak */}
        <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#716F65] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Day Streak
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#E6E2D9] flex items-center justify-center text-[#203D35]">
              <Flame className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div>
            <div className="font-heading font-bold text-3xl sm:text-4xl text-[#203D35] flex items-baseline gap-1.5">
              <span>{streak.currentStreak}</span>
              <span className="text-base font-medium text-[#716F65]">
                {streak.currentStreak === 1 ? "Day" : "Days"}
              </span>
            </div>
            <p className="text-xs text-[#929087] mt-1">
              {streak.hasPracticedToday
                ? "Practiced today!"
                : "Complete a drill to keep streak"}
            </p>
          </div>
        </div>

        {/* Metric 3: Active Time Spent */}
        <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#716F65] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Time Spent
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#E6E2D9] flex items-center justify-center text-[#203D35]">
              <Clock className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div>
            <div className="font-heading font-bold text-3xl sm:text-4xl text-[#203D35] flex items-baseline gap-1.5">
              <span>{analytics.summary.totalDurationMinutes}</span>
              <span className="text-base font-medium text-[#716F65]">Min</span>
            </div>
            <p className="text-xs text-[#929087] mt-1">
              {analytics.summary.totalDurationSeconds > 0
                ? `${Math.round(analytics.summary.totalDurationSeconds)} seconds logged`
                : "Active drill duration"}
            </p>
          </div>
        </div>

        {/* Metric 4: Overall Average Score */}
        <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#716F65] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Average Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#E6E2D9] flex items-center justify-center text-[#203D35]">
              <Target className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div>
            <div className="font-heading font-bold text-3xl sm:text-4xl text-[#203D35]">
              {analytics.summary.overallAverageScore !== null
                ? `${analytics.summary.overallAverageScore}%`
                : "—"}
            </div>
            <p className="text-xs text-[#929087] mt-1">
              {analytics.summary.recent7dAverageScore !== null
                ? `7d avg: ${analytics.summary.recent7dAverageScore}%`
                : "Across all scored exercises"}
            </p>
          </div>
        </div>
      </div>

      {/* Phase 8 Engagement Hub: Active Goals, Milestones & Weekly Review */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Active Learning Goals */}
        <div className="bg-white border border-[#E6E2D9] rounded-2xl p-5 shadow-card flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-[#716F65] mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
                Active Goals
              </span>
              <Target className="w-4 h-4 text-[#203D35]" />
            </div>

            {activeGoals.length === 0 ? (
              <div className="py-2">
                <p className="text-xs text-[#716F65]">No active goals set yet.</p>
                <p className="text-[11px] text-[#929087] mt-1">
                  Commit to a daily practice duration or weekly drills to build strong habits.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {activeGoals.slice(0, 2).map((g) => {
                  const p = g.progress || {};
                  return (
                    <div key={g.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs font-medium text-[#30362F]">
                        <span className="truncate pr-1">{g.title}</span>
                        <span className="text-[11px] text-[#203D35] shrink-0 font-semibold">{p.percentage || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${p.percentage || 0}%` }}
                          className="h-full bg-[#203D35] rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            href="/goals"
            className="inline-flex items-center justify-between text-xs font-semibold text-[#203D35] hover:text-[#294C42] border-t border-[#F2F0E9] pt-3 group"
          >
            <span>{activeGoals.length > 0 ? "Manage All Goals" : "Set Your First Goal"}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Card 2: Milestones & Next Achievement */}
        <div className="bg-white border border-[#E6E2D9] rounded-2xl p-5 shadow-card flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-[#716F65] mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
                Milestones & Points
              </span>
              <Trophy className="w-4 h-4 text-[#FDD835]" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-heading font-bold text-2xl text-[#203D35]">{totalPoints}</span>
              <span className="text-xs text-[#716F65]">pts earned</span>
              <span className="text-xs text-[#929087] ml-auto">
                {unlockedCount} / {totalCount} unlocked
              </span>
            </div>

            {nextMilestone ? (
              <div className="mt-2.5 p-2.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#30362F] truncate">
                    Next: {nextMilestone.name}
                  </span>
                  <span className="font-semibold text-[#203D35] shrink-0">
                    {nextMilestone.progress || 0}%
                  </span>
                </div>
                <div className="w-full h-1 bg-white border border-[#E6E2D9] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${nextMilestone.progress || 0}%` }}
                    className="h-full bg-[#466657] rounded-full"
                  />
                </div>
              </div>
            ) : recentlyUnlocked ? (
              <div className="mt-2.5 p-2 bg-[#E7F2E9]/60 border border-[#CEDDD2] rounded-xl flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#327653] shrink-0" />
                <span className="text-[#30362F] font-medium truncate">
                  Latest: {recentlyUnlocked.name}
                </span>
              </div>
            ) : (
              <p className="text-xs text-[#929087] mt-2">
                Practice in any module to start unlocking milestone badges.
              </p>
            )}
          </div>

          <Link
            href="/achievements"
            className="inline-flex items-center justify-between text-xs font-semibold text-[#203D35] hover:text-[#294C42] border-t border-[#F2F0E9] pt-3 group"
          >
            <span>View All Badges</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Card 3: Weekly Review Entry Point */}
        <div className="bg-white border border-[#E6E2D9] rounded-2xl p-5 shadow-card flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-[#716F65] mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
                Weekly Reflection
              </span>
              <Calendar className="w-4 h-4 text-[#203D35]" />
            </div>

            <div className="py-1">
              <h4 className="font-heading font-semibold text-sm text-[#30362F]">
                Weekly Performance Review
              </h4>
              <p className="text-xs text-[#716F65] mt-1 leading-relaxed">
                Review week-over-week skill trends, verified practice minutes, and targeted focus areas.
              </p>
            </div>
          </div>

          <Link
            href="/weekly-review"
            className="inline-flex items-center justify-between text-xs font-semibold text-[#203D35] hover:text-[#294C42] border-t border-[#F2F0E9] pt-3 group"
          >
            <span>Open Weekly Review</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* AI Learning Coach Summary */}
      <AITutorInsightsCard analytics={analytics} weaknesses={weaknesses} />

      {/* Today's Adaptive Plan */}
      <DailyPlanCard />

      {/* Focus Areas (Weakness Radar) */}
      <WeaknessRadarCard weaknesses={weaknesses} />

      {/* 7-Day Performance Trends Chart */}
      <PerformanceTrendChart
        timeline={analytics.timeline7d}
        overallTrend={analytics.summary.overallTrend}
      />

      {/* Skill Mastery Overview Cards */}
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
              Skill Mastery
            </span>
            <h3 className="font-heading font-semibold text-lg text-[#30362F] mt-0.5">
              Core Competencies & Score Breakdown
            </h3>
          </div>
          <span className="text-xs text-[#716F65] bg-[#FAF9F5] border border-[#E6E2D9] px-2.5 py-1 rounded-md">
            5 Core Pathways
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skillsList.map((skill) => {
            const Icon = skill.icon;
            return (
              <div
                key={skill.id}
                className="p-5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col justify-between gap-4 hover:border-[#CEDDD2] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#E6E2D9] flex items-center justify-center text-[#203D35]">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </div>
                    {skill.score !== null ? (
                      <span className="text-sm font-bold text-[#203D35] bg-white border border-[#E6E2D9] px-2 py-0.5 rounded-md">
                        {skill.score}%
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-[#929087]">
                        {skill.id === "conversation" ? `${stats.conversation?.totalExchanges || 0} exch.` : "Unscored"}
                      </span>
                    )}
                  </div>

                  <h4 className="font-heading font-semibold text-sm text-[#30362F]">
                    {skill.name}
                  </h4>
                  <p className="text-[11px] text-[#929087] mt-1 leading-snug">
                    {skill.disclaimer}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[#E6E2D9]/60 pt-3 text-xs">
                  <span className="text-[#716F65]">
                    {skill.attempts} attempt{skill.attempts === 1 ? "" : "s"}
                  </span>
                  <Link
                    href={skill.href}
                    className="font-semibold text-[#203D35] hover:text-[#294C42] flex items-center gap-1 group"
                  >
                    <span>Practice</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lower Grid: Recent Learning Activity Log & Practice Deep Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recent Activity Log */}
        <div className="lg:col-span-8 bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
                Activity Log
              </span>
              <h3 className="font-heading font-semibold text-base text-[#30362F] mt-0.5">
                Recent Practice Sessions
              </h3>
            </div>
            <span className="text-xs text-[#929087]">
              {activities.length} total logged
            </span>
          </div>

          {!hasAnyActivity ? (
            <div className="p-8 text-center text-xs text-[#716F65] bg-[#FAF9F5] rounded-xl border border-dashed border-[#E6E2D9]">
              No learning activity recorded yet. Start practicing in any module to build your personal intelligence history!
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
              {activities.slice(-12).reverse().map((act) => (
                <div
                  key={act.id}
                  className="p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-center justify-between text-xs hover:border-[#CEDDD2] transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-white border border-[#E6E2D9] text-[#203D35]">
                      {act.module}
                    </span>
                    <span className="text-[#30362F] font-medium truncate">
                      {act.exerciseId}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {act.score !== null && (
                      <span className="text-xs font-semibold text-[#327653] bg-[#E7F2E9] border border-[#CEDDD2] px-2 py-0.5 rounded">
                        {act.score}%
                      </span>
                    )}
                    <span suppressHydrationWarning className="text-[11px] text-[#929087]">
                      {formatActivityTime(act.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar: Shortcuts & Reset */}
        <aside className="lg:col-span-4 flex flex-col gap-5">
          <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col gap-3">
            <h4 className="font-heading font-semibold text-sm text-[#30362F]">
              Jump to Practice
            </h4>
            <div className="flex flex-col gap-2">
              <Link
                href="/say-it"
                className="p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-center justify-between text-xs font-medium text-[#30362F] hover:bg-white hover:border-[#CEDDD2] transition-colors focus-accessible"
              >
                <span>Speaking Shadowing</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#716F65]" />
              </Link>
              <Link
                href="/dictation"
                className="p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-center justify-between text-xs font-medium text-[#30362F] hover:bg-white hover:border-[#CEDDD2] transition-colors focus-accessible"
              >
                <span>Listening Dictation</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#716F65]" />
              </Link>
              <Link
                href="/conversation"
                className="p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-center justify-between text-xs font-medium text-[#30362F] hover:bg-white hover:border-[#CEDDD2] transition-colors focus-accessible"
              >
                <span>AI Tutor Conversation</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#716F65]" />
              </Link>
              <Link
                href="/grammar"
                className="p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-center justify-between text-xs font-medium text-[#30362F] hover:bg-white hover:border-[#CEDDD2] transition-colors focus-accessible"
              >
                <span>Grammar Lessons</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#716F65]" />
              </Link>
              <Link
                href="/vocabulary"
                className="p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-center justify-between text-xs font-medium text-[#30362F] hover:bg-white hover:border-[#CEDDD2] transition-colors focus-accessible"
              >
                <span>Vocabulary Recall</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#716F65]" />
              </Link>
            </div>
          </div>

          {/* Reset progress */}
          <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col gap-2 text-xs text-[#716F65]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#30362F]">Data Persistence</span>
              <button
                type="button"
                onClick={handleResetData}
                className="inline-flex items-center gap-1 text-[11px] text-[#A5413B] hover:underline focus-accessible"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Local Data</span>
              </button>
            </div>
            <p className="text-[11px] leading-relaxed">
              When logged in, your learning intelligence and daily plans sync securely to PostgreSQL. When browsing as guest, progress is safely cached on this device.
            </p>
          </div>
        </aside>
      </div>

      {/* Achievement Unlock Toast Notification */}
      <AchievementToast achievement={activeToast} onDismiss={dismissToast} />
    </div>
  );
}
