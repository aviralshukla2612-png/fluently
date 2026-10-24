"use client";

export default function QuestionNavigator({
  questions = [],
  currentIndex = 0,
  savedResponses = {},
  onSelectQuestion,
}) {
  const answeredCount = questions.filter((q) => {
    const val = savedResponses[q.id];
    return val !== undefined && val !== null && String(val).trim().length > 0;
  }).length;

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-4 shadow-card">
      {/* Palette Header with Status Breakdown */}
      <div className="space-y-2.5 pb-3 mb-3 border-b border-[#F2F0E9]">
        <div className="flex items-center justify-between">
          <span className="font-heading font-semibold text-xs text-[#30362F]">Question Palette</span>
          <span className="text-[11px] font-mono text-[#716F65] bg-[#FAF9F5] px-2 py-0.5 rounded-full border border-[#E6E2D9]">
            {answeredCount} of {questions.length} answered
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#716F65]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E3EDE6] border border-[#327653]/40" />
            <span>Answered</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-[#E6E2D9]" />
            <span>Unanswered</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#203D35]" />
            <span>Current</span>
          </span>
        </div>
      </div>

      {/* Question Grid: 5 columns fitting neatly without horizontal overflow */}
      <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const userVal = savedResponses[q.id];
          const isAnswered =
            userVal !== undefined &&
            userVal !== null &&
            String(userVal).trim().length > 0;

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelectQuestion(idx)}
              className={`w-full h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all focus-accessible ${
                isCurrent
                  ? "bg-[#203D35] text-white shadow-xs font-bold ring-2 ring-[#203D35] ring-offset-1"
                  : isAnswered
                  ? "bg-[#E3EDE6] text-[#203D35] border border-[#CEDDD2] hover:bg-[#D4E4D8]"
                  : "bg-white border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-[#FAF9F5]"
              }`}
              aria-label={`Jump to question ${idx + 1}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
