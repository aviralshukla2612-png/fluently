"use client";

import { useState, useEffect, useRef } from "react";
import { DICTATION_EXERCISES } from "@/data/dictation/exercises.js";
import { speakText, cancelSpeech, isSpeechSynthesisSupported, getAvailableVoices } from "@/lib/voice/tts.js";
import { scoreAttempt } from "@/lib/scoring/scoreAttempt.js";
import { recordActivity } from "@/lib/learning/progressService.js";
import {
  Play,
  Square,
  RotateCcw,
  Volume2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Eye,
  AlertCircle,
  Sparkles,
  Award,
} from "lucide-react";

export default function DictationWorkspace() {
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const filteredExercises =
    difficultyFilter === "all"
      ? DICTATION_EXERCISES
      : DICTATION_EXERCISES.filter((ex) => ex.difficulty === difficultyFilter);

  const [currentIndex, setCurrentIndex] = useState(0);
  const activeExercise = filteredExercises[currentIndex] || filteredExercises[0];

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  // User input and evaluation
  const [typedAnswer, setTypedAnswer] = useState("");
  const [hasChecked, setHasChecked] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [evaluationResult, setEvaluationResult] = useState(null);

  const textareaRef = useRef(null);

  // Load available voices on mount
  useEffect(() => {
    if (typeof window !== "undefined" && isSpeechSynthesisSupported()) {
      getAvailableVoices().then((loadedVoices) => {
        setVoices(loadedVoices);
        const naturalEn =
          loadedVoices.find((v) => v.lang === "en-US" && !v.name.includes("Google")) ||
          loadedVoices.find((v) => v.lang?.startsWith("en")) ||
          loadedVoices[0] ||
          null;
        setSelectedVoice(naturalEn);
      });
    }

    return () => {
      cancelSpeech();
    };
  }, []);

  // Reset exercise state when changing active sentence or filter
  const resetExerciseState = (newIndex = 0) => {
    cancelSpeech();
    setIsPlaying(false);
    setCurrentIndex(newIndex);
    setTypedAnswer("");
    setHasChecked(false);
    setIsRevealed(false);
    setShowHint(false);
    setHintsUsed(false);
    setValidationError("");
    setEvaluationResult(null);
  };

  const handleDifficultyChange = (diff) => {
    setDifficultyFilter(diff);
    cancelSpeech();
    setIsPlaying(false);
    setCurrentIndex(0);
    setTypedAnswer("");
    setHasChecked(false);
    setIsRevealed(false);
    setShowHint(false);
    setHintsUsed(false);
    setValidationError("");
    setEvaluationResult(null);
  };

  // Play audio
  const handlePlayAudio = (rate = playbackSpeed) => {
    if (!activeExercise?.text) return;
    if (isPlaying) {
      cancelSpeech();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    speakText(activeExercise.text, {
      lang: activeExercise.language || "en-US",
      rate,
      voice: selectedVoice,
      onStart: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  // Check answer
  const handleCheckAnswer = () => {
    const trimmed = typedAnswer.trim();
    if (!trimmed) {
      setValidationError("Please type what you heard before checking your answer.");
      if (textareaRef.current) textareaRef.current.focus();
      return;
    }

    setValidationError("");
    const result = scoreAttempt(activeExercise.text, trimmed);
    setEvaluationResult(result);
    setHasChecked(true);

    // Record activity in unified progress persistence
    if (result.status === "scored") {
      try {
        recordActivity({
          module: "dictation",
          exerciseId: activeExercise.id,
          score: result.textMatchScore,
          difficulty: activeExercise.difficulty,
          status: "completed",
          metadata: {
            hintsUsed,
            wer: result.wer,
            wordCount: result.referenceWordCount,
            correctWords: result.correctWordCount,
            missingWords: result.missingWordCount,
            extraWords: result.extraWordCount,
            substitutionCount: result.substitutionCount,
          },
        });
      } catch (err) {
        console.warn("[Dictation] Progress record failed:", err);
      }
    }
  };

  // Reveal answer manually
  const handleRevealAnswer = () => {
    setIsRevealed(true);
    setHintsUsed(true);
  };

  // Next / Previous navigation
  const handleNext = () => {
    if (currentIndex < filteredExercises.length - 1) {
      resetExerciseState(currentIndex + 1);
    } else {
      resetExerciseState(0);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      resetExerciseState(currentIndex - 1);
    }
  };

  const handleToggleHint = () => {
    setShowHint((prev) => !prev);
    setHintsUsed(true);
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1020px] mx-auto">
      {/* Top Filter and Progress Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E2D9] pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Active Dictation Unit
          </span>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#30362F]">
              Sentence {currentIndex + 1} of {filteredExercises.length}
            </h2>
            <span className="text-[11px] font-semibold text-[#466657] bg-[#E3EDE6] px-2.5 py-0.5 rounded-full capitalize">
              {activeExercise.difficulty}
            </span>
          </div>
        </div>

        {/* Difficulty Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {["all", "beginner", "intermediate", "advanced"].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => handleDifficultyChange(level)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors focus-accessible ${
                difficultyFilter === level
                  ? "bg-[#203D35] text-white shadow-xs"
                  : "bg-white border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-[#FAF9F5]"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Audio Controls & Transcription Input */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
            {/* Audio Waveform & Player Area */}
            <div className="bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl p-6 flex flex-col items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => handlePlayAudio(playbackSpeed)}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-sm transition-all focus-accessible ${
                  isPlaying
                    ? "bg-[#D94A64] text-white animate-pulse"
                    : "bg-[#203D35] text-white hover:bg-[#294C42] hover:scale-105"
                }`}
                aria-label={isPlaying ? "Stop audio playback" : "Play sentence audio"}
              >
                {isPlaying ? (
                  <Square className="w-6 h-6 fill-current" aria-hidden="true" />
                ) : (
                  <Play className="w-7 h-7 ml-1 fill-current" aria-hidden="true" />
                )}
              </button>

              <div className="text-center">
                <span className="text-xs font-semibold text-[#30362F]">
                  {isPlaying ? "Speaking sentence audio..." : "Click to listen"}
                </span>
                <p className="text-[11px] text-[#716F65] mt-0.5">
                  Category: <span className="font-medium text-[#30362F]">{activeExercise.category}</span>
                </p>
              </div>

              {/* Speed & Accent Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-[#716F65]">
                <button
                  type="button"
                  onClick={() => handlePlayAudio(0.8)}
                  disabled={isPlaying}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E6E2D9] hover:text-[#203D35] hover:bg-[#FAF9F5] disabled:opacity-50 transition-colors focus-accessible"
                >
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Slow Audio (0.8x)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlayAudio(1.0)}
                  disabled={isPlaying}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E6E2D9] hover:text-[#203D35] hover:bg-[#FAF9F5] disabled:opacity-50 transition-colors focus-accessible"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Normal Speed (1.0x)</span>
                </button>
              </div>
            </div>

            {/* Transcription Input Box */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="dictation-textarea"
                  className="text-xs font-semibold uppercase tracking-wider text-[#30362F]"
                >
                  Type What You Hear
                </label>
                <span className="text-xs text-[#929087]">
                  {typedAnswer.trim() ? `${typedAnswer.trim().split(/\s+/).length} words` : "0 words"}
                </span>
              </div>

              <textarea
                id="dictation-textarea"
                ref={textareaRef}
                rows={3}
                value={typedAnswer}
                onChange={(e) => {
                  setTypedAnswer(e.target.value);
                  if (validationError) setValidationError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCheckAnswer();
                  }
                }}
                placeholder="Type the exact sentence here as you listen..."
                disabled={hasChecked}
                className="w-full p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-sm text-[#30362F] placeholder:text-[#929087] focus-accessible resize-none disabled:bg-white disabled:opacity-90"
              />

              {validationError && (
                <div className="flex items-center gap-1.5 text-xs text-[#A5413B] mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{validationError}</span>
                </div>
              )}

              <p className="text-[11px] text-[#929087]">
                Tip: Press <kbd className="px-1.5 py-0.5 bg-white border border-[#E6E2D9] rounded text-[10px]">Enter</kbd> to submit. Punctuation and casing differences are evaluated leniently.
              </p>
            </div>

            {/* Hint Box (Optional) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleToggleHint}
                  className="inline-flex items-center gap-1.5 text-xs text-[#466657] hover:text-[#203D35] font-medium transition-colors focus-accessible"
                >
                  <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{showHint ? "Hide Hint" : "Need a Hint?"}</span>
                </button>

                {!hasChecked && !isRevealed && (
                  <button
                    type="button"
                    onClick={handleRevealAnswer}
                    className="inline-flex items-center gap-1.5 text-xs text-[#716F65] hover:text-[#30362F] transition-colors focus-accessible"
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reveal Sentence</span>
                  </button>
                )}
              </div>

              {showHint && (
                <div className="p-3.5 bg-[#FAF9F5] border border-[#CEDDD2] rounded-xl text-xs text-[#30362F] flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#466657]">First Word:</span>
                    <span className="font-mono font-medium">{activeExercise.hints.firstWord}...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#466657]">Sentence Length:</span>
                    <span>{activeExercise.hints.wordCount} words</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#466657]">Context:</span>
                    <span className="text-[#716F65]">{activeExercise.hints.category}</span>
                  </div>
                  <span className="text-[10px] text-[#929087] italic mt-1">
                    * Using hints is tracked to encourage independent recall.
                  </span>
                </div>
              )}

              {isRevealed && !hasChecked && (
                <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#30362F] flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#716F65]">
                    Reference Sentence
                  </span>
                  <p className="text-sm font-medium text-[#203D35]">
                    {activeExercise.text}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#F2F0E9]">
              <button
                type="button"
                onClick={() => resetExerciseState(currentIndex)}
                className="px-4 py-2 text-xs font-medium text-[#716F65] hover:text-[#30362F] transition-colors focus-accessible"
              >
                Reset Exercise
              </button>

              <div className="flex items-center gap-2">
                {!hasChecked ? (
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
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#203D35] text-white text-xs sm:text-sm font-semibold hover:bg-[#294C42] shadow-sm transition-colors focus-accessible"
                  >
                    <span>Next Sentence</span>
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Evaluation Results Card (Shown after Check Answer) */}
          {hasChecked && evaluationResult && (
            <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
              {/* Score Header */}
              <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
                    Evaluation Report
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-heading font-bold text-3xl sm:text-4xl text-[#203D35]">
                      {evaluationResult.textMatchScore}%
                    </span>
                    <div>
                      <h3 className="font-heading font-semibold text-base text-[#30362F]">
                        {evaluationResult.textMatchScore === 100
                          ? "Perfect Transcription!"
                          : evaluationResult.textMatchScore >= 80
                          ? "High Accuracy"
                          : evaluationResult.textMatchScore >= 60
                          ? "Good Progress"
                          : "Keep Practicing"}
                      </h3>
                      <p className="text-xs text-[#716F65]">
                        Dictation Accuracy Score
                        {hintsUsed && " (Hint-assisted)"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-12 h-12 rounded-full bg-[#E3EDE6] text-[#203D35] flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" aria-hidden="true" />
                </div>
              </div>

              {/* Word Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl">
                  <span className="text-[11px] text-[#716F65] block">Correct</span>
                  <span className="text-lg font-bold text-[#327653]">
                    {evaluationResult.correctWordCount}
                  </span>
                </div>
                <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl">
                  <span className="text-[11px] text-[#716F65] block">Substituted</span>
                  <span className="text-lg font-bold text-[#93621B]">
                    {evaluationResult.substitutionCount}
                  </span>
                </div>
                <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl">
                  <span className="text-[11px] text-[#716F65] block">Missing</span>
                  <span className="text-lg font-bold text-[#A5413B]">
                    {evaluationResult.missingWordCount}
                  </span>
                </div>
                <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl">
                  <span className="text-[11px] text-[#716F65] block">Extra Words</span>
                  <span className="text-lg font-bold text-[#466D91]">
                    {evaluationResult.extraWordCount}
                  </span>
                </div>
              </div>

              {/* Word-by-Word Alignment Breakdown */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#30362F]">
                  Word Alignment Breakdown
                </span>
                <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-wrap gap-2">
                  {evaluationResult.alignment.map((item, idx) => {
                    if (item.type === "match") {
                      return (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#E7F2E9] text-[#327653] border border-[#CEDDD2]"
                          title="Correctly transcribed"
                        >
                          {item.referenceWord}
                        </span>
                      );
                    }
                    if (item.type === "substitution") {
                      return (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#F8EFD9] text-[#93621B] border border-[#E6E2D9]"
                          title={`Expected "${item.referenceWord}", typed "${item.transcriptWord}"`}
                        >
                          <span className="line-through opacity-70">{item.transcriptWord}</span>{" "}
                          <span className="font-semibold underline">({item.referenceWord})</span>
                        </span>
                      );
                    }
                    if (item.type === "deletion") {
                      return (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#F8E8E5] text-[#A5413B] border border-[#E6E2D9]"
                          title={`Missing word: "${item.referenceWord}"`}
                        >
                          +{item.referenceWord} (missing)
                        </span>
                      );
                    }
                    if (item.type === "insertion") {
                      return (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#E9F0F7] text-[#466D91] border border-[#E6E2D9] line-through"
                          title={`Extra word: "${item.transcriptWord}"`}
                        >
                          {item.transcriptWord}
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>

              {/* Reference Reveal Box */}
              <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#466657]">
                  Full Reference Sentence
                </span>
                <p className="text-sm font-medium text-[#203D35]">
                  {activeExercise.text}
                </p>
                {activeExercise.notes && (
                  <p className="text-xs text-[#716F65] mt-1 italic">
                    Note: {activeExercise.notes}
                  </p>
                )}
              </div>

              {/* Retry / Next Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#F2F0E9]">
                <button
                  type="button"
                  onClick={() => resetExerciseState(currentIndex)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[#E6E2D9] text-xs font-medium text-[#30362F] hover:bg-[#FAF9F5] transition-colors focus-accessible shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Try Again</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#203D35] text-white text-xs sm:text-sm font-semibold hover:bg-[#294C42] shadow-sm transition-colors focus-accessible"
                >
                  <span>Next Sentence</span>
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Listening Technique & Sentence Browser */}
        <aside className="lg:col-span-5 flex flex-col gap-6">
          {/* Sentence Quick Switcher */}
          <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-base text-[#30362F]">
                Exercise Library
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="p-1 rounded-lg border border-[#E6E2D9] hover:bg-[#FAF9F5] disabled:opacity-30 transition-colors focus-accessible"
                  aria-label="Previous exercise"
                >
                  <ChevronLeft className="w-4 h-4 text-[#716F65]" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentIndex === filteredExercises.length - 1}
                  className="p-1 rounded-lg border border-[#E6E2D9] hover:bg-[#FAF9F5] disabled:opacity-30 transition-colors focus-accessible"
                  aria-label="Next exercise"
                >
                  <ChevronRight className="w-4 h-4 text-[#716F65]" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredExercises.map((ex, idx) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => resetExerciseState(idx)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-colors focus-accessible ${
                    currentIndex === idx
                      ? "bg-[#FAF9F5] border-[#203D35] font-semibold text-[#203D35]"
                      : "bg-white border-[#E6E2D9] text-[#716F65] hover:bg-[#FAF9F5]"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="w-5 h-5 rounded-full bg-[#E3EDE6] text-[#203D35] flex items-center justify-center text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate">{ex.category}</span>
                  </div>
                  <span className="text-[10px] font-medium capitalize text-[#929087] shrink-0">
                    {ex.difficulty}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Listening Technique Guide */}
          <div className="bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl p-6 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#466657]" aria-hidden="true" />
              <h3 className="font-heading font-semibold text-base text-[#30362F]">
                The Three-Pass Strategy
              </h3>
            </div>
            <ul className="flex flex-col gap-3 text-xs text-[#716F65]">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E3EDE6] text-[#203D35] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  <strong>Global Pass:</strong> Listen once without typing to absorb meaning and sentence flow.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E3EDE6] text-[#203D35] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  <strong>Content Pass:</strong> Replay and type the primary nouns and main verbs.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E3EDE6] text-[#203D35] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  <strong>Precision Pass:</strong> Use slow audio to catch unstressed prepositions, articles, and contractions.
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
