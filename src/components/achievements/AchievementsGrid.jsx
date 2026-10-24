"use client";

import { useState, useMemo } from "react";
import {
  Trophy,
  Flame,
  Zap,
  ShieldCheck,
  Crown,
  Award,
  Medal,
  Sparkles,
  BookMarked,
  BookOpen,
  Layers,
  CheckCheck,
  Languages,
  MessageSquare,
  MessagesSquare,
  TrendingUp,
  Footprints,
  Lock,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { ACHIEVEMENT_CATEGORIES } from "@/lib/achievements/achievementCatalog.js";

const ICON_MAP = {
  Footprints,
  Flame,
  Zap,
  ShieldCheck,
  Crown,
  Award,
  Medal,
  Sparkles,
  BookMarked,
  BookOpen,
  Layers,
  CheckCheck,
  Languages,
  MessageSquare,
  MessagesSquare,
  TrendingUp,
};

const TIER_STYLES = {
  bronze: {
    badge: "bg-[#8D5B4C]/10 text-[#8D5B4C] border-[#8D5B4C]/25",
    border: "border-[#8D5B4C]/30",
    bg: "bg-[#FAF7F5]",
  },
  silver: {
    badge: "bg-[#64748B]/10 text-[#475569] border-[#64748B]/25",
    border: "border-[#94A3B8]/40",
    bg: "bg-[#F8FAFC]",
  },
  gold: {
    badge: "bg-[#B45309]/10 text-[#B45309] border-[#B45309]/25",
    border: "border-[#F59E0B]/40",
    bg: "bg-[#FFFDF7]",
  },
  platinum: {
    badge: "bg-[#4338CA]/10 text-[#4338CA] border-[#4338CA]/25",
    border: "border-[#818CF8]/40",
    bg: "bg-[#F5F7FF]",
  },
};

export default function AchievementsGrid({
  achievements = [],
  totalPoints = 0,
  unlockedCount = 0,
  totalCount = 0,
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const categories = [
    { id: "all", label: "All Badges" },
    { id: ACHIEVEMENT_CATEGORIES.CONSISTENCY, label: "Consistency" },
    { id: ACHIEVEMENT_CATEGORIES.ACTIVITY, label: "Activity" },
    { id: ACHIEVEMENT_CATEGORIES.VOCABULARY, label: "Vocabulary" },
    { id: ACHIEVEMENT_CATEGORIES.GRAMMAR, label: "Grammar" },
    { id: ACHIEVEMENT_CATEGORIES.SPEAKING, label: "Speaking" },
    { id: ACHIEVEMENT_CATEGORIES.IMPROVEMENT, label: "Improvement" },
  ];

  const filteredAchievements = useMemo(() => {
    return achievements.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter === "unlocked" && !item.isUnlocked) {
        return false;
      }
      if (statusFilter === "locked" && item.isUnlocked) {
        return false;
      }
      if (
        statusFilter === "in_progress" &&
        (item.isUnlocked || (item.progress || 0) === 0)
      ) {
        return false;
      }
      return true;
    });
  }, [achievements, selectedCategory, statusFilter]);

  const completionPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
      {/* Top Banner / Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2F0E9] pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Milestones & Honors
          </span>
          <h3 className="font-heading font-semibold text-lg sm:text-xl text-[#30362F] mt-0.5">
            Verified Achievements
          </h3>
          <p className="text-xs text-[#716F65] mt-1 max-w-xl">
            Deterministic awards earned through genuine practice. Never fabricated or bought.
          </p>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl p-3 px-4 self-start sm:self-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E7F2E9] border border-[#CEDDD2] flex items-center justify-center text-[#203D35]">
              <Trophy className="w-4 h-4 text-[#FDD835]" />
            </div>
            <div>
              <div className="font-heading font-bold text-base text-[#203D35]">
                {totalPoints} <span className="text-xs font-normal text-[#716F65]">pts</span>
              </div>
              <div className="text-[10px] text-[#929087] uppercase font-semibold">
                Total Score
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-[#E6E2D9]" />

          <div>
            <div className="font-heading font-bold text-base text-[#203D35]">
              {unlockedCount} / {totalCount}
            </div>
            <div className="text-[10px] text-[#929087] uppercase font-semibold">
              {completionPercentage}% Unlocked
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors focus-accessible ${
                  active
                    ? "bg-[#203D35] text-white shadow-xs"
                    : "bg-[#FAF9F5] text-[#716F65] border border-[#E6E2D9] hover:bg-white hover:text-[#30362F]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          <Filter className="w-3.5 h-3.5 text-[#716F65]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-lg text-xs text-[#30362F] focus-accessible"
          >
            <option value="all">All States</option>
            <option value="unlocked">Unlocked Only</option>
            <option value="in_progress">In Progress</option>
            <option value="locked">Locked Only</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {filteredAchievements.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#716F65] bg-[#FAF9F5] border border-dashed border-[#E6E2D9] rounded-xl">
          No achievements match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((item) => {
            const Icon = ICON_MAP[item.icon] || Award;
            const isUnlocked = item.isUnlocked;
            const isHidden = item.hidden && !isUnlocked;
            const tierStyle = TIER_STYLES[item.tier] || TIER_STYLES.bronze;
            const progress = item.progress || 0;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-xl border transition-all flex flex-col justify-between gap-4 ${
                  isUnlocked
                    ? `${tierStyle.bg} ${tierStyle.border} shadow-xs`
                    : "bg-[#FAF9F5]/70 border-[#E6E2D9] opacity-85"
                }`}
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        isUnlocked
                          ? "bg-white border-[#CEDDD2] text-[#203D35] shadow-xs"
                          : "bg-white/80 border-[#E6E2D9] text-[#929087]"
                      }`}
                    >
                      {isUnlocked ? (
                        <Icon className="w-5 h-5 text-[#327653]" />
                      ) : (
                        <Lock className="w-4 h-4 text-[#929087]" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierStyle.badge}`}
                      >
                        {item.tier}
                      </span>
                      <span className="text-[10px] font-semibold text-[#716F65] bg-white border border-[#E6E2D9] px-2 py-0.5 rounded-full">
                        +{item.points} pts
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4
                    className={`font-heading font-semibold text-sm ${
                      isUnlocked ? "text-[#30362F]" : "text-[#716F65]"
                    }`}
                  >
                    {isHidden ? "Secret Milestone" : item.name}
                  </h4>
                  <p className="text-xs text-[#716F65] mt-1 leading-relaxed">
                    {isHidden
                      ? "Keep practicing to uncover this hidden milestone."
                      : item.description}
                  </p>
                </div>

                {/* Footer / Progress */}
                <div className="border-t border-[#E6E2D9]/70 pt-3 flex flex-col gap-2">
                  {isUnlocked ? (
                    <div className="flex items-center justify-between text-[11px] text-[#327653] font-medium">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Unlocked</span>
                      </span>
                      {item.unlockedAt && (
                        <span suppressHydrationWarning className="text-[10px] text-[#929087]">
                          {new Date(item.unlockedAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] text-[#716F65]">
                        <span>
                          Progress: {item.current || 0} / {item.target || 1} {item.unit || ""}
                        </span>
                        <span className="font-semibold text-[#203D35]">{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white border border-[#E6E2D9] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${progress}%` }}
                          className="h-full bg-[#466657] rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
