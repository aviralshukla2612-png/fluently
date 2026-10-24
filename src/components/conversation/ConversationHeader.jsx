"use client";

import { useState } from "react";
import Link from "next/link";
import ScenarioSelectorModal from "./ScenarioSelectorModal";
import {
  ArrowLeft,
  Compass,
  RotateCcw,
  Award,
  SlidersHorizontal,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Info,
  HelpCircle,
} from "lucide-react";
import { SUPPORTED_LANGUAGES, getLanguageConfig } from "@/lib/languages.js";

export default function ConversationHeader({
  scenario = {},
  scenarioId = "free",
  onSelectScenario = () => {},
  level = "intermediate",
  onChangeLevel = () => {},
  correctionMode = "gentle",
  onChangeCorrectionMode = () => {},
  // Language props
  language = "en",
  languageConfig = null,
  onChangeLanguage = () => {},
  hasVoiceForLanguage = true,
  voiceFallbackStatus = "exact",
  selectedVoice = null,
  onPreviewVoice = () => {},
  isPreviewPlaying = false,
  // Session actions
  onNewSession = () => {},
  onResetSession,
  onRequestSummary = () => {},
  messagesCount = 0,
  messageCount = 0,
  onOpenScenarioSelector,
}) {
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);

  const effectiveCount = messageCount || messagesCount;
  const canRequestSummary = effectiveCount >= 3;
  const currentLang = languageConfig || getLanguageConfig(language);
  const handleReset = onNewSession || onResetSession || (() => {});
  const handleOpenScenario = onOpenScenarioSelector || (() => setIsScenarioModalOpen(true));

  return (
    <div className="flex flex-col gap-3 border-b border-[#E6E2D9] pb-4">
      {/* Top Row: Title, Scenario, Language, Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Go Back to Home */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E6E2D9] text-[#716F65] hover:text-[#203D35] hover:border-[#CEDDD2] hover:bg-[#FAF9F5] text-xs font-semibold transition-colors focus-accessible shadow-xs shrink-0"
            title="Go back to Home"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back</span>
          </Link>

          {/* Scenario Selector */}
          <button
            type="button"
            onClick={handleOpenScenario}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF9F5] border border-[#E6E2D9] text-[#203D35] hover:border-[#CEDDD2] hover:bg-white text-xs font-semibold transition-colors focus-accessible shadow-xs"
            title="Click to switch conversation scenario"
          >
            <Compass className="w-3.5 h-3.5 text-[#466657]" aria-hidden="true" />
            <span className="truncate max-w-[140px] sm:max-w-none">{scenario.name || "Free Conversation"}</span>
            <span className="text-[10px] text-[#716F65] bg-white border border-[#E6E2D9] px-1.5 py-0.5 rounded">
              Change
            </span>
          </button>

          {/* Quick Language Badge */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E6E2D9] text-[#203D35] hover:border-[#CEDDD2] text-xs font-medium transition-colors focus-accessible shadow-xs"
            title="Change conversation language in options"
          >
            <span className="text-sm leading-none" role="img" aria-label={currentLang.name}>
              {currentLang.flag}
            </span>
            <span className="font-semibold">{currentLang.name}</span>
            <span className="text-[10px] text-[#716F65]">({currentLang.nativeName})</span>
          </button>

          <span className="text-xs font-medium text-[#716F65] capitalize hidden md:inline">
            • {level} Level
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Options / Settings Toggle */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors focus-accessible ${
              isSettingsOpen
                ? "bg-[#203D35] text-white border-[#203D35]"
                : "bg-white border-[#E6E2D9] text-[#716F65] hover:text-[#30362F]"
            }`}
            title="Language, level, and voice options"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Options</span>
          </button>

          {/* Request Summary Button */}
          {canRequestSummary && (
            <button
              type="button"
              onClick={onRequestSummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#CEDDD2] text-[#203D35] hover:bg-[#FAF9F5] text-xs font-semibold transition-colors focus-accessible shadow-xs"
              title="Generate educational session summary"
            >
              <Award className="w-3.5 h-3.5 text-[#327653]" aria-hidden="true" />
              <span className="hidden sm:inline">Summary</span>
            </button>
          )}

          {/* New Session Button */}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-[#FAF9F5] text-xs font-medium transition-colors focus-accessible shadow-xs"
            title="Start new conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Expandable Options Tray (Language, Voice, Level & Feedback) */}
      {isSettingsOpen && (
        <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl flex flex-col gap-4 text-xs animate-in fade-in duration-200">
          {/* Row 1: Target Conversation Language */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#E6E2D9]">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#203D35]" aria-hidden="true" />
              <span className="font-semibold text-[#30362F]">Conversation Language:</span>
            </div>
            <div className="flex items-center flex-wrap gap-1.5 bg-white border border-[#E6E2D9] p-1 rounded-xl">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = currentLang.id === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => onChangeLanguage(lang.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors focus-accessible ${
                      isSelected
                        ? "bg-[#203D35] text-white font-semibold shadow-xs"
                        : "text-[#716F65] hover:text-[#30362F] hover:bg-[#FAF9F5]"
                    }`}
                    title={`Practice in ${lang.name} (${lang.nativeName})`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Voice & TTS Synthesis Diagnostic */}
          <div className="flex flex-col gap-2 pb-3 border-b border-[#E6E2D9]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#203D35]" aria-hidden="true" />
                  <span className="font-semibold text-[#30362F]">Spoken Voice for {currentLang.name}:</span>
                </div>
                <div className="text-[11px] text-[#716F65]">
                  {voiceFallbackStatus === "exact" || voiceFallbackStatus === "subtag" ? (
                    <span className="inline-flex items-center gap-1.5 text-[#327653]">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Native Voice: <strong>{selectedVoice?.name || "Installed"}</strong> ({selectedVoice?.lang || currentLang.locale})
                      </span>
                    </span>
                  ) : voiceFallbackStatus === "regional-fallback" ? (
                    <span className="inline-flex items-center gap-1.5 text-[#327653]">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#203D35]" />
                      <span>
                        Indic Voice Active: <strong>{selectedVoice?.name}</strong> &bull; Clear phonetic speech for {currentLang.name}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex flex-wrap items-center gap-1 text-[#555A52]">
                      <Info className="w-3.5 h-3.5 shrink-0 text-[#203D35]" />
                      <span>System default speech active.</span>
                      <button
                        type="button"
                        onClick={() => setShowVoiceHelp((prev) => !prev)}
                        className="text-[#203D35] font-semibold underline hover:text-[#327653] ml-1 inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>{showVoiceHelp ? "Hide guide" : `Add native ${currentLang.name} voice in Windows`}</span>
                      </button>
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onPreviewVoice?.(currentLang.sampleText)}
                disabled={isPreviewPlaying}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors shrink-0 self-start sm:self-auto focus-accessible ${
                  isPreviewPlaying
                    ? "bg-[#203D35] text-white border-[#203D35]"
                    : "bg-white border-[#CEDDD2] text-[#203D35] hover:bg-[#FAF9F5]"
                }`}
                title="Hear how the AI tutor will speak in this language"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isPreviewPlaying ? "text-white animate-pulse" : "text-[#327653]"}`} />
                <span>{isPreviewPlaying ? "Speaking..." : "Test Voice"}</span>
              </button>
            </div>

            {/* Windows Language Pack Installation Guide */}
            {showVoiceHelp && (
              <div className="p-3 bg-[#F4F6F0] border border-[#CEDDD2] rounded-xl text-xs text-[#30362F] space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between font-semibold text-[#203D35]">
                  <span>Quick Setup: Add native {currentLang.name} speech in Windows</span>
                  <button
                    type="button"
                    onClick={() => setShowVoiceHelp(false)}
                    className="text-[#716F65] hover:text-[#30362F] p-0.5"
                    aria-label="Close guide"
                  >
                    ✕
                  </button>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[#555A52] leading-relaxed">
                  <li>Press <kbd className="px-1.5 py-0.5 bg-white border border-[#CEDDD2] rounded text-[10px] font-mono text-[#203D35]">Win + I</kbd> on your keyboard to open Windows <strong>Settings</strong>.</li>
                  <li>Click <strong>Time &amp; Language</strong> &rarr; <strong>Language &amp; Region</strong> (or <strong>Speech</strong>).</li>
                  <li>Click <strong>Add a language</strong>, search for <strong>{currentLang.name} ({currentLang.nativeName})</strong>, make sure <strong>Text-to-speech</strong> is checked, and click <strong>Install</strong>.</li>
                  <li>Once downloaded, refresh this page in your browser — your tutor will speak with 100% native {currentLang.name} accent!</li>
                </ol>
              </div>
            )}
          </div>

          {/* Row 3: Level & Feedback Mode */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Proficiency Level */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#30362F]">Tutor Level:</span>
              <div className="flex items-center gap-1 bg-white border border-[#E6E2D9] p-0.5 rounded-lg">
                {["beginner", "intermediate", "advanced"].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onChangeLevel(lvl)}
                    className={`px-2.5 py-1 rounded text-xs capitalize transition-colors focus-accessible ${
                      level === lvl
                        ? "bg-[#203D35] text-white font-semibold"
                        : "text-[#716F65] hover:text-[#30362F]"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Correction Mode */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#30362F]">Feedback:</span>
              <div className="flex items-center gap-1 bg-white border border-[#E6E2D9] p-0.5 rounded-lg">
                {[
                  { id: "natural", label: "Natural Flow" },
                  { id: "gentle", label: "Gentle" },
                  { id: "tutor", label: "Full Tutor" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onChangeCorrectionMode(mode.id)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors focus-accessible ${
                      correctionMode === mode.id
                        ? "bg-[#203D35] text-white font-semibold"
                        : "text-[#716F65] hover:text-[#30362F]"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scenario Selector Modal */}
      <ScenarioSelectorModal
        isOpen={isScenarioModalOpen}
        currentScenarioId={scenarioId}
        onSelectScenario={onSelectScenario}
        onClose={() => setIsScenarioModalOpen(false)}
      />
    </div>
  );
}
