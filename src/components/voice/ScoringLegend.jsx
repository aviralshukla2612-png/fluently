import { Check, X, ArrowRight, Plus } from "lucide-react";

export default function ScoringLegend() {
  return (
    <div className="bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      <span className="font-semibold text-[#30362F] text-[11px] uppercase tracking-wider">
        Scoring Key:
      </span>
      <div className="flex flex-wrap items-center gap-3">
        {/* Match */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E7F2E9] border border-[#CEDDD2] text-[#327653] font-medium text-xs">
          <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
          <span>Correct word</span>
        </span>

        {/* Missing / Deletion */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F8E8E5] border border-[#A5413B]/30 text-[#A5413B] font-medium text-xs line-through">
          <X className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
          <span>Missing word</span>
        </span>

        {/* Substituted */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F8EFD9] border border-[#93621B]/30 text-[#93621B] font-medium text-xs">
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
          <span>Substituted word</span>
        </span>

        {/* Extra / Insertion */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E8E5FF] border border-[#5146D8]/30 text-[#5146D8] font-medium text-xs">
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
          <span>Extra word</span>
        </span>
      </div>
    </div>
  );
}
