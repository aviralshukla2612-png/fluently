"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Trophy,
  Award,
  AlertCircle,
  Volume2,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth.js";
import { useProgress } from "@/lib/learning/useProgress.js";
import { getCuratedFallbackExercise } from "@/lib/learning/adaptivePracticeGenerator.js";
import { createSignedExerciseToken, prepareClientExercise, evaluatePracticeSubmission } from "@/lib/learning/practiceEvaluator.js";

export default function SmartPracticeRunner({ initialSkill = "grammar" }) {
  const { preferences, isAuthenticated } = useAuth();
  const { logActivity, refreshProgress } = useProgress();

  const [selectedSkill, setSelectedSkill] = useState(initialSkill);
  const [exercise, setExercise] = useState(null);
  const [exerciseToken, setExerciseToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [difficultyAdaptation, setDifficultyAdaptation] = useState(null);

  // Practice session state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [currentSelectedOption, setCurrentSelectedOption] = useState("");
  const [currentTypedAnswer, setCurrentTypedAnswer] = useState("");
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [validationError, setValidationError] = useState("");

  const loadExercise = useCallback(async (skillToLoad) => {
    setIsLoading(true);
    setEvaluationResult(null);
    setUserAnswers({});
    setCurrentQuestionIdx(0);
    setCurrentSelectedOption("");
    setCurrentTypedAnswer("");
    setValidationError("");

    if (isAuthenticated) {
      try {
        const res = await fetch("/api/learning/practice/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skill: skillToLoad || selectedSkill,
            difficulty: preferences?.learningLevel || "intermediate",
            questionCount: 3,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.exercise) {
            setExercise(data.exercise);
            setExerciseToken(data.exercise.exerciseToken);
            setDifficultyAdaptation(data.difficultyAdaptation);
            setStartTime(Date.now());
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("[SmartPracticeRunner] Cloud generation failed, using curated fallback:", err);
      }
    }

    // Guest / Offline fallback
    const rawFallback = getCuratedFallbackExercise({
      skill: skillToLoad || selectedSkill,
      difficulty: preferences?.learningLevel || "intermediate",
    });
    const signedToken = createSignedExerciseToken(rawFallback);
    const clientSafe = prepareClientExercise(rawFallback, signedToken);

    setExercise(clientSafe);
    setExerciseToken(signedToken);
    setStartTime(Date.now());
    setIsLoading(false);
  }, [isAuthenticated, selectedSkill, preferences]);

  useEffect(() => {
    let isCancelled = false;
    const executeLoad = async () => {
      await Promise.resolve();
      if (!isCancelled) {
        loadExercise(selectedSkill);
      }
    };
    executeLoad();
    return () => {
      isCancelled = true;
    };
  }, [selectedSkill, loadExercise]);

  const questions = exercise?.questions || [];
  const currentQ = questions[currentQuestionIdx];
  const totalQuestions = questions.length;

  const handleSelectOption = (opt) => {
    setCurrentSelectedOption(opt);
    setValidationError("");
  };

  const handleSpeakText = (text) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleConfirmCurrentAnswer = () => {
    if (!currentQ) return;

    let ans = "";
    if (currentQ.type === "multiple_choice") {
      if (!currentSelectedOption) {
        setValidationError("Please select an answer option.");
        return;
      }
      ans = currentSelectedOption;
    } else {
      if (!currentTypedAnswer.trim()) {
        setValidationError("Please enter your answer.");
        return;
      }
      ans = currentTypedAnswer.trim();
    }

    const updatedAnswers = { ...userAnswers, [currentQ.id]: ans };
    setUserAnswers(updatedAnswers);
    setValidationError("");

    // Advance or submit
    if (currentQuestionIdx < totalQuestions - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setCurrentSelectedOption(updatedAnswers[questions[currentQuestionIdx + 1]?.id] || "");
      setCurrentTypedAnswer(updatedAnswers[questions[currentQuestionIdx + 1]?.id] || "");
    } else {
      submitPracticeSession(updatedAnswers);
    }
  };

  const submitPracticeSession = async (finalAnswers) => {
    setIsSubmitting(true);
    const durationSeconds = startTime ? Math.max(1, Math.round((Date.now() - startTime) / 1000)) : 60;
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    if (isAuthenticated) {
      try {
        const res = await fetch("/api/learning/practice/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseToken,
            userAnswers: finalAnswers,
            durationSeconds,
            sessionId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.evaluation) {
            setEvaluationResult(data.evaluation);
            setDifficultyAdaptation(data.difficultyAdaptation);
            refreshProgress();
            setIsSubmitting(false);
            return;
          }
        }
      } catch (err) {
        console.warn("[SmartPracticeRunner] Cloud submit error, evaluating locally:", err);
      }
    }

    // Local / Guest evaluation
    const localEval = evaluatePracticeSubmission({
      exerciseToken,
      userAnswers: finalAnswers,
    });

    if (localEval.success) {
      setEvaluationResult(localEval.evaluation);
      // Record completed activity locally
      logActivity({
        module: localEval.evaluation.skill,
        exerciseId: localEval.evaluation.exerciseId,
        score: localEval.evaluation.score,
        duration: durationSeconds,
        difficulty: localEval.evaluation.difficulty,
        status: "completed",
        metadata: {
          sessionId,
          isSmartPractice: true,
          targetConcept: localEval.evaluation.targetConcept,
          correctCount: localEval.evaluation.correctCount,
          totalQuestions: localEval.evaluation.totalQuestions,
        },
      });
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-12 text-center text-[#716F65] animate-pulse">
        <div className="w-10 h-10 rounded-full bg-[#E7F2E9] border border-[#CEDDD2] flex items-center justify-center text-[#203D35] mx-auto mb-3">
          <Zap className="w-5 h-5 text-[#327653]" />
        </div>
        <h4 className="font-heading font-semibold text-base text-[#30362F]">
          Generating Calibrated Exercise...
        </h4>
        <p className="text-xs mt-1">Analyzing recent history and preparing targeted practice questions.</p>
      </div>
    );
  }

  // --- RESULTS SCREEN ---
  if (evaluationResult) {
    const isPassing = evaluationResult.score >= 70;

    return (
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-6 max-w-2xl mx-auto">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2F0E9] pb-5">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
              Practice Complete
            </span>
            <h3 className="font-heading font-bold text-xl sm:text-2xl text-[#30362F] mt-0.5">
              {evaluationResult.title}
            </h3>
            <p className="text-xs text-[#716F65] mt-1">
              Target Concept: {evaluationResult.targetConcept}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#FAF9F5] border border-[#E6E2D9] px-4 py-3 rounded-xl self-start sm:self-auto">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isPassing ? "bg-[#E7F2E9] text-[#327653]" : "bg-[#F8E8E5] text-[#A5413B]"
              }`}
            >
              {isPassing ? <Trophy className="w-5 h-5 text-[#FDD835]" /> : <Award className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-heading font-bold text-2xl text-[#203D35]">
                {evaluationResult.score}%
              </div>
              <div className="text-[10px] uppercase font-semibold text-[#716F65]">
                {evaluationResult.correctCount} / {evaluationResult.totalQuestions} Correct
              </div>
            </div>
          </div>
        </div>

        {/* Adaptive Difficulty Recommendation Pill */}
        {difficultyAdaptation && (
          <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-start gap-3 text-xs">
            <div className="mt-0.5">
              {difficultyAdaptation.direction === "increase" && (
                <div className="w-6 h-6 rounded-md bg-[#E7F2E9] text-[#327653] flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              )}
              {difficultyAdaptation.direction === "decrease" && (
                <div className="w-6 h-6 rounded-md bg-[#F8E8E5] text-[#A5413B] flex items-center justify-center">
                  <TrendingDown className="w-3.5 h-3.5" />
                </div>
              )}
              {difficultyAdaptation.direction === "maintain" && (
                <div className="w-6 h-6 rounded-md bg-white border border-[#E6E2D9] text-[#716F65] flex items-center justify-center">
                  <Minus className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[#30362F] flex items-center gap-1.5">
                <span>Adaptive Recommendation:</span>
                <span className="capitalize text-[#203D35] font-bold">
                  {difficultyAdaptation.recommendedDifficulty} Difficulty
                </span>
              </div>
              <p className="text-[11px] text-[#716F65] mt-0.5 leading-relaxed">
                {difficultyAdaptation.reason}
              </p>
            </div>
          </div>
        )}

        {/* Question Breakdown */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#716F65]">
            Question Review
          </h4>
          <div className="flex flex-col gap-3">
            {evaluationResult.questionResults.map((qr, idx) => (
              <div
                key={qr.questionId}
                className={`p-4 rounded-xl border text-xs flex flex-col gap-2 ${
                  qr.isCorrect
                    ? "bg-[#E7F2E9]/40 border-[#CEDDD2]"
                    : "bg-[#F8E8E5]/40 border-[#E6B6B0]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {qr.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-[#327653] shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#A5413B] shrink-0" />
                    )}
                    <span className="font-semibold text-[#30362F]">Question {idx + 1}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      qr.isCorrect ? "bg-white text-[#327653]" : "bg-white text-[#A5413B]"
                    }`}
                  >
                    {qr.isCorrect ? "Correct" : "Needs Review"}
                  </span>
                </div>

                <div className="text-[11px] text-[#716F65]">
                  <div>Your answer: <strong className="text-[#30362F]">{qr.userAnswer || "(None)"}</strong></div>
                  {!qr.isCorrect && (
                    <div className="mt-0.5">
                      Correct answer: <strong className="text-[#203D35]">{qr.correctAnswer}</strong>
                    </div>
                  )}
                </div>

                {qr.explanation && (
                  <div className="text-[11px] text-[#716F65] bg-white/70 p-2.5 rounded-lg border border-[#E6E2D9]/70 leading-relaxed mt-1">
                    <strong>Rule:</strong> {qr.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-[#F2F0E9]">
          <Link
            href="/coach"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#716F65] hover:text-[#30362F] focus-accessible"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Consult Coach</span>
          </Link>

          <button
            type="button"
            onClick={() => loadExercise(selectedSkill)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#203D35] hover:bg-[#294C42] text-white rounded-xl text-xs font-semibold transition-colors focus-accessible shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Next Smart Practice</span>
          </button>
        </div>
      </div>
    );
  }

  // --- QUESTION RUNNER SCREEN ---
  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Exercise Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2F0E9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#E7F2E9] text-[#327653] border border-[#CEDDD2]">
              {exercise.difficulty}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
              {exercise.skill}
            </span>
          </div>
          <h3 className="font-heading font-bold text-lg sm:text-xl text-[#30362F] mt-0.5">
            {exercise.title}
          </h3>
          <p className="text-xs text-[#716F65] mt-1">{exercise.instructions}</p>
        </div>

        {/* Skill switcher pills */}
        <div className="flex items-center gap-1 bg-[#FAF9F5] border border-[#E6E2D9] p-1 rounded-xl text-xs self-start sm:self-auto">
          {["grammar", "vocabulary", "sentence_construction", "dictation"].map((sk) => (
            <button
              key={sk}
              type="button"
              onClick={() => setSelectedSkill(sk)}
              className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-colors focus-accessible ${
                selectedSkill === sk
                  ? "bg-[#203D35] text-white shadow-xs"
                  : "text-[#716F65] hover:text-[#30362F]"
              }`}
            >
              {sk === "sentence_construction" ? "Sentences" : sk}
            </button>
          ))}
        </div>
      </div>

      {/* Progress meter */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-[#716F65]">
          <span>
            Question {currentQuestionIdx + 1} of {totalQuestions}
          </span>
          <span className="font-semibold text-[#203D35]">
            {Math.round(((currentQuestionIdx + 1) / totalQuestions) * 100)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-full overflow-hidden">
          <div
            style={{ width: `${((currentQuestionIdx + 1) / totalQuestions) * 100}%` }}
            className="h-full bg-[#203D35] rounded-full transition-all duration-300"
          />
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="p-3 bg-[#F8E8E5] text-[#A5413B] text-xs rounded-xl flex items-center gap-2 border border-[#E6B6B0]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Question Prompt */}
      {currentQ && (
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-start justify-between gap-3">
            <div className="text-sm font-medium text-[#30362F] leading-relaxed">
              {currentQ.prompt}
            </div>
            {currentQ.type === "dictation" && (
              <button
                type="button"
                onClick={() => handleSpeakText(currentQ.prompt.replace(/^Listen and type:\s*['"]?|['"]?$/gi, ""))}
                className="p-2 rounded-lg bg-white border border-[#E6E2D9] text-[#203D35] hover:bg-[#FAF9F5] transition-colors focus-accessible shrink-0"
                title="Play Audio"
                aria-label="Play audio passage"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Multiple choice options */}
          {currentQ.type === "multiple_choice" && Array.isArray(currentQ.options) && (
            <div className="grid grid-cols-1 gap-2.5">
              {currentQ.options.map((opt, i) => {
                const isSelected = currentSelectedOption === opt;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`p-3.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between focus-accessible ${
                      isSelected
                        ? "bg-[#E3EDE6] border-[#CEDDD2] text-[#203D35] font-semibold shadow-xs"
                        : "bg-white border-[#E6E2D9] text-[#30362F] hover:bg-[#FAF9F5]"
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#327653] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Text input for fill-in-the-blank, sentence construction, or dictation */}
          {currentQ.type !== "multiple_choice" && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#716F65]">Your Answer</label>
              <input
                type="text"
                value={currentTypedAnswer}
                onChange={(e) => {
                  setCurrentTypedAnswer(e.target.value);
                  setValidationError("");
                }}
                placeholder="Type your answer here..."
                className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#30362F] focus-accessible"
                autoFocus
              />
            </div>
          )}
        </div>
      )}

      {/* Bottom Nav / Submission Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-[#F2F0E9]">
        <button
          type="button"
          disabled={currentQuestionIdx === 0}
          onClick={() => {
            if (currentQuestionIdx > 0) {
              setCurrentQuestionIdx((prev) => prev - 1);
              const prevQ = questions[currentQuestionIdx - 1];
              setCurrentSelectedOption(userAnswers[prevQ?.id] || "");
              setCurrentTypedAnswer(userAnswers[prevQ?.id] || "");
              setValidationError("");
            }
          }}
          className="text-xs font-semibold text-[#716F65] hover:text-[#30362F] disabled:opacity-30 disabled:pointer-events-none focus-accessible"
        >
          Previous
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleConfirmCurrentAnswer}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#203D35] hover:bg-[#294C42] text-white rounded-xl text-xs font-semibold transition-colors focus-accessible shadow-xs disabled:opacity-50"
        >
          <span>{currentQuestionIdx === totalQuestions - 1 ? "Submit Attempt" : "Next Question"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
