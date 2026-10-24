import {
  Sparkles,
  Bot,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { AI_STATUS } from "@/lib/ai/useAIFeedback.js";

export default function AIFeedbackPanel({
  status,
  feedback,
  error,
  onRetry,
  onRequest,
}) {
  // 1. Idle state before learner requests feedback
  if (status === AI_STATUS.IDLE && !feedback) {
    return (
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8E5FF] text-[#5146D8] flex items-center justify-center shrink-0 mt-0.5">
            <Bot className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h4 className="font-heading font-semibold text-base text-[#30362F]">
              AI Learning Coach
            </h4>
            <p className="text-xs text-[#716F65] mt-0.5">
              Get personalized tips, grammar context, and practice suggestions based on your attempt.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRequest}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5146D8] text-white text-xs font-semibold hover:bg-[#4338CA] transition-colors shrink-0 shadow-xs focus-accessible"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Get AI Feedback</span>
        </button>
      </div>
    );
  }

  // 2. Loading state
  if (status === AI_STATUS.LOADING) {
    return (
      <div
        className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-7 shadow-card flex flex-col items-center justify-center gap-3 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="w-12 h-12 rounded-full bg-[#E8E5FF] text-[#5146D8] flex items-center justify-center animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin text-[#5146D8]" aria-hidden="true" />
        </div>
        <div>
          <h4 className="font-heading font-semibold text-base text-[#30362F]">
            Consulting Your AI Coach...
          </h4>
          <p className="text-xs text-[#716F65] mt-1 max-w-sm">
            Analyzing word alignment and preparing targeted practice suggestions via Ollama.
          </p>
        </div>
      </div>
    );
  }

  // 3. Error state with retry
  if (status === AI_STATUS.ERROR || error) {
    return (
      <div
        className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col gap-4"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F8EFD9] text-[#93621B] flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-semibold text-base text-[#30362F]">
                AI Coach Offline
              </h4>
              <span className="text-[11px] font-mono text-[#93621B] bg-[#F8EFD9] px-2 py-0.5 rounded">
                {error?.code || "UNAVAILABLE"}
              </span>
            </div>
            <p className="text-xs text-[#716F65] mt-1 leading-relaxed">
              {error?.message || "The Ollama AI service could not be reached. Your deterministic text match score and recording remain completely saved."}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#F2F0E9] text-xs">
          <span className="text-[#929087]">
            Make sure your Ollama instance is active with model `llama3.2:1b`.
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FAF9F5] border border-[#E6E2D9] text-xs font-semibold text-[#30362F] hover:bg-[#FAF9F5] hover:border-[#CEDDD2] transition-colors focus-accessible shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry Analysis</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Success state with rich structured feedback
  if (!feedback) return null;

  const {
    overallFeedback,
    mistakeExplanations = [],
    practiceTips = [],
    practiceExamples = [],
    grammarNotes,
    nextStep,
    difficultyNote,
    modelUsed,
  } = feedback;

  return (
    <div
      className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-7 shadow-card flex flex-col gap-6"
      role="region"
      aria-label="AI Learning Feedback"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8E5FF] text-[#5146D8] flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 stroke-[2]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-heading font-bold text-lg text-[#30362F]">
                Your AI Coach
              </h4>
              <span className="text-[11px] font-semibold text-[#5146D8] bg-[#E8E5FF] px-2 py-0.5 rounded-full">
                Personalized
              </span>
            </div>
            <p className="text-xs text-[#716F65]">
              Powered by local Ollama ({modelUsed || "llama3.2:1b"})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-medium text-[#716F65] hover:text-[#30362F] flex items-center gap-1 focus-accessible"
          title="Refresh AI advice"
        >
          <RotateCcw className="w-3 h-3" aria-hidden="true" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Overall Coach Message */}
      <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-start gap-3">
        <Bot className="w-5 h-5 text-[#5146D8] shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs sm:text-sm text-[#30362F] leading-relaxed font-medium">
          {overallFeedback}
        </p>
      </div>

      {/* Specific Mistake Explanations (if any words were missing or substituted) */}
      {mistakeExplanations.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Targeted Word Feedback
          </span>
          <div className="grid grid-cols-1 gap-2.5">
            {mistakeExplanations.map((m, i) => (
              <div
                key={i}
                className="p-3.5 bg-white border border-[#E6E2D9] rounded-xl flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] uppercase ${
                      m.type === "missing"
                        ? "bg-[#F8E8E5] text-[#A5413B]"
                        : m.type === "extra"
                        ? "bg-[#E8E5FF] text-[#5146D8]"
                        : "bg-[#F8EFD9] text-[#93621B]"
                    }`}
                  >
                    {m.type}
                  </span>
                  <span className="font-bold text-[#30362F] text-sm">
                    “{m.word}”
                  </span>
                </div>
                <p className="text-[#716F65] sm:max-w-md sm:text-right">
                  {m.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practice Tips & Suggestions */}
      {practiceTips.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657] flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Practice Suggestions</span>
          </span>
          <ul className="flex flex-col gap-2 text-xs text-[#716F65]">
            {practiceTips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#327653] shrink-0 mt-0.5" aria-hidden="true" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Practice Examples */}
      {practiceExamples.length > 0 && (
        <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#30362F] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#466657]" aria-hidden="true" />
            <span>Similar Examples to Practice</span>
          </span>
          <div className="flex flex-col gap-1.5">
            {practiceExamples.map((ex, idx) => (
              <p key={idx} className="text-xs text-[#30362F] italic pl-2 border-l-2 border-[#CEDDD2]">
                “{ex}”
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Grammar Note (if present) */}
      {grammarNotes && (
        <div className="p-3.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#716F65]">
          <span className="font-semibold text-[#30362F]">Grammar Note: </span>
          {grammarNotes}
        </div>
      )}

      {/* Next Step Action */}
      <div className="pt-3 border-t border-[#F2F0E9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#203D35] font-semibold">
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Recommended Next Action:</span>
          <span className="font-normal text-[#716F65]">{nextStep}</span>
        </div>

        {difficultyNote && (
          <span className="text-[11px] text-[#929087] italic">
            {difficultyNote}
          </span>
        )}
      </div>
    </div>
  );
}
