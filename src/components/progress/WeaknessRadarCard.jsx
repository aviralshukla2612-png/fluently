"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Headphones,
  Languages,
  BookMarked,
  MessageSquare,
} from "lucide-react";

const SKILL_ICONS = {
  speaking: Languages,
  dictation: Headphones,
  grammar: BookOpen,
  vocabulary: BookMarked,
  conversation: MessageSquare,
};

const STATUS_BADGES = {
  persistent: {
    label: "Persistent",
    className: "bg-[#FDF0EE] text-[#A5413B] border-[#F2C2BD]",
  },
  repeated: {
    label: "Repeated",
    className: "bg-[#FFF8E6] text-[#B87A00] border-[#FFE6A5]",
  },
  improving: {
    label: "Improving",
    className: "bg-[#E7F2E9] text-[#327653] border-[#CEDDD2]",
  },
  new: {
    label: "Recent Spot",
    className: "bg-[#FAF9F5] text-[#716F65] border-[#E6E2D9]",
  },
  insufficient_data: {
    label: "Needs Data",
    className: "bg-[#FAF9F5] text-[#929087] border-[#E6E2D9]",
  },
};

export default function WeaknessRadarCard({ weaknesses = [] }) {
  const safeWeaknesses = Array.isArray(weaknesses) ? weaknesses : [];

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Weakness Radar
          </span>
          <h3 className="font-heading font-semibold text-lg text-[#30362F] mt-0.5">
            Focus Areas & Growth Opportunities
          </h3>
        </div>

        <span className="text-xs font-semibold text-[#716F65] bg-[#FAF9F5] border border-[#E6E2D9] px-2.5 py-1 rounded-md">
          {safeWeaknesses.length} {safeWeaknesses.length === 1 ? "area" : "areas"} detected
        </span>
      </div>

      {/* Empty State */}
      {safeWeaknesses.length === 0 ? (
        <div className="py-8 px-4 text-center bg-[#FAF9F5] border border-dashed border-[#E6E2D9] rounded-xl flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#E7F2E9] border border-[#CEDDD2] flex items-center justify-center text-[#327653]">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-[#30362F]">No active weak spots detected!</span>
          <p className="text-xs text-[#716F65] max-w-md">
            Your accuracy across recent exercises is consistently strong. As you complete more advanced challenges, new targeted focus areas will appear here.
          </p>
        </div>
      ) : (
        /* List of Weaknesses */
        <div className="flex flex-col gap-3">
          {safeWeaknesses.map((w) => {
            const Icon = SKILL_ICONS[w.skill] || Sparkles;
            const statusConfig = STATUS_BADGES[w.status] || STATUS_BADGES.new;

            return (
              <div
                key={w.id}
                className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#CEDDD2] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-[#E6E2D9] flex items-center justify-center text-[#203D35] shrink-0 mt-0.5 sm:mt-0">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#30362F]">
                        {w.category}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${statusConfig.className}`}
                      >
                        {statusConfig.label}
                      </span>
                      {w.severity === "high" && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded border bg-[#FDF0EE] text-[#A5413B] border-[#F2C2BD] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>High Priority</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#716F65] leading-relaxed">
                      {w.evidence}
                    </p>
                  </div>
                </div>

                <Link
                  href={w.destination || "/"}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#203D35] hover:bg-[#294C42] text-white text-xs font-semibold shrink-0 transition-colors focus-accessible self-start sm:self-center"
                >
                  <span>Practice Now</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
