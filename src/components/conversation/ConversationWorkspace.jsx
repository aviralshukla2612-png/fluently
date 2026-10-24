"use client";

import React, { useState } from "react";
import { AlertCircle, RefreshCw, Sparkles, X } from "lucide-react";
import { useConversationSession } from "@/lib/ai/useConversationSession";
import ConversationHeader from "./ConversationHeader";
import MessageList from "./MessageList";
import ConversationComposer from "./ConversationComposer";
import ScenarioSelectorModal from "./ScenarioSelectorModal";
import ConversationSummaryModal from "./ConversationSummaryModal";

export default function ConversationWorkspace() {
  const {
    state,
    activeScenario,
    sendMessage,
    retryLastMessage,
    resetSession,
    changeScenario,
    changeLevel,
    changeCorrectionMode,
    toggleAutoSpeak,
    requestSummary,
    closeSummary,
    clearError,
    canRecognize,
    isRecording,
    voiceDraft,
    voiceError,
    clearVoiceError,
    startVoiceInput,
    stopVoiceInput,
    cancelVoiceInput,
    speakMessage,
    language,
    languageConfig,
    changeLanguage,
    hasVoiceForLanguage,
    voiceFallbackStatus,
    selectedVoice,
    previewVoice,
    isPreviewPlaying,
  } = useConversationSession();

  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [composerPrefill, setComposerPrefill] = useState("");

  const handleSuggestionClick = (phrase) => {
    setComposerPrefill(phrase);
  };

  const handleSelectScenario = (scenarioId) => {
    changeScenario(scenarioId);
    setScenarioModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 w-full max-w-5xl mx-auto px-2 sm:px-4 pb-2">
      {/* Session Header */}
      <ConversationHeader
        scenario={activeScenario}
        level={state.level}
        correctionMode={state.correctionMode}
        autoSpeakReplies={state.autoSpeakReplies}
        messageCount={state.messages.length}
        status={state.status}
        language={language}
        languageConfig={languageConfig}
        onChangeLanguage={changeLanguage}
        hasVoiceForLanguage={hasVoiceForLanguage}
        voiceFallbackStatus={voiceFallbackStatus}
        selectedVoice={selectedVoice}
        onPreviewVoice={previewVoice}
        isPreviewPlaying={isPreviewPlaying}
        onOpenScenarioSelector={() => setScenarioModalOpen(true)}
        onChangeLevel={changeLevel}
        onChangeCorrectionMode={changeCorrectionMode}
        onToggleAutoSpeak={toggleAutoSpeak}
        onResetSession={resetSession}
        onRequestSummary={requestSummary}
      />

      {/* Error / Alert banner */}
      {state.error && (
        <div className="mb-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-start justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{state.error.message || "Something went wrong"}</p>
              {state.error.canRetry && (
                <p className="text-rose-600/90 text-xs mt-0.5">
                  Your last message was preserved. Click &quot;Retry&quot; below or try sending again.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {state.error.canRetry && (
              <button
                type="button"
                onClick={retryLastMessage}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={clearError}
              aria-label="Dismiss error"
              className="p-1 text-rose-400 hover:text-rose-700 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Conversation Area */}
      <div className="flex-1 min-h-0 bg-white/70 backdrop-blur-sm border border-stone-200/80 rounded-2xl flex flex-col overflow-hidden shadow-sm">
        <MessageList
          messages={state.messages}
          status={state.status}
          scenario={activeScenario}
          onSuggestionClick={handleSuggestionClick}
          onSpeak={speakMessage}
        />

        {/* Composer */}
        <div className="border-t border-stone-200/70 p-2 sm:p-3 bg-white/95 shrink-0">
          <ConversationComposer
            status={state.status}
            isSending={state.status === "sending"}
            canRecognize={canRecognize}
            isRecording={isRecording}
            voiceDraft={voiceDraft}
            voiceError={voiceError}
            onStartVoice={startVoiceInput}
            onStopVoice={stopVoiceInput}
            onCancelVoice={cancelVoiceInput}
            onClearVoiceError={clearVoiceError}
            voicePlaybackEnabled={state.autoSpeakReplies}
            onToggleVoicePlayback={toggleAutoSpeak}
            onSendMessage={sendMessage}
            lastFailedMessage={state.lastFailedMessage}
            onRetry={retryLastMessage}
            externalPrefill={composerPrefill}
            onClearPrefill={() => setComposerPrefill("")}
            languageConfig={languageConfig}
          />
        </div>
      </div>

      {/* Modals */}
      <ScenarioSelectorModal
        isOpen={scenarioModalOpen}
        onClose={() => setScenarioModalOpen(false)}
        currentScenarioId={state.scenarioId}
        onSelectScenario={handleSelectScenario}
      />

      <ConversationSummaryModal
        isOpen={state.summaryModalOpen}
        onClose={closeSummary}
        summaryData={state.summaryData}
        loading={state.summaryLoading}
        error={state.summaryError}
        onRetry={requestSummary}
        messageCount={state.messages.length}
      />
    </div>
  );
}
