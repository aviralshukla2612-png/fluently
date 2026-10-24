"use client";

import { useState } from "react";
import { recordActivity } from "@/lib/learning/progressService.js";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/learning/storage.js";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  Award,
  AlertCircle,
} from "lucide-react";

export default function GrammarQuiz({ lesson, onCompleteLesson, onBackToLesson }) {
  const questions = lesson.practiceQuestions || [];

  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState(false);
  const [scoreCount, setScoreCount] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [validationError, setValidationError] = useState("");

  const currentQ = questions[questionIndex];

  const handleSelectOption = (opt) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(opt);
    setValidationError("");
  };

  const handleCheckAnswer = () => {
    if (isAnswerSubmitted) return;

    let isCorrect = false;

    if (currentQ.type === "fill_blank") {
      const cleanTyped = typedAnswer.trim().toLowerCase();
      if (!cleanTyped) {
        setValidationError("Please enter your answer in the blank.");
        return;
      }
      setValidationError("");

      const validVariants = (currentQ.acceptedAnswers || []).map((ans) =>
        ans.trim().toLowerCase()
      );
      isCorrect = validVariants.includes(cleanTyped);
    } else {
      // multiple_choice or choose_correct
      if (!selectedOption) {
        setValidationError("Please select an option.");
        return;
      }
      setValidationError("");
      isCorrect = selectedOption === currentQ.correctAnswer;
    }

    setIsCurrentCorrect(isCorrect);
    setIsAnswerSubmitted(true);
    if (isCorrect) {
      setScoreCount((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setTypedAnswer("");
      setIsAnswerSubmitted(false);
      setIsCurrentCorrect(false);
      setValidationError("");
    } else {
      finalizeQuiz();
    }
  };

  const finalizeQuiz = () => {
    const finalScore = Math.round((scoreCount / questions.length) * 100);
    setQuizCompleted(true);

    // Save lesson progress state
    try {
      const progressStore = getItem(STORAGE_KEYS.GRAMMAR_PROGRESS, {});
      const existing = progressStore[lesson.id] || {};
      progressStore[lesson.id] = {
        lessonId: lesson.id,
        completed: true,
        highScore: Math.max(existing.highScore || 0, finalScore),
        attempts: (existing.attempts || 0) + 1,
        lastCompleted: new Date().toISOString(),
      };
      setItem(STORAGE_KEYS.GRAMMAR_PROGRESS, progressStore);

      // Record activity in unified progress tracking
      recordActivity({
        module: "grammar",
        exerciseId: lesson.id,
        score: finalScore,
        difficulty: lesson.difficulty,
        status: "completed",
        metadata: {
          lessonTitle: lesson.title,
          questionsCount: questions.length,
          correctCount: scoreCount,
        },
      });

      if (onCompleteLesson) {
        onCompleteLesson(lesson.id, finalScore);
      }
    } catch (err) {
      console.warn("[GrammarQuiz] Failed to record grammar progress:", err);
    }
  };

  const handleRestartQuiz = () => {
    setQuestionIndex(0);
    setSelectedOption(null);
    setTypedAnswer("");
    setIsAnswerSubmitted(false);
    setIsCurrentCorrect(false);
    setScoreCount(0);
    setQuizCompleted(false);
    setValidationError("");
  };

  if (!currentQ && !quizCompleted) {
    return (
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-8 text-center text-[#716F65]">
        No practice questions available for this lesson.
      </div>
    );
  }

  // Quiz completion summary view
  if (quizCompleted) {
    const finalPercentage = Math.round((scoreCount / questions.length) * 100);
    const passed = finalPercentage >= 70;

    return (
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-8 sm:p-10 shadow-card max-w-[620px] mx-auto text-center flex flex-col items-center gap-6">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center ${
            passed ? "bg-[#E3EDE6] text-[#203D35]" : "bg-[#F8EFD9] text-[#93621B]"
          }`}
        >
          <Award className="w-8 h-8" aria-hidden="true" />
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Lesson Practice Complete
          </span>
          <h3 className="font-heading font-bold text-3xl text-[#203D35] mt-1">
            {finalPercentage}% Score
          </h3>
          <p className="text-sm text-[#716F65] mt-2">
            You answered {scoreCount} of {questions.length} questions correctly.
            {passed
              ? " You've earned completion credit for this grammar unit!"
              : " Review the lesson notes and try once more to boost your mastery."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRestartQuiz}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#E6E2D9] text-xs font-semibold text-[#30362F] hover:bg-[#FAF9F5] transition-colors focus-accessible shadow-xs"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Retry Quiz</span>
          </button>

          <button
            type="button"
            onClick={onBackToLesson}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#203D35] text-white text-xs font-semibold hover:bg-[#294C42] shadow-sm transition-colors focus-accessible"
          >
            <span>Back to Curriculum</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-6 max-w-[720px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            {lesson.title} Practice
          </span>
          <h3 className="font-heading font-bold text-lg sm:text-xl text-[#30362F] mt-0.5">
            Question {questionIndex + 1} of {questions.length}
          </h3>
        </div>

        <button
          type="button"
          onClick={onBackToLesson}
          className="text-xs text-[#716F65] hover:text-[#30362F] hover:underline focus-accessible"
        >
          View Lesson Notes
        </button>
      </div>

      {/* Question Prompt */}
      <div className="flex flex-col gap-2">
        <h4 className="font-heading font-semibold text-base sm:text-lg text-[#30362F]">
          {currentQ.prompt}
        </h4>
      </div>

      {/* Answer Form: Multiple Choice vs Fill in Blank */}
      {currentQ.type === "fill_blank" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="grammar-fill-blank" className="text-xs font-medium text-[#716F65]">
            Type the missing word(s):
          </label>
          <input
            id="grammar-fill-blank"
            type="text"
            value={typedAnswer}
            onChange={(e) => {
              setTypedAnswer(e.target.value);
              if (validationError) setValidationError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isAnswerSubmitted) {
                e.preventDefault();
                handleCheckAnswer();
              }
            }}
            disabled={isAnswerSubmitted}
            placeholder="Type your answer here..."
            className="p-3.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-sm text-[#30362F] placeholder:text-[#929087] focus-accessible disabled:bg-white"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {currentQ.options.map((opt, idx) => {
            let optionStyles = "bg-[#FAF9F5] border-[#E6E2D9] text-[#30362F] hover:bg-white hover:border-[#CEDDD2]";

            if (selectedOption === opt && !isAnswerSubmitted) {
              optionStyles = "bg-[#E3EDE6] border-[#203D35] text-[#203D35] font-semibold";
            }

            if (isAnswerSubmitted) {
              if (opt === currentQ.correctAnswer) {
                optionStyles = "bg-[#E7F2E9] border-[#327653] text-[#327653] font-semibold";
              } else if (selectedOption === opt && opt !== currentQ.correctAnswer) {
                optionStyles = "bg-[#F8E8E5] border-[#A5413B] text-[#A5413B] font-semibold line-through";
              } else {
                optionStyles = "bg-white border-[#E6E2D9] text-[#929087] opacity-60";
              }
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(opt)}
                disabled={isAnswerSubmitted}
                className={`p-4 rounded-xl border text-left text-xs sm:text-sm transition-all focus-accessible flex items-start justify-between gap-3 ${optionStyles}`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                </div>

                {isAnswerSubmitted && opt === currentQ.correctAnswer && (
                  <CheckCircle2 className="w-4 h-4 text-[#327653] shrink-0 mt-0.5" aria-hidden="true" />
                )}
                {isAnswerSubmitted && selectedOption === opt && opt !== currentQ.correctAnswer && (
                  <XCircle className="w-4 h-4 text-[#A5413B] shrink-0 mt-0.5" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {validationError && (
        <div className="flex items-center gap-1.5 text-xs text-[#A5413B]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Immediate Pedagogical Feedback */}
      {isAnswerSubmitted && (
        <div
          className={`p-4 rounded-xl text-xs flex flex-col gap-1 border ${
            isCurrentCorrect
              ? "bg-[#E7F2E9] border-[#CEDDD2] text-[#327653]"
              : "bg-[#F8E8E5] border-[#E6E2D9] text-[#A5413B]"
          }`}
        >
          <div className="flex items-center gap-1.5 font-semibold text-sm">
            {isCurrentCorrect ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Correct!</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Incorrect</span>
              </>
            )}
          </div>
          <p className="text-[#30362F] mt-1">{currentQ.explanation}</p>
          {!isCurrentCorrect && currentQ.acceptedAnswers && (
            <p className="text-xs text-[#716F65] mt-1 font-medium">
              Accepted answer: {currentQ.acceptedAnswers.join(" or ")}
            </p>
          )}
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-[#F2F0E9]">
        <span className="text-xs text-[#929087]">
          Score: {scoreCount} / {questions.length}
        </span>

        {!isAnswerSubmitted ? (
          <button
            type="button"
            onClick={handleCheckAnswer}
            className="px-6 py-2.5 rounded-full bg-[#203D35] text-white text-xs sm:text-sm font-semibold hover:bg-[#294C42] shadow-sm transition-colors focus-accessible"
          >
            Check Answer
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNextQuestion}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#203D35] text-white text-xs sm:text-sm font-semibold hover:bg-[#294C42] shadow-sm transition-colors focus-accessible"
          >
            <span>{questionIndex < questions.length - 1 ? "Next Question" : "Complete Lesson"}</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
