"use client";

import { useState, useEffect } from "react";
import { Sparkles, Lightbulb, Heart, RotateCcw, Bot } from "lucide-react";
import { generateDeterministicInsightsFallback } from "@/lib/ai/learningInsightsPrompt.js";

export default function AITutorInsightsCard({ analytics, weaknesses = [] }) {
  const [insights, setInsights] = useState(() =>
    generateDeterministicInsightsFallback({ analytics, weaknesses })
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInsights() {
      try {
        const res = await fetch("/api/learning/insights");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.insights) {
            setInsights(data.insights);
            return;
          }
        }
      } catch {
        // Fallback already rendered
      }

      if (isMounted) {
        setInsights(generateDeterministicInsightsFallback({ analytics, weaknesses }));
      }
    }

    loadInsights();

    return () => {
      isMounted = false;
    };
  }, [analytics, weaknesses]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/learning/insights");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.insights) {
          setInsights(data.insights);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback
    }
    setInsights(generateDeterministicInsightsFallback({ analytics, weaknesses }));
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-[#203D35] to-[#152823] text-white rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-5 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#327653]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#E7F2E9]">
            <Bot className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#CEDDD2]">
              Personalized Learning Intelligence
            </span>
            <h3 className="font-heading font-semibold text-lg text-white">
              AI Tutor Insights
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {insights?.source && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-[#CEDDD2] border border-white/10">
              {insights.source === "ollama_ai" ? "Ollama AI" : "Verified Intelligence"}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Refresh AI insights"
            className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white focus-accessible"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="py-8 text-center text-xs text-[#CEDDD2] flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 animate-spin text-[#CEDDD2]" />
          <span>Analyzing your learning patterns...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4 relative z-10 text-xs sm:text-sm">
          {/* Summary */}
          <p className="text-[#FAF9F5] leading-relaxed">
            {insights?.summary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Encouragement */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
              <Heart className="w-4 h-4 text-[#F4A79D] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#CEDDD2] block">
                  Encouragement
                </span>
                <p className="text-white text-xs mt-0.5 leading-snug">
                  {insights?.encouragement}
                </p>
              </div>
            </div>

            {/* Focus Tip */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-[#FDD835] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#CEDDD2] block">
                  Today&apos;s Focus
                </span>
                <p className="text-white text-xs mt-0.5 leading-snug">
                  {insights?.focusTip}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
