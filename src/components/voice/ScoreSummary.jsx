import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlusCircle,
  HelpCircle,
} from "lucide-react";

export default function ScoreSummary({ result }) {
  if (!result || result.status === "unscorable") {
    return null;
  }

  const {
    textMatchScore,
    correctWordCount,
    missingWordCount,
    substitutionCount,
    extraWordCount,
    referenceWordCount,
    wer,
    referenceWordCoverage,
    status,
    statusMessage,
  } = result;

  const formattedScore =
    typeof textMatchScore === "number" ? Math.round(textMatchScore) : 0;
  const formattedWer =
    typeof wer === "number" ? (wer * 100).toFixed(1) : "N/A";
  const formattedCoverage =
    typeof referenceWordCoverage === "number"
      ? (referenceWordCoverage).toFixed(0)
      : "N/A";

  const isZeroOrEmpty = status === "empty_transcript" || formattedScore === 0;

  return (
    <div
      className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-7 shadow-card flex flex-col gap-6"
      role="region"
      aria-label="Speech scoring results"
    >
      {/* Accessible live summary for screen readers */}
      <div className="sr-only" aria-live="polite">
        Scoring result: {formattedScore}% text match. {correctWordCount} of {referenceWordCount} words correct, {missingWordCount} missing, {substitutionCount} substituted, {extraWordCount} extra words.
      </div>

      {/* Main Score Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2F0E9] pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Deterministic Assessment
          </span>
          <h3 className="font-heading font-bold text-2xl text-[#30362F] mt-0.5">
            Transcript Match Score
          </h3>
          <p className="text-xs text-[#716F65] mt-1">
            Lexical accuracy calculated via minimum edit distance (Levenshtein alignment).
          </p>
        </div>

        {/* Large Score Badge */}
        <div className="flex items-center gap-3 bg-[#FAF9F5] border border-[#E6E2D9] px-4 py-3 rounded-2xl shrink-0 self-start sm:self-auto">
          <div className="w-12 h-12 rounded-xl bg-[#203D35] text-white flex items-center justify-center font-heading font-bold text-xl shadow-xs">
            <Award className="w-6 h-6 stroke-[1.75]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading font-extrabold text-3xl sm:text-4xl text-[#203D35]">
                {formattedScore}%
              </span>
            </div>
            <span className="text-[11px] text-[#716F65] font-medium">
              Text Match
            </span>
          </div>
        </div>
      </div>

      {/* Four Core Metric Breakdown Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Correct Words */}
        <div className="p-3.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E7F2E9] text-[#327653] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 stroke-[2]" aria-hidden="true" />
          </div>
          <div>
            <div className="font-heading font-bold text-lg text-[#30362F]">
              {correctWordCount}
            </div>
            <span className="text-[11px] text-[#716F65] font-medium">
              Correct
            </span>
          </div>
        </div>

        {/* Missing Words */}
        <div className="p-3.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F8E8E5] text-[#A5413B] flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4 stroke-[2]" aria-hidden="true" />
          </div>
          <div>
            <div className="font-heading font-bold text-lg text-[#30362F]">
              {missingWordCount}
            </div>
            <span className="text-[11px] text-[#716F65] font-medium">
              Missing
            </span>
          </div>
        </div>

        {/* Substituted Words */}
        <div className="p-3.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F8EFD9] text-[#93621B] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 stroke-[2]" aria-hidden="true" />
          </div>
          <div>
            <div className="font-heading font-bold text-lg text-[#30362F]">
              {substitutionCount}
            </div>
            <span className="text-[11px] text-[#716F65] font-medium">
              Substituted
            </span>
          </div>
        </div>

        {/* Extra Words */}
        <div className="p-3.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E8E5FF] text-[#5146D8] flex items-center justify-center shrink-0">
            <PlusCircle className="w-4 h-4 stroke-[2]" aria-hidden="true" />
          </div>
          <div>
            <div className="font-heading font-bold text-lg text-[#30362F]">
              {extraWordCount}
            </div>
            <span className="text-[11px] text-[#716F65] font-medium">
              Extra Spoken
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Pedagogical Insights Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#716F65]">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[#929087]">Word Error Rate: </span>
            <span className="font-semibold text-[#30362F] font-mono">{formattedWer}%</span>
          </div>
          <span className="text-[#CEDDD2]">•</span>
          <div>
            <span className="text-[#929087]">Reference Coverage: </span>
            <span className="font-semibold text-[#30362F] font-mono">{formattedCoverage}%</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#929087]">
          <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Derived pedagogical metric, not an acoustic pronunciation score.</span>
        </div>
      </div>

      {isZeroOrEmpty && (
        <div className="p-3 bg-[#F8EFD9] border border-[#93621B]/30 rounded-xl text-xs text-[#93621B]">
          {statusMessage || "No spoken words were recognized in this attempt. Try recording again in a quiet environment."}
        </div>
      )}
    </div>
  );
}
