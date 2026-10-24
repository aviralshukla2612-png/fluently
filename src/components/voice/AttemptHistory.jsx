import { History, TrendingUp, TrendingDown, Minus, Trash2 } from "lucide-react";

export default function AttemptHistory({
  attempts = [],
  currentSentenceId,
  onClearHistory,
}) {
  // Filter attempts for the active target sentence
  const sentenceAttempts = attempts.filter(
    (att) => att.sentenceId === currentSentenceId
  );

  if (sentenceAttempts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#466657]" aria-hidden="true" />
          <h3 className="font-heading font-semibold text-base text-[#30362F]">
            Session Attempt History
          </h3>
        </div>

        <button
          type="button"
          onClick={onClearHistory}
          className="inline-flex items-center gap-1 text-[11px] text-[#929087] hover:text-[#A5413B] transition-colors focus-accessible px-2 py-0.5 rounded"
          title="Clear in-memory attempts"
        >
          <Trash2 className="w-3 h-3" aria-hidden="true" />
          <span>Clear</span>
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {sentenceAttempts.map((attempt, index) => {
          const prevAttempt = sentenceAttempts[index - 1];
          let scoreDiff = null;

          if (
            prevAttempt &&
            typeof attempt.score?.textMatchScore === "number" &&
            typeof prevAttempt.score?.textMatchScore === "number"
          ) {
            scoreDiff =
              Math.round(attempt.score.textMatchScore) -
              Math.round(prevAttempt.score.textMatchScore);
          }

          const scoreVal =
            typeof attempt.score?.textMatchScore === "number"
              ? Math.round(attempt.score.textMatchScore)
              : 0;

          return (
            <div
              key={attempt.id}
              className="p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-white border border-[#E6E2D9] font-mono text-[11px] font-semibold text-[#203D35] flex items-center justify-center shrink-0">
                  #{attempt.sequence}
                </span>

                <div className="flex flex-col">
                  <span className="font-medium text-[#30362F] truncate max-w-[200px] sm:max-w-xs">
                    “{attempt.transcriptText || "(no words recognized)"}”
                  </span>
                  <span className="text-[10px] text-[#929087]">
                    {attempt.timestamp}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {scoreDiff !== null && (
                  <span
                    className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      scoreDiff > 0
                        ? "bg-[#E7F2E9] text-[#327653]"
                        : scoreDiff < 0
                        ? "bg-[#F8E8E5] text-[#A5413B]"
                        : "bg-[#FAF9F5] text-[#929087]"
                    }`}
                  >
                    {scoreDiff > 0 ? (
                      <TrendingUp className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
                    ) : scoreDiff < 0 ? (
                      <TrendingDown className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
                    ) : (
                      <Minus className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
                    )}
                    {scoreDiff > 0 ? `+${scoreDiff}%` : `${scoreDiff}%`}
                  </span>
                )}

                <span className="font-heading font-bold text-sm text-[#203D35] bg-white border border-[#E6E2D9] px-2 py-0.5 rounded-lg">
                  {scoreVal}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
