"use client";

import { useState, useEffect, useCallback } from "react";
import { speakText } from "@/lib/voice/tts.js";
import { saveWordReview, getWordReviewState, REVIEW_INTERVAL_RULES } from "@/lib/learning/reviewScheduler.js";
import { recordActivity } from "@/lib/learning/progressService.js";
import {
  Volume2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Shuffle,
  Award,
} from "lucide-react";

export default function FlashcardDeck({ words = [] }) {
  const [deck, setDeck] = useState(() => (Array.isArray(words) && words.length > 0 ? [...words] : []));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [ratedCount, setRatedCount] = useState(0);

  const activeWord = deck[currentIndex] || deck[0];
  const reviewState = activeWord ? getWordReviewState(activeWord.id) : null;

  const handleNextCard = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev < deck.length - 1 ? prev + 1 : 0));
  }, [deck.length]);

  const handlePrevCard = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : deck.length - 1));
  }, [deck.length]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNextCard();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrevCard();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNextCard, handlePrevCard]);

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
  };

  const handlePlayPronunciation = (e) => {
    e?.stopPropagation();
    if (!activeWord?.word) return;
    speakText(activeWord.word, { lang: "en-US", rate: 0.9 });
  };

  const handleRateCard = (rating) => {
    if (!activeWord) return;
    saveWordReview(activeWord.id, rating);

    // Record activity in unified progress
    try {
      const scoreMap = { again: 0, hard: 50, good: 85, easy: 100 };
      recordActivity({
        module: "vocabulary",
        exerciseId: activeWord.id,
        score: scoreMap[rating],
        difficulty: activeWord.difficulty,
        status: "completed",
        metadata: {
          word: activeWord.word,
          rating,
          mode: "flashcard",
        },
      });
    } catch (err) {
      console.warn("[FlashcardDeck] Failed to record progress:", err);
    }

    setRatedCount((prev) => prev + 1);
    handleNextCard();
  };

  if (!activeWord) {
    return (
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-8 text-center text-[#716F65]">
        No vocabulary words available for flashcard review.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[680px] mx-auto w-full">
      {/* Deck Controls Header */}
      <div className="flex items-center justify-between text-xs text-[#716F65]">
        <span className="font-medium">
          Card {currentIndex + 1} of {deck.length} • Reviewed: {ratedCount}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShuffle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E6E2D9] text-[#716F65] hover:text-[#203D35] hover:bg-[#FAF9F5] transition-colors focus-accessible shadow-xs"
            title="Shuffle deck"
          >
            <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {/* Interactive 3D Flip Card Container */}
      <div
        onClick={() => setIsFlipped((prev) => !prev)}
        className="relative min-h-[340px] sm:min-h-[380px] bg-white border-2 border-[#E6E2D9] hover:border-[#CEDDD2] rounded-3xl p-6 sm:p-10 shadow-card hover:shadow-card-hover transition-all cursor-pointer flex flex-col justify-between select-none"
        role="button"
        tabIndex={0}
        aria-label={`Flashcard for ${activeWord.word}. Click or press space to flip.`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657] bg-[#E3EDE6] px-2.5 py-1 rounded-full">
            {activeWord.category}
          </span>

          <div className="flex items-center gap-2">
            {reviewState?.status && (
              <span className="text-[11px] font-medium text-[#716F65] bg-[#FAF9F5] border border-[#E6E2D9] px-2 py-0.5 rounded capitalize">
                Status: {reviewState.status}
              </span>
            )}
            <button
              type="button"
              onClick={handlePlayPronunciation}
              className="p-2 rounded-full bg-[#FAF9F5] border border-[#E6E2D9] text-[#203D35] hover:bg-[#E3EDE6] transition-colors focus-accessible"
              title="Pronounce word"
            >
              <Volume2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Card Body: Front vs Back */}
        <div className="my-auto py-6 flex flex-col items-center text-center">
          {!isFlipped ? (
            /* FRONT */
            <div className="flex flex-col items-center gap-3">
              <h3 className="font-heading font-bold text-4xl sm:text-5xl text-[#203D35]">
                {activeWord.word}
              </h3>
              <div className="flex items-center gap-2 text-sm text-[#716F65]">
                <span className="italic">{activeWord.partOfSpeech}</span>
                {activeWord.phoneticSpelling && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[#466657]">{activeWord.phoneticSpelling}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-[#929087] mt-4 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Click card or press Space to reveal meaning</span>
              </p>
            </div>
          ) : (
            /* BACK */
            <div className="flex flex-col items-center gap-4 text-left w-full">
              <div className="text-center w-full">
                <h4 className="font-heading font-bold text-2xl text-[#203D35]">
                  {activeWord.word}
                </h4>
                <p className="text-sm sm:text-base font-medium text-[#30362F] mt-2">
                  {activeWord.meaning}
                </p>
              </div>

              {/* Example box */}
              <div className="w-full p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl text-xs sm:text-sm text-[#716F65] leading-relaxed">
                <span className="font-semibold text-[#30362F] block mb-1">Context Example:</span>
                “{activeWord.exampleSentence}”
              </div>

              {activeWord.synonyms && activeWord.synonyms.length > 0 && (
                <div className="w-full flex items-center gap-2 text-xs text-[#716F65]">
                  <span className="font-semibold text-[#30362F]">Synonyms:</span>
                  <span>{activeWord.synonyms.join(", ")}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#F2F0E9] text-xs text-[#929087]">
          <span>Difficulty: <strong className="capitalize text-[#30362F]">{activeWord.difficulty}</strong></span>
          <span>{isFlipped ? "Select recall level below" : "Flip to assess recall"}</span>
        </div>
      </div>

      {/* Bottom Recall Rating Buttons (Active when flipped) */}
      {isFlipped ? (
        <div className="flex flex-col gap-2 p-4 bg-white border border-[#E6E2D9] rounded-2xl shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#30362F] text-center">
            How well did you recall this word?
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleRateCard("again")}
              className="px-3 py-2.5 rounded-xl border border-[#A5413B]/30 bg-[#F8E8E5] hover:bg-[#f6d7d2] text-[#A5413B] text-xs font-semibold transition-colors focus-accessible flex flex-col items-center"
            >
              <span>Again</span>
              <span className="text-[10px] font-normal opacity-80">0 days (review today)</span>
            </button>

            <button
              type="button"
              onClick={() => handleRateCard("hard")}
              className="px-3 py-2.5 rounded-xl border border-[#93621B]/30 bg-[#F8EFD9] hover:bg-[#f3e5c0] text-[#93621B] text-xs font-semibold transition-colors focus-accessible flex flex-col items-center"
            >
              <span>Hard</span>
              <span className="text-[10px] font-normal opacity-80">1 day</span>
            </button>

            <button
              type="button"
              onClick={() => handleRateCard("good")}
              className="px-3 py-2.5 rounded-xl border border-[#CEDDD2] bg-[#E3EDE6] hover:bg-[#d4e4d8] text-[#203D35] text-xs font-semibold transition-colors focus-accessible flex flex-col items-center"
            >
              <span>Good</span>
              <span className="text-[10px] font-normal opacity-80">3 days</span>
            </button>

            <button
              type="button"
              onClick={() => handleRateCard("easy")}
              className="px-3 py-2.5 rounded-xl border border-[#327653]/30 bg-[#E7F2E9] hover:bg-[#d3ebd7] text-[#327653] text-xs font-semibold transition-colors focus-accessible flex flex-col items-center"
            >
              <span>Easy</span>
              <span className="text-[10px] font-normal opacity-80">7 days</span>
            </button>
          </div>
        </div>
      ) : (
        /* Navigation Controls when not flipped */
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevCard}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[#E6E2D9] text-xs font-medium text-[#30362F] hover:bg-[#FAF9F5] transition-colors focus-accessible shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span>Previous</span>
          </button>

          <span className="text-xs text-[#929087]">Use Left/Right arrow keys to navigate</span>

          <button
            type="button"
            onClick={handleNextCard}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[#E6E2D9] text-xs font-medium text-[#30362F] hover:bg-[#FAF9F5] transition-colors focus-accessible shadow-xs"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
