import ScoringLegend from "./ScoringLegend";
import { Check, X, ArrowRight, Plus } from "lucide-react";

export default function WordComparison({ alignment = [] }) {
  if (!alignment || alignment.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-7 shadow-card flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Word-by-Word Alignment
          </span>
          <h3 className="font-heading font-semibold text-base sm:text-lg text-[#30362F] mt-0.5">
            Detailed Comparison
          </h3>
        </div>
        <span className="text-xs text-[#716F65] bg-[#FAF9F5] border border-[#E6E2D9] px-2.5 py-1 rounded-md">
          {alignment.length} tokens evaluated
        </span>
      </div>

      {/* Aligned Tokens Flow Container */}
      <div
        className="flex flex-wrap items-center gap-2.5 p-4 sm:p-5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl leading-relaxed"
        role="list"
        aria-label="Word-level alignment details"
      >
        {alignment.map((item, idx) => {
          switch (item.type) {
            case "match":
              return (
                <span
                  key={idx}
                  role="listitem"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E7F2E9] border border-[#CEDDD2] text-[#327653] font-medium text-sm sm:text-base shadow-xs"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                  <span>{item.referenceWord}</span>
                  <span className="sr-only">(correct)</span>
                </span>
              );

            case "deletion":
              return (
                <span
                  key={idx}
                  role="listitem"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8E8E5] border border-[#A5413B]/40 text-[#A5413B] font-medium text-sm sm:text-base shadow-xs"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                  <span className="line-through">{item.referenceWord}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/70 px-1.5 py-0.5 rounded text-[#A5413B]">
                    missing
                  </span>
                  <span className="sr-only">(missing from your speech)</span>
                </span>
              );

            case "substitution":
              return (
                <span
                  key={idx}
                  role="listitem"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8EFD9] border border-[#93621B]/40 text-[#93621B] font-medium text-sm sm:text-base shadow-xs"
                >
                  <span className="line-through text-[#93621B]/70">{item.referenceWord}</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2]" aria-hidden="true" />
                  <span className="font-bold underline decoration-[#93621B]">{item.transcriptWord}</span>
                  <span className="sr-only">(substituted: expected {item.referenceWord}, you said {item.transcriptWord})</span>
                </span>
              );

            case "insertion":
              return (
                <span
                  key={idx}
                  role="listitem"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8E5FF] border border-[#5146D8]/40 text-[#5146D8] font-medium text-sm sm:text-base shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                  <span className="font-bold">{item.transcriptWord}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/70 px-1.5 py-0.5 rounded text-[#5146D8]">
                    extra
                  </span>
                  <span className="sr-only">(extra word spoken)</span>
                </span>
              );

            default:
              return null;
          }
        })}
      </div>

      {/* Legend */}
      <ScoringLegend />
    </div>
  );
}
