"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

export default function CorrectionCard({ corrections = [] }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!corrections || corrections.length === 0) return null;

  return (
    <div className="mt-2.5 rounded-xl border border-[#CEDDD2] bg-[#FAF9F5] p-3 text-xs text-[#30362F] shadow-xs">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-1.5 font-semibold text-[#203D35] hover:underline focus-accessible"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#327653]" aria-hidden="true" />
          <span>
            {corrections.length === 1 ? "Helpful English Tip" : `${corrections.length} Helpful English Tips`}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#716F65]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#716F65]" />
          )}
        </button>
        <span className="text-[10px] uppercase font-bold text-[#466657] bg-[#E3EDE6] px-2 py-0.5 rounded-md">
          Feedback
        </span>
      </div>

      {isExpanded && (
        <div className="mt-2.5 flex flex-col gap-2 pt-2 border-t border-[#E6E2D9]">
          {corrections.map((corr, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="line-through text-[#A5413B] opacity-80">
                  {corr.original}
                </span>
                <span className="text-[#716F65]">→</span>
                <span className="font-semibold text-[#327653] inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>{corr.corrected}</span>
                </span>
              </div>
              {corr.explanation && (
                <p className="text-[11px] text-[#716F65] leading-relaxed pl-4">
                  {corr.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
