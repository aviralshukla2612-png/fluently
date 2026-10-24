"use client";

import { useState, useRef, useSyncExternalStore } from "react";
import {
  Send,
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
  X,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

const emptySubscribe = () => () => {};

export default function ConversationComposer({
  onSendMessage = () => {},
  isSending = false,
  status = "idle",
  // Voice controls
  canRecognize = false,
  isRecording = false,
  voiceDraft = "",
  voiceError = "",
  onStartVoice,
  onStopVoice,
  onCancelVoice,
  onClearVoiceError,
  // Backward compatibility prop aliases
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  // Audio playback toggle
  voicePlaybackEnabled = true,
  autoSpeakReplies,
  onToggleVoicePlayback,
  toggleAutoSpeak,
  // Prefill & retry
  externalPrefill = "",
  onClearPrefill = () => {},
  lastFailedMessage = "",
  onRetry = () => {},
  languageConfig = null,
}) {
  const [inputText, setInputText] = useState("");
  const [prevExternalPrefill, setPrevExternalPrefill] = useState(externalPrefill);
  const [prevRecording, setPrevRecording] = useState(isRecording);
  const [lastCommittedVoice, setLastCommittedVoice] = useState("");
  const textareaRef = useRef(null);

  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const hasRecognition = isHydrated && Boolean(canRecognize);
  const effectiveIsSending = isSending || status === "sending";
  const effectivePlayback = autoSpeakReplies !== undefined ? autoSpeakReplies : voicePlaybackEnabled;

  const handleStart = onStartVoice || onStartRecording || (() => {});
  const handleStop = onStopVoice || onStopRecording || (() => {});
  const handleCancel = onCancelVoice || onCancelRecording || (() => {});

  // Handle external prefill during render
  if (externalPrefill && externalPrefill !== prevExternalPrefill) {
    setPrevExternalPrefill(externalPrefill);
    setInputText(externalPrefill);
    if (onClearPrefill) onClearPrefill();
  }

  // When speech recognition finishes recording, commit the recognized transcript into textarea
  if (prevRecording && !isRecording) {
    setPrevRecording(false);
    const cleanDraft = (voiceDraft || "").trim();
    if (cleanDraft && cleanDraft !== lastCommittedVoice) {
      setLastCommittedVoice(cleanDraft);
      const cleanPrev = inputText.trim();
      const updated = !cleanPrev
        ? cleanDraft
        : cleanPrev.endsWith(cleanDraft)
        ? cleanPrev
        : `${cleanPrev} ${cleanDraft}`;
      setInputText(updated);
    }
  } else if (!prevRecording && isRecording) {
    setPrevRecording(true);
  }

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (isRecording) {
      handleStop();
    }

    const clean = inputText.trim();
    if (!clean || effectiveIsSending) return;

    onSendMessage(clean);
    setInputText("");
    setLastCommittedVoice("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextChange = (e) => {
    setInputText(e.target.value);
    // Auto-expand textarea
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      handleStop();
    } else {
      handleStart({ lang: languageConfig?.speechRecognitionLocale });
    }
  };

  const handleDismissVoiceError = () => {
    if (onClearVoiceError) onClearVoiceError();
    if (handleCancel) handleCancel();
  };

  const togglePlayback = onToggleVoicePlayback || toggleAutoSpeak || (() => {});

  const currentLangName = languageConfig?.name || "English";

  return (
    <div className="border-t border-[#E6E2D9] bg-white p-3 sm:p-4 rounded-b-3xl">
      {/* Speech Recognition Error Notice */}
      {voiceError && (
        <div
          role="alert"
          className="mb-2 p-2.5 rounded-xl bg-[#F8E8E5] text-[#A5413B] text-xs flex items-center justify-between animate-in fade-in"
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{voiceError}</span>
          </div>
          <button
            type="button"
            onClick={handleDismissVoiceError}
            className="p-1 hover:bg-black/5 rounded focus-accessible"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Speech Review Draft Banner (when listening or draft present) */}
      {isRecording && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 p-3 bg-[#FAF9F5] border border-[#CEDDD2] rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2 text-[#30362F] min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D94A64] animate-pulse shrink-0" aria-hidden="true" />
            <span className="font-semibold text-[#D94A64] shrink-0">Listening ({currentLangName})…</span>
            <span className="text-[#716F65] italic truncate">
              {voiceDraft ? `"${voiceDraft}"` : `Say your message in ${currentLangName}...`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#203D35] text-white text-[11px] font-semibold hover:bg-[#294C42] focus-accessible shadow-xs transition-colors"
              title="Finish listening and review text"
              aria-label="Finish listening"
            >
              <Square className="w-3 h-3 fill-current" aria-hidden="true" />
              <span>Done</span>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 text-[#716F65] hover:text-[#A5413B] rounded focus-accessible transition-colors"
              title="Discard voice recording"
              aria-label="Discard voice recording"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Main Composer Row */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3">
        {/* Voice Playback Toggle */}
        <button
          type="button"
          onClick={togglePlayback}
          className={`p-2.5 rounded-xl border transition-colors focus-accessible shrink-0 ${
            effectivePlayback
              ? "bg-[#E3EDE6] border-[#CEDDD2] text-[#203D35]"
              : "bg-[#FAF9F5] border-[#E6E2D9] text-[#929087] hover:text-[#30362F]"
          }`}
          title={
            effectivePlayback
              ? "Spoken replies enabled. Click to mute."
              : "Spoken replies muted. Click to enable audio."
          }
          aria-label={effectivePlayback ? "Mute spoken replies" : "Enable spoken replies"}
        >
          {effectivePlayback ? (
            <Volume2 className="w-4 h-4" aria-hidden="true" />
          ) : (
            <VolumeX className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        {/* Microphone Button */}
        {hasRecognition ? (
          <button
            type="button"
            onClick={handleVoiceToggle}
            disabled={effectiveIsSending}
            className={`p-2.5 rounded-xl border transition-all focus-accessible shrink-0 ${
              isRecording
                ? "bg-[#D94A64] border-[#D94A64] text-white animate-pulse shadow-sm"
                : "bg-[#FAF9F5] border-[#E6E2D9] text-[#716F65] hover:text-[#203D35] hover:border-[#CEDDD2]"
            } ${effectiveIsSending ? "opacity-40 cursor-not-allowed" : ""}`}
            title={isRecording ? "Stop listening" : `Start voice input (${currentLangName})`}
            aria-label={isRecording ? "Stop listening" : `Start voice input (${currentLangName})`}
          >
            {isRecording ? (
              <Square className="w-4 h-4 fill-current" aria-hidden="true" />
            ) : (
              <Mic className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="p-2.5 rounded-xl border border-[#E6E2D9] bg-[#FAF9F5] text-[#B8B5AD] cursor-not-allowed opacity-50 shrink-0"
            title="Speech recognition is not supported in this browser. You can type your message."
            aria-label="Speech recognition not supported in this browser"
          >
            <MicOff className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={effectiveIsSending}
            placeholder={
              isRecording
                ? "Listening... words will appear here"
                : languageConfig && languageConfig.id !== "en"
                  ? `Type or speak in ${languageConfig.name} (${languageConfig.nativeName})...`
                  : "Type or speak your message in English (Enter to send)..."
            }
            className="w-full px-4 py-2.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl text-sm text-[#30362F] placeholder:text-[#929087] focus-accessible resize-none max-h-[140px] leading-relaxed"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || effectiveIsSending}
          className="p-2.5 rounded-xl bg-[#203D35] text-white hover:bg-[#294C42] disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-accessible shadow-sm shrink-0"
          aria-label="Send message to AI tutor"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </form>

      <div className="flex items-center justify-between text-[11px] text-[#929087] pt-2 px-1">
        <span>
          Press <kbd className="px-1 py-0.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded text-[10px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded text-[10px]">Shift+Enter</kbd> for newline
        </span>
        <span>Voice is converted to text; no raw audio is sent to Ollama.</span>
      </div>
    </div>
  );
}
