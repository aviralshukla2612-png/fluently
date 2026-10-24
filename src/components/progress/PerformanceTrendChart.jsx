"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";

/**
 * Responsive Pure CSS/SVG Performance Trend Chart
 * Visualizes 7-day activity volume and average scores without external chart libraries.
 */
export default function PerformanceTrendChart({ timeline = [], overallTrend = null }) {
  const safeTimeline = useMemo(() => (Array.isArray(timeline) ? timeline : []), [timeline]);

  const maxCount = useMemo(() => {
    const counts = safeTimeline.map((t) => t.count || 0);
    return Math.max(5, ...counts);
  }, [safeTimeline]);

  const hasAnyData = safeTimeline.some((t) => t.count > 0);

  const getTrendIcon = () => {
    if (!overallTrend || overallTrend.status === "insufficient_data") {
      return <Minus className="w-3.5 h-3.5 text-[#929087]" aria-hidden="true" />;
    }
    if (overallTrend.direction === "improving") {
      return <TrendingUp className="w-3.5 h-3.5 text-[#327653]" aria-hidden="true" />;
    }
    if (overallTrend.direction === "declining") {
      return <TrendingDown className="w-3.5 h-3.5 text-[#A5413B]" aria-hidden="true" />;
    }
    return <Minus className="w-3.5 h-3.5 text-[#716F65]" aria-hidden="true" />;
  };

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Improvement Over Time
          </span>
          <h3 className="font-heading font-semibold text-lg text-[#30362F] mt-0.5">
            7-Day Score & Practice Trend
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#716F65] flex items-center gap-1.5 bg-[#FAF9F5] border border-[#E6E2D9] px-2.5 py-1 rounded-md">
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Past 7 Days</span>
          </span>
          {overallTrend && overallTrend.status !== "insufficient_data" && (
            <span
              className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-md border ${
                overallTrend.direction === "improving"
                  ? "bg-[#E7F2E9] border-[#CEDDD2] text-[#327653]"
                  : overallTrend.direction === "declining"
                  ? "bg-[#FDF0EE] border-[#F2C2BD] text-[#A5413B]"
                  : "bg-[#FAF9F5] border-[#E6E2D9] text-[#716F65]"
              }`}
            >
              {getTrendIcon()}
              <span>
                {overallTrend.change > 0 ? `+${overallTrend.change}%` : `${overallTrend.change}%`}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!hasAnyData ? (
        <div className="py-12 px-4 text-center bg-[#FAF9F5] border border-dashed border-[#E6E2D9] rounded-xl flex flex-col items-center justify-center gap-2">
          <span className="text-sm font-medium text-[#30362F]">No practice recorded in the last 7 days</span>
          <p className="text-xs text-[#929087] max-w-sm">
            Complete daily micro-drills to see your score trajectory, accuracy trend, and time investment charted here.
          </p>
        </div>
      ) : (
        /* Chart Visualization */
        <div className="flex flex-col gap-4">
          <div
            className="h-44 flex items-end justify-between gap-2 sm:gap-4 px-2 pt-4 pb-2"
            role="img"
            aria-label="7-day practice activity and score chart"
          >
            {safeTimeline.map((item, idx) => {
              const heightPercent = item.count === 0 ? 8 : Math.max(16, Math.min(100, Math.round((item.count / maxCount) * 100)));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                  {/* Tooltip on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-[#203D35] text-white text-[11px] px-2.5 py-1 rounded-md pointer-events-none whitespace-nowrap shadow-md z-10">
                    <span className="font-semibold">{item.count} drill{item.count === 1 ? "" : "s"}</span>
                    {item.averageScore !== null && <span> • Avg {item.averageScore}%</span>}
                    {item.durationMinutes > 0 && <span> • {item.durationMinutes}m</span>}
                  </div>

                  {/* Score pill if scored */}
                  <span className="text-[10px] font-semibold text-[#327653] min-h-[16px]">
                    {item.averageScore !== null ? `${Math.round(item.averageScore)}%` : ""}
                  </span>

                  {/* Bar column */}
                  <div className="w-full max-w-[36px] bg-[#FAF9F5] border border-[#E6E2D9] rounded-t-lg h-full flex items-end p-1">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded transition-all duration-500 ${
                        item.count > 0 ? "bg-[#203D35] group-hover:bg-[#294C42]" : "bg-[#E6E2D9]/40"
                      }`}
                    />
                  </div>

                  {/* Day label */}
                  <span className="text-xs text-[#716F65] font-medium">
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer legend */}
          <div className="flex items-center justify-between border-t border-[#F2F0E9] pt-3 text-xs text-[#929087]">
            <span>Bars indicate drill volume • Numbers above indicate average score</span>
            {overallTrend && overallTrend.message && (
              <span className="font-medium text-[#716F65]">{overallTrend.message}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
