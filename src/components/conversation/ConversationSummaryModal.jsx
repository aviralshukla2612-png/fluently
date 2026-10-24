"use client";

import { Award, BookOpen, CheckCircle, Sparkles, X } from "lucide-react";

export default function ConversationSummaryModal({
  isOpen = false,
  isLoading = false,
  error = "",
  summary = null,
  onClose = () => {},
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-modal-title"
    >
      <div className="bg-white border border-[#E6E2D9] rounded-3xl max-w-[620px] w-full p-6 sm:p-8 shadow-2xl flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E3EDE6] text-[#203D35] flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="summary-modal-title" className="font-heading font-bold text-lg text-[#30362F]">
                Conversation Learning Summary
              </h3>
              <p className="text-xs text-[#716F65]">
                Review key language patterns from this practice session
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#716F65] hover:text-[#30362F] rounded-lg transition-colors focus-accessible"
            aria-label="Close summary modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#203D35] border-t-transparent animate-spin" />
            <span className="text-xs font-medium text-[#716F65]">
              Analyzing your dialogue transcript...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-4 bg-[#F8E8E5] border border-[#A5413B]/30 rounded-2xl text-xs text-[#A5413B]">
            {error}
          </div>
        )}

        {/* Summary Content */}
        {summary && !isLoading && (
          <div className="flex flex-col gap-5 text-xs text-[#30362F]">
            {/* Topics Discussed */}
            {summary.topicsDiscussed && summary.topicsDiscussed.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="font-semibold uppercase tracking-wider text-[#466657] text-[11px]">
                  Topics Covered
                </span>
                <div className="flex flex-wrap gap-2">
                  {summary.topicsDiscussed.map((topic, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-[#FAF9F5] border border-[#E6E2D9] rounded-full text-xs font-medium text-[#30362F]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Useful Expressions */}
            {summary.usefulPhrases && summary.usefulPhrases.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="font-semibold uppercase tracking-wider text-[#466657] text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#327653]" />
                  <span>Key Phrases & Collocations</span>
                </span>
                <ul className="flex flex-col gap-1.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl p-4">
                  {summary.usefulPhrases.map((phrase, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#327653] shrink-0 mt-1.5" />
                      <span className="font-medium text-[#203D35]">{phrase}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Grammar Patterns */}
            {summary.grammarPatterns && summary.grammarPatterns.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="font-semibold uppercase tracking-wider text-[#466657] text-[11px] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#466657]" />
                  <span>Grammar Focus Patterns</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {summary.grammarPatterns.map((pat, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-[#E3EDE6] border border-[#CEDDD2] rounded-full text-xs font-medium text-[#203D35]"
                    >
                      {pat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Improved Expression */}
            {summary.improvedExpression && summary.improvedExpression.improved && (
              <div className="flex flex-col gap-2">
                <span className="font-semibold uppercase tracking-wider text-[#466657] text-[11px]">
                  Refined Phrasing Example
                </span>
                <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl flex flex-col gap-2">
                  {summary.improvedExpression.original && (
                    <div className="text-[11px] text-[#A5413B]">
                      <span className="font-semibold">Learner text:</span>{" "}
                      <span className="line-through">{summary.improvedExpression.original}</span>
                    </div>
                  )}
                  <div className="text-xs font-semibold text-[#327653] flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{summary.improvedExpression.improved}</span>
                  </div>
                  {summary.improvedExpression.explanation && (
                    <p className="text-[11px] text-[#716F65] leading-relaxed">
                      {summary.improvedExpression.explanation}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Next Practice Recommendation */}
            {summary.suggestedPractice && (
              <div className="p-4 bg-[#FAF9F5] border border-[#CEDDD2] rounded-2xl flex flex-col gap-1 text-xs">
                <span className="font-semibold text-[#203D35]">Suggested Next Focus:</span>
                <p className="text-[#716F65] leading-relaxed">{summary.suggestedPractice}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-[#F2F0E9]">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-[#203D35] text-white text-xs font-semibold hover:bg-[#294C42] shadow-sm transition-colors focus-accessible"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
}
