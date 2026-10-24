"use client";

import { useState, useMemo } from "react";
import { recordActivity } from "@/lib/learning/progressService.js";
import { saveWordReview } from "@/lib/learning/reviewScheduler.js";
import { CheckCircle2, XCircle, RotateCcw, ChevronRight, Award, HelpCircle } from "lucide-react";

export default function VocabularyQuiz({ words = [] }) {
  const [quizMode, setQuizMode] = useState("meaning"); // 'meaning' | 'recall'
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [scoreCount, setScoreCount] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const [quizSessionKey, setQuizSessionKey] = useState(0);

  // Generate 6 randomized questions based on available words
  const questions = useMemo(() => {
    if (!Array.isArray(words) || words.length < 4) return [];

    // Shuffle and pick 6 random target words for variety across the full bank
    const pool = [...words];
    for (let i = pool.length - 1; i > 0; i--) {
      const pseudo = Math.sin(quizSessionKey * 1000 + i * 37) * 10000;
      const j = Math.floor((pseudo - Math.floor(pseudo)) * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const targetWords = pool.slice(0, 6);
    const candidateDistractors = pool.slice(6);

    return targetWords.map((target, idx) => {
      // Pick 3 distractors
      const distractors = candidateDistractors.filter((w) => w.id !== target.id).slice(0, 3);
      const allChoices = [...distractors, target].sort(() => 0.5 - ((idx * 17 + 3) % 10) / 10);

      if (quizMode === "meaning") {
        return {
          id: `q-${target.id}-meaning-${quizSessionKey}`,
          word: target.word,
          prompt: `Which definition correctly matches "${target.word}"?`,
          partOfSpeech: target.partOfSpeech,
          correctAnswer: target.meaning,
          options: allChoices.map((c) => ({
            id: c.id,
            text: c.meaning,
            isCorrect: c.id === target.id,
          })),
          explanation: target.simpleDefinition,
          targetWord: target,
        };
      } else {
        // Word recall
        return {
          id: `q-${target.id}-recall-${quizSessionKey}`,
          word: target.word,
          prompt: `Select the word that matches: "${target.simpleDefinition}"`,
          context: target.exampleSentence.replace(new RegExp(`\\b${target.word}\\b`, "i"), "_______"),
          correctAnswer: target.word,
          options: allChoices.map((c) => ({
            id: c.id,
            text: c.word,
            isCorrect: c.id === target.id,
          })),
          explanation: `"${target.word}" means ${target.meaning}`,
          targetWord: target,
        };
      }
    });
  }, [words, quizMode, quizSessionKey]);

  const currentQ = questions[questionIndex];

  const handleSelectOption = (opt) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(opt);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);

    const isCorrect = selectedOption.isCorrect;
    if (isCorrect) {
      setScoreCount((prev) => prev + 1);
      // Spaced review boost
      saveWordReview(currentQ.targetWord.id, "good");
    } else {
      // Mark as again
      saveWordReview(currentQ.targetWord.id, "again");
    }

    // Record activity in unified progress
    try {
      recordActivity({
        module: "vocabulary",
        exerciseId: currentQ.targetWord.id,
        score: isCorrect ? 100 : 0,
        difficulty: currentQ.targetWord.difficulty,
        status: "completed",
        metadata: {
          mode: quizMode,
          word: currentQ.targetWord.word,
          isCorrect,
        },
      });
    } catch (err) {
      console.warn("[VocabQuiz] Failed to record progress:", err);
    }
  };

  const handleNextQuestion = () => {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleRestartQuiz = () => {
    setQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScoreCount(0);
    setQuizCompleted(false);
    setQuizSessionKey((k) => k + 1);
  };

  const handleModeChange = (mode) => {
    setQuizMode(mode);
    setQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScoreCount(0);
    setQuizCompleted(false);
    setQuizSessionKey((k) => k + 1);
  };

  if (!currentQ && !quizCompleted) {
    return (
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-8 text-center text-[#716F65]">
        Loading vocabulary quiz questions...
      </div>
    );
  }

  // Quiz completed results card
  if (quizCompleted) {
    const accuracy = Math.round((scoreCount / questions.length) * 100);
    return (
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-8 sm:p-10 shadow-card max-w-[620px] mx-auto text-center flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-[#E3EDE6] text-[#203D35] flex items-center justify-center">
          <Award className="w-8 h-8" aria-hidden="true" />
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Quiz Complete
          </span>
          <h3 className="font-heading font-bold text-3xl text-[#203D35] mt-1">
            {accuracy}% Accuracy
          </h3>
          <p className="text-sm text-[#716F65] mt-2">
            You answered {scoreCount} of {questions.length} questions correctly. Your review schedule has been updated.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRestartQuiz}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#203D35] text-white text-xs sm:text-sm font-semibold hover:bg-[#294C42] shadow-sm transition-colors focus-accessible"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>Practice Another Quiz</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[680px] mx-auto w-full">
      {/* Quiz Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E2D9] pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Vocabulary Recall Drill
          </span>
          <h3 className="font-heading font-bold text-lg sm:text-xl text-[#30362F] mt-0.5">
            Question {questionIndex + 1} of {questions.length}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 bg-[#FAF9F5] border border-[#E6E2D9] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => handleModeChange("meaning")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-accessible ${
              quizMode === "meaning"
                ? "bg-[#203D35] text-white shadow-xs"
                : "text-[#716F65] hover:text-[#30362F]"
            }`}
          >
            Meaning Match
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("recall")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-accessible ${
              quizMode === "recall"
                ? "bg-[#203D35] text-white shadow-xs"
                : "text-[#716F65] hover:text-[#30362F]"
            }`}
          >
            Word Recall
          </button>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
        {/* Prompt */}
        <div className="flex flex-col gap-2">
          <h4 className="font-heading font-semibold text-lg text-[#30362F]">
            {currentQ.prompt}
          </h4>
          {currentQ.context && (
            <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs sm:text-sm text-[#716F65] italic">
              “{currentQ.context}”
            </div>
          )}
        </div>

        {/* Options List */}
        <div className="flex flex-col gap-2.5">
          {currentQ.options.map((opt, idx) => {
            let optionStyles = "bg-[#FAF9F5] border-[#E6E2D9] text-[#30362F] hover:bg-white hover:border-[#CEDDD2]";

            if (selectedOption?.id === opt.id && !isAnswerSubmitted) {
              optionStyles = "bg-[#E3EDE6] border-[#203D35] text-[#203D35] font-semibold";
            }

            if (isAnswerSubmitted) {
              if (opt.isCorrect) {
                optionStyles = "bg-[#E7F2E9] border-[#327653] text-[#327653] font-semibold";
              } else if (selectedOption?.id === opt.id && !opt.isCorrect) {
                optionStyles = "bg-[#F8E8E5] border-[#A5413B] text-[#A5413B] font-semibold line-through";
              } else {
                optionStyles = "bg-white border-[#E6E2D9] text-[#929087] opacity-60";
              }
            }

            return (
              <button
                key={opt.id || idx}
                type="button"
                onClick={() => handleSelectOption(opt)}
                disabled={isAnswerSubmitted}
                className={`p-4 rounded-xl border text-left text-xs sm:text-sm transition-all focus-accessible flex items-start justify-between gap-3 ${optionStyles}`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt.text}</span>
                </div>

                {isAnswerSubmitted && opt.isCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-[#327653] shrink-0 mt-0.5" aria-hidden="true" />
                )}
                {isAnswerSubmitted && selectedOption?.id === opt.id && !opt.isCorrect && (
                  <XCircle className="w-4 h-4 text-[#A5413B] shrink-0 mt-0.5" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback / Explanation Box */}
        {isAnswerSubmitted && (
          <div
            className={`p-4 rounded-xl text-xs flex flex-col gap-1 border ${
              selectedOption?.isCorrect
                ? "bg-[#E7F2E9] border-[#CEDDD2] text-[#327653]"
                : "bg-[#F8E8E5] border-[#E6E2D9] text-[#A5413B]"
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-sm">
              {selectedOption?.isCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Not quite.</span>
                </>
              )}
            </div>
            <p className="text-[#30362F] mt-1">{currentQ.explanation}</p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-[#F2F0E9]">
          <span className="text-xs text-[#929087]">
            Score: {scoreCount} / {questions.length}
          </span>

          {!isAnswerSubmitted ? (
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!selectedOption}
              className="px-6 py-2.5 rounded-full bg-[#203D35] text-white text-xs sm:text-sm font-semibold hover:bg-[#294C42] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors focus-accessible"
            >
              Check Answer
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#203D35] text-white text-xs sm:text-sm font-semibold hover:bg-[#294C42] shadow-sm transition-colors focus-accessible"
            >
              <span>{questionIndex < questions.length - 1 ? "Next Question" : "View Results"}</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
