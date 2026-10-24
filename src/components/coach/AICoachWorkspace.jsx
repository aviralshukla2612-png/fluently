"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Sparkles,
  HelpCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Compass,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth.js";
import { useProgress } from "@/lib/learning/useProgress.js";
import { detectWeaknesses } from "@/lib/learning/weaknessDetector.js";
import { generateDeterministicCoachFallback } from "@/lib/ai/learningCoach.js";

export default function AICoachWorkspace() {
  const { preferences, isAuthenticated } = useAuth();
  const { activities } = useProgress();

  const weaknesses = detectWeaknesses(activities);
  const topWeakness = weaknesses.length > 0 ? weaknesses[0] : null;

  // Form states for error explanation
  const [questionText, setQuestionText] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [concept, setConcept] = useState("");
  const [skill, setSkill] = useState("grammar");
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [coachResponse, setCoachResponse] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleExplain = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) {
      setErrorMessage("Please enter the question or sentence you want explained.");
      return;
    }
    setErrorMessage("");
    setIsLoadingExplanation(true);

    if (isAuthenticated) {
      try {
        const res = await fetch("/api/learning/coach/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: questionText,
            userAnswer,
            correctAnswer,
            skill,
            concept: concept || topWeakness?.topicName || "General English",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.coachResponse) {
            setCoachResponse(data.coachResponse);
            setIsLoadingExplanation(false);
            return;
          }
        }
      } catch (err) {
        console.warn("[AICoachWorkspace] API error, using deterministic fallback:", err);
      }
    }

    // Local/guest or fallback
    const fallback = generateDeterministicCoachFallback({
      question: questionText,
      userAnswer,
      correctAnswer,
      skill,
      concept: concept || topWeakness?.topicName,
      level: preferences?.learningLevel || "intermediate",
      language: preferences?.preferredLanguage || "en",
    });

    setCoachResponse(fallback);
    setIsLoadingExplanation(false);
  };

  const handlePreloadWeakness = (w) => {
    setConcept(w.topicName || w.category);
    setSkill(w.module || "grammar");
    setQuestionText(`Help me master ${w.topicName || w.category}.`);
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1040px] mx-auto pb-12">
      {/* Top Banner: Smart Practice Callout */}
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
              Context-Aware Practice
            </span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#E7F2E9] text-[#327653] border border-[#CEDDD2]">
              Adaptive Difficulty
            </span>
          </div>
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#30362F]">
            Smart Practice Engine
          </h2>
          <p className="text-xs sm:text-sm text-[#716F65] leading-relaxed">
            {topWeakness
              ? `Your coach recommends targeted practice in ${topWeakness.category} (${topWeakness.topicName}) based on your recent activity.`
              : "Generate customized practice sessions calibrated to your current proficiency level and goals."}
          </p>
        </div>

        <Link
          href="/practice"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#203D35] hover:bg-[#294C42] text-white rounded-xl text-sm font-semibold transition-all shadow-xs shrink-0 focus-accessible"
        >
          <Zap className="w-4 h-4 text-[#FDD835]" />
          <span>Launch Smart Practice</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Ask Coach Form & Weakness Shortcuts (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-7 shadow-card flex flex-col gap-5">
            <div className="border-b border-[#F2F0E9] pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
                Tutor Assistance
              </span>
              <h3 className="font-heading font-semibold text-lg text-[#30362F] mt-0.5">
                Explain a Mistake or Concept
              </h3>
              <p className="text-xs text-[#716F65] mt-1">
                Enter any sentence, question, or error you encountered to receive a clear, level-appropriate explanation.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-[#F8E8E5] text-[#A5413B] text-xs rounded-xl flex items-center gap-2 border border-[#E6B6B0]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleExplain} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[#30362F]">Question or Sentence *</label>
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g. Yesterday she go to the library."
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#30362F] focus-accessible"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-[#30362F]">Your Answer (Optional)</label>
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="e.g. go"
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#30362F] focus-accessible"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-[#30362F]">Expected Answer (Optional)</label>
                  <input
                    type="text"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="e.g. went"
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#30362F] focus-accessible"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-[#30362F]">Skill Area</label>
                  <select
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#30362F] focus-accessible capitalize"
                  >
                    <option value="grammar">Grammar & Syntax</option>
                    <option value="vocabulary">Vocabulary & Diction</option>
                    <option value="sentence_construction">Sentence Construction</option>
                    <option value="dictation">Listening & Dictation</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-[#30362F]">Topic / Rule (Optional)</label>
                  <input
                    type="text"
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder="e.g. Past Simple Irregular Verbs"
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#30362F] focus-accessible"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoadingExplanation}
                className="mt-2 py-3 px-5 bg-[#203D35] hover:bg-[#294C42] text-white rounded-xl font-semibold transition-colors focus-accessible shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoadingExplanation ? (
                  <span>Analyzing Context...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#FDD835]" />
                    <span>Get Coach Explanation</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Detected Growth Areas */}
          {weaknesses.length > 0 && (
            <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
                Identified Growth Areas
              </span>
              <p className="text-xs text-[#716F65]">
                Click any topic below to automatically populate the coach explanation form:
              </p>
              <div className="flex flex-col gap-2 mt-1">
                {weaknesses.slice(0, 3).map((w, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handlePreloadWeakness(w)}
                    className="p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-center justify-between text-left hover:border-[#CEDDD2] hover:bg-white transition-all text-xs focus-accessible"
                  >
                    <div>
                      <div className="font-semibold text-[#30362F]">
                        {w.topicName || w.category}
                      </div>
                      <div className="text-[11px] text-[#716F65] mt-0.5">{w.evidence}</div>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white border border-[#E6E2D9] text-[#203D35]">
                      Ask Coach
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Coach Feedback Display (5 cols) */}
        <aside className="lg:col-span-5 flex flex-col gap-6">
          {!coachResponse ? (
            <div className="bg-white border border-[#E6E2D9] rounded-2xl p-8 shadow-card flex flex-col items-center justify-center text-center gap-3 text-[#716F65]">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF9F5] border border-[#E6E2D9] flex items-center justify-center text-[#203D35]">
                <GraduationCap className="w-6 h-6 text-[#466657]" />
              </div>
              <h4 className="font-heading font-semibold text-base text-[#30362F]">
                AI Learning Coach Ready
              </h4>
              <p className="text-xs max-w-xs leading-relaxed">
                Submit a mistake or question on the left to receive immediate, evidence-grounded explanations with practical examples.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#CEDDD2] rounded-2xl p-6 sm:p-7 shadow-card flex flex-col gap-5">
              <div className="border-b border-[#F2F0E9] pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E7F2E9] border border-[#CEDDD2] flex items-center justify-center text-[#203D35]">
                    <Sparkles className="w-4 h-4 text-[#327653]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#466657]">
                      Coach Feedback
                    </span>
                    <h4 className="font-heading font-bold text-base text-[#30362F] mt-0.5">
                      {coachResponse.title}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div className="text-xs text-[#30362F] leading-relaxed bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E6E2D9]">
                {coachResponse.explanation}
              </div>

              {/* Correct Answer if available */}
              {coachResponse.correctAnswer && (
                <div className="flex items-center gap-2 p-3 bg-[#E7F2E9]/60 border border-[#CEDDD2] rounded-xl text-xs">
                  <CheckCircle2 className="w-4 h-4 text-[#327653] shrink-0" />
                  <div>
                    <span className="font-semibold text-[#203D35]">Target Answer: </span>
                    <span className="font-medium text-[#30362F]">{coachResponse.correctAnswer}</span>
                  </div>
                </div>
              )}

              {/* Grammar Rule */}
              {coachResponse.grammarRule && (
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-semibold text-[#716F65] uppercase text-[10px]">
                    Underlying Rule
                  </span>
                  <p className="text-[#30362F] font-medium leading-relaxed">
                    {coachResponse.grammarRule}
                  </p>
                </div>
              )}

              {/* Examples */}
              {Array.isArray(coachResponse.examples) && coachResponse.examples.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="font-semibold text-[#716F65] uppercase text-[10px]">
                    Illustrative Examples
                  </span>
                  <div className="flex flex-col gap-2">
                    {coachResponse.examples.map((ex, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-lg border text-xs ${
                          ex.isContrasting
                            ? "bg-[#F8E8E5]/50 border-[#E6B6B0] text-[#716F65]"
                            : "bg-[#FAF9F5] border-[#E6E2D9] text-[#30362F]"
                        }`}
                      >
                        <div className="font-medium">{ex.phrase}</div>
                        {ex.usage && (
                          <div className="text-[11px] text-[#929087] mt-0.5">{ex.usage}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Memory Tip */}
              {coachResponse.learnerFriendlyTip && (
                <div className="flex items-start gap-2.5 p-3 bg-[#FAF7F0] border border-[#E8DFC8] rounded-xl text-xs text-[#6B5B3E]">
                  <Lightbulb className="w-4 h-4 text-[#B48425] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Memory Trick: </span>
                    <span>{coachResponse.learnerFriendlyTip}</span>
                  </div>
                </div>
              )}

              {/* Recommended Next Action */}
              {coachResponse.recommendedAction && (
                <div className="pt-2 border-t border-[#F2F0E9] flex items-center justify-between text-xs">
                  <span className="text-[#716F65]">{coachResponse.recommendedAction}</span>
                  <Link
                    href="/practice"
                    className="font-semibold text-[#203D35] hover:text-[#294C42] flex items-center gap-1 shrink-0"
                  >
                    <span>Practice Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
