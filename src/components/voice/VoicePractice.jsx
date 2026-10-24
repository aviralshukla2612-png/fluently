"use client";

import { useState } from "react";
import { REFERENCE_SENTENCES } from "@/data/sentences";
import { useVoiceEngine } from "@/lib/voice/useVoiceEngine";
import { useAIFeedback } from "@/lib/ai/useAIFeedback.js";
import ReferenceAudioPlayer from "./ReferenceAudioPlayer";
import RecordingControls from "./RecordingControls";
import TranscriptPanel from "./TranscriptPanel";
import RecordedAudioPlayer from "./RecordedAudioPlayer";
import VoiceStatus from "./VoiceStatus";
import ScoreSummary from "./ScoreSummary";
import WordComparison from "./WordComparison";
import AttemptHistory from "./AttemptHistory";
import AIFeedbackPanel from "./AIFeedbackPanel";
import { Sparkles, ChevronRight, CheckCircle2, RotateCcw } from "lucide-react";

export default function VoicePractice() {
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0);
  const sentence = REFERENCE_SENTENCES[activeSentenceIndex] || REFERENCE_SENTENCES[0];

  const {
    state,
    playbackSpeed,
    setPlaybackSpeed,
    voices,
    selectedVoice,
    setSelectedVoice,
    playReference,
    stopReference,
    startRecording,
    stopRecording,
    resetSession,
    clearAttemptHistory,
    recordingDuration,
    recordedAudio,
    currentScore,
    attempts,
    interimTranscript,
    finalTranscript,
    recognitionError,
    errorMessage,
    capabilities,
    setSentence,
  } = useVoiceEngine({ initialSentence: sentence });

  const {
    status: aiStatus,
    feedback: aiFeedback,
    error: aiError,
    requestFeedback,
    retryFeedback,
    resetFeedback,
  } = useAIFeedback();

  const handleSelectSentence = (idx) => {
    resetFeedback();
    setActiveSentenceIndex(idx);
    setSentence(REFERENCE_SENTENCES[idx]);
  };

  const handleNextSentence = () => {
    const nextIdx = (activeSentenceIndex + 1) % REFERENCE_SENTENCES.length;
    handleSelectSentence(nextIdx);
  };

  const handleResetSession = () => {
    resetFeedback();
    resetSession();
  };

  const handleRequestAIFeedback = () => {
    if (!currentScore || currentScore.status === "unscorable") return;
    const latestAttempt = attempts[attempts.length - 1];
    requestFeedback({
      referenceText: sentence.text,
      transcriptText: finalTranscript,
      attemptId: latestAttempt?.id || `attempt-${Date.now()}`,
      difficulty: sentence.difficulty,
      contextNote: sentence.contextNote,
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5 max-w-[1020px] mx-auto pb-16">
      {/* Session Header & Sentence Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#E6E2D9] pb-2.5">
        <div className="flex items-center gap-2.5">
          <h2 className="font-heading font-bold text-lg sm:text-xl text-[#30362F]">
            Sentence {activeSentenceIndex + 1} of {REFERENCE_SENTENCES.length}
          </h2>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#466657] bg-[#E3EDE6] px-2 py-0.5 rounded-full border border-[#CEDDD2]">
            Unit 1
          </span>
        </div>

        {/* Quick sentence switcher tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {REFERENCE_SENTENCES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelectSentence(idx)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors focus-accessible ${
                activeSentenceIndex === idx
                  ? "bg-[#203D35] text-white shadow-xs"
                  : "bg-white border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-[#FAF9F5]"
              }`}
            >
              Drill {idx + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={handleNextSentence}
            className="p-1 rounded-full bg-[#FAF9F5] border border-[#E6E2D9] text-[#716F65] hover:text-[#203D35] hover:bg-white transition-colors focus-accessible ml-0.5"
            title="Next sentence"
            aria-label="Next sentence"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Real-time Status Alert / Feedback */}
      <div>
        <VoiceStatus
          state={state}
          errorMessage={errorMessage}
          recognitionError={recognitionError}
        />
      </div>

      {/* Main Two-Column Practice Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Column: Reference Player, Controls, and Assessment */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* 1. Reference Audio Player */}
          <ReferenceAudioPlayer
            sentence={sentence}
            state={state}
            playbackSpeed={playbackSpeed}
            onSpeedChange={setPlaybackSpeed}
            onPlay={playReference}
            onStop={stopReference}
            voices={voices}
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            disabled={!capabilities.ttsSupported}
          />

          {/* 2. Recording Controls */}
          <RecordingControls
            state={state}
            duration={recordingDuration}
            onStart={() => {
              resetFeedback();
              startRecording();
            }}
            onStop={stopRecording}
            disabled={!capabilities.recordingSupported}
          />

          {/* 3. Recorded Audio Playback */}
          <RecordedAudioPlayer
            key={recordedAudio?.audioUrl || "empty"}
            recordedAudio={recordedAudio}
            onRetry={handleResetSession}
          />

          {/* 4. Deterministic Speech Assessment & AI Coach */}
          {currentScore && (
            <div className="flex flex-col gap-6 pt-2">
              <ScoreSummary result={currentScore} />
              <WordComparison alignment={currentScore.alignment} />
              <AIFeedbackPanel
                status={aiStatus}
                feedback={aiFeedback}
                error={aiError}
                onRequest={handleRequestAIFeedback}
                onRetry={retryFeedback}
              />
            </div>
          )}
        </div>

        {/* Right Column: Real-time Transcript, History & Pedagogical Guidance */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Transcript Panel */}
          <TranscriptPanel
            interimTranscript={interimTranscript}
            finalTranscript={finalTranscript}
            recognitionSupported={capabilities.recognitionSupported}
            recognitionError={recognitionError}
            state={state}
          />

          {/* In-Memory Attempt History */}
          <AttemptHistory
            attempts={attempts}
            currentSentenceId={sentence.id}
            onClearHistory={clearAttemptHistory}
          />

          {/* Technique Guidelines Card */}
          <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#466657]" aria-hidden="true" />
              <h3 className="font-heading font-semibold text-base text-[#30362F]">
                The Shadowing Method
              </h3>
            </div>
            <p className="text-xs text-[#716F65] leading-relaxed">
              Listen once at normal speed. Then replay and speak the words
              simultaneously, matching the rhythm and intonation curve of the
              speaker rather than isolating individual sounds.
            </p>

            <ul className="flex flex-col gap-2 pt-2 border-t border-[#F2F0E9] text-xs text-[#716F65]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#327653] shrink-0 mt-0.5" aria-hidden="true" />
                <span>Deterministic word alignment uses standard Levenshtein distance.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#327653] shrink-0 mt-0.5" aria-hidden="true" />
                <span>AI Coach analyzes lexical alignment to provide context-aware tips.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#327653] shrink-0 mt-0.5" aria-hidden="true" />
                <span>Microphone audio remains local in browser memory.</span>
              </li>
            </ul>
          </div>

          {/* Reset / Clean State Button */}
          <div className="flex items-center justify-between p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#716F65]">
            <span>Need a fresh attempt?</span>
            <button
              type="button"
              onClick={handleResetSession}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E6E2D9] text-xs font-medium text-[#30362F] hover:bg-[#FAF9F5] transition-colors focus-accessible shadow-xs"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>Reset Exercise</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
