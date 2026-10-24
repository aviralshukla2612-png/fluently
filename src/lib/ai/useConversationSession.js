"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { CONVERSATION_SCENARIOS } from "@/data/conversation/scenarios.js";
import {
  isSpeechRecognitionSupported,
  startSpeechRecognition,
  abortSpeechRecognition,
} from "../voice/speechRecognition.js";
import {
  isSpeechSynthesisSupported,
  speakText,
  cancelSpeech,
  findMatchingVoice,
  getMatchingVoices,
} from "../voice/tts.js";
import {
  getLanguageConfig,
  SUPPORTED_LANGUAGES,
  normalizeLanguageId,
} from "../languages.js";
import { recordActivity } from "../learning/progressService.js";
import { getItem, STORAGE_KEYS } from "../learning/storage.js";

const emptySubscribe = () => () => {};

export function getScenarioInitialGreeting(scenario, langId = "en") {
  const normalized = normalizeLanguageId(langId);
  const rawOpening = scenario?.openingQuestion || "Hi there! It's great to chat with you today. What's on your mind?";

  // Multilingual greetings if non-English
  if (normalized === "gu") {
    return {
      content: "નમસ્તે! આજે તમારી સાથે વાત કરીને ખૂબ આનંદ થયો.",
      followUpQuestion: "તમારા મનમાં શું છે, અથવા તમે કયા વિષય પર વાત કરવા માંગો છો?",
    };
  }
  if (normalized === "hi") {
    return {
      content: "नमस्ते! आज आपसे बात करके बहुत अच्छा लगा।",
      followUpQuestion: "आज आप किस बारे में बात करना चाहेंगे?",
    };
  }
  if (normalized === "es") {
    return {
      content: "¡Hola! Es un placer conversar contigo hoy.",
      followUpQuestion: "¿De qué te gustaría hablar hoy?",
    };
  }
  if (normalized === "fr") {
    return {
      content: "Bonjour ! C'est un plaisir d'échanger avec vous aujourd'hui.",
      followUpQuestion: "De quoi aimeriez-vous parler aujourd'hui ?",
    };
  }
  if (normalized === "de") {
    return {
      content: "Hallo! Es ist schön, heute mit dir zu sprechen.",
      followUpQuestion: "Worüber möchtest du heute sprechen?",
    };
  }

  // English: split opening into greeting and followUpQuestion if a question exists
  const sentences = rawOpening.split(/(?<=[.!?])\s+/);
  if (sentences.length > 1 && sentences[sentences.length - 1].includes("?")) {
    const followUp = sentences[sentences.length - 1];
    const greeting = sentences.slice(0, -1).join(" ");
    return {
      content: greeting,
      followUpQuestion: followUp,
    };
  }

  return {
    content: rawOpening,
    followUpQuestion: scenario?.followUpQuestion || null,
  };
}

export function useConversationSession({
  initialScenarioId = "free",
  initialLevel = "intermediate",
  initialCorrectionMode = "gentle",
  initialLanguage = "en",
} = {}) {
  // Session configuration
  const [scenarioId, setScenarioId] = useState(initialScenarioId);
  const activeScenario =
    CONVERSATION_SCENARIOS.find((s) => s.id === scenarioId) ||
    CONVERSATION_SCENARIOS[0];

  const [level, setLevel] = useState(initialLevel);
  const [correctionMode, setCorrectionMode] = useState(initialCorrectionMode);
  const [voicePlaybackEnabled, setVoicePlaybackEnabled] = useState(true);

  // Language configuration
  const [language, setLanguage] = useState(() => normalizeLanguageId(initialLanguage));
  const languageConfig = getLanguageConfig(language);

  // Installed voices in the browser
  const [installedVoices, setInstalledVoices] = useState([]);

  useEffect(() => {
    let active = true;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const updateVoices = () => {
        if (!active) return;
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          setInstalledVoices(voices);
        }
      };

      updateVoices();
      window.speechSynthesis.addEventListener("voiceschanged", updateVoices);

      // Chromium often loads voices asynchronously with a slight delay
      const t1 = setTimeout(updateVoices, 250);
      const t2 = setTimeout(updateVoices, 800);
      const t3 = setTimeout(updateVoices, 1800);

      return () => {
        active = false;
        window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, []);

  // Voice capabilities for the active target language
  const voiceMatchInfo = findMatchingVoice(installedVoices, languageConfig.speechSynthesisLocale);
  const matchingVoices = getMatchingVoices(languageConfig.speechSynthesisLocale, installedVoices);
  const hasVoiceForLanguage = voiceMatchInfo.matchType !== "none";
  const voiceFallbackStatus = voiceMatchInfo.matchType; // 'exact' | 'subtag' | 'regional-fallback' | 'none'
  const selectedVoice = voiceMatchInfo.voice;

  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Preview voice playback for the selected language
  const previewVoice = useCallback(
    (customText) => {
      cancelSpeech();
      setIsPreviewPlaying(true);
      const textToSpeak =
        customText ||
        languageConfig.sampleText ||
        "Hello! Welcome to Shadowly.";

      speakText(textToSpeak, {
        lang: languageConfig.speechSynthesisLocale,
        voice: selectedVoice,
        rate: 1.0,
        onEnd: () => setIsPreviewPlaying(false),
        onError: () => setIsPreviewPlaying(false),
      });
    },
    [languageConfig.sampleText, languageConfig.speechSynthesisLocale, selectedVoice]
  );

  // Conversation history
  const [sessionId, setSessionId] = useState("conv_session");
  const [messages, setMessages] = useState(() => {
    const initial = getScenarioInitialGreeting(activeScenario, initialLanguage);
    return [
      {
        id: "msg-welcome-0",
        role: "assistant",
        content: initial.content,
        corrections: [],
        usefulPhrase: null,
        followUpQuestion: initial.followUpQuestion,
        timestamp: new Date().toISOString(),
      },
    ];
  });

  // Request & engine state
  const [status, setStatus] = useState("idle"); // 'idle' | 'sending' | 'recording' | 'speaking' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingUserText, setPendingUserText] = useState("");

  // Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState("");
  const [voiceError, setVoiceError] = useState("");

  // Summary state
  const [summary, setSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  // Capability flags (useSyncExternalStore prevents SSR hydration mismatch)
  const canRecognize = useSyncExternalStore(
    emptySubscribe,
    () => isSpeechRecognitionSupported(),
    () => false
  );
  const canSpeak = useSyncExternalStore(
    emptySubscribe,
    () => isSpeechSynthesisSupported(),
    () => false
  );

  // Tracking and abort refs
  const hasLoggedProgressRef = useRef(false);
  const recognizerRef = useRef(null);
  const voiceSessionIdRef = useRef(0);
  const activeRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelSpeech();
      abortSpeechRecognition();
    };
  }, []);

  // Language switching during active session
  const changeLanguage = useCallback((newLangId) => {
    const normalized = normalizeLanguageId(newLangId);
    // Stop any active speech in the previous language immediately
    cancelSpeech();
    // Stop recording if active
    if (recognizerRef.current) {
      abortSpeechRecognition();
      recognizerRef.current = null;
      setIsRecording(false);
      setVoiceDraft("");
    }
    setLanguage(normalized);

    // If still on the initial welcome message, adapt greeting and followUpQuestion to the selected language
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        const initial = getScenarioInitialGreeting(activeScenario, normalized);
        return [
          {
            ...prev[0],
            content: initial.content,
            followUpQuestion: initial.followUpQuestion,
          },
        ];
      }
      return prev;
    });
  }, [activeScenario]);

  // Speak assistant reply
  const speakMessage = useCallback(
    (text, options = {}) => {
      if (!canSpeak || !text) return;
      cancelSpeech();
      setStatus("speaking");

      const targetLocale = options.lang || languageConfig.speechSynthesisLocale || "en-US";

      speakText(text, {
        lang: targetLocale,
        voice: selectedVoice,
        rate: options.rate || (level === "beginner" ? 0.88 : (targetLocale.startsWith("gu") || targetLocale.startsWith("hi") ? 0.90 : 1.0)),
        onStart: () => {
          if (isMountedRef.current) setStatus("speaking");
        },
        onEnd: () => {
          if (isMountedRef.current) setStatus("idle");
        },
        onError: () => {
          if (isMountedRef.current) setStatus("idle");
        },
      });
    },
    [canSpeak, languageConfig.speechSynthesisLocale, level, selectedVoice]
  );


  // Stop speaking
  const stopSpeaking = useCallback(() => {
    cancelSpeech();
    setStatus("idle");
  }, []);

  // Send message to AI tutor
  const sendMessage = useCallback(
    async (text, isRetry = false) => {
      const cleanText = (text || "").trim();
      if (!cleanText || status === "sending") return;

      cancelSpeech();
      setErrorMessage("");
      setPendingUserText("");

      let newHistory;
      if (
        isRetry &&
        messages.length > 0 &&
        messages[messages.length - 1].role === "user" &&
        messages[messages.length - 1].content === cleanText
      ) {
        newHistory = messages;
      } else {
        const userMessage = {
          id: `msg-user-${Date.now()}`,
          role: "user",
          content: cleanText,
          timestamp: new Date().toISOString(),
        };
        newHistory = [...messages, userMessage];
        setMessages(newHistory);
      }
      setStatus("sending");

      const currentReqId = ++activeRequestIdRef.current;

      try {
        const payloadMessages = newHistory.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/conversation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: payloadMessages,
            scenarioId: activeScenario.id,
            level,
            correctionMode,
            language: languageConfig.id,
          }),
        });

        // If another request was launched or session reset, ignore
        if (currentReqId !== activeRequestIdRef.current || !isMountedRef.current) {
          return;
        }

        const data = await res.json();

        if (!res.ok || !data.success) {
          setStatus("error");
          setErrorMessage(data.error?.message || "Could not receive tutor response. You can retry.");
          setPendingUserText(cleanText);
          return;
        }

        const tutorResponse = data.response;
        const assistantMessage = {
          id: `msg-assistant-${Date.now()}`,
          role: "assistant",
          content: tutorResponse.reply,
          corrections: tutorResponse.corrections || [],
          usefulPhrase: tutorResponse.usefulPhrase || null,
          followUpQuestion: tutorResponse.followUpQuestion || null,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStatus("idle");

        // Speak aloud if enabled
        if (voicePlaybackEnabled) {
          speakMessage(tutorResponse.reply);
        }
      } catch (err) {
        if (currentReqId !== activeRequestIdRef.current || !isMountedRef.current) return;
        setStatus("error");
        setErrorMessage("Network connection error. Please check if the server is available.");
        setPendingUserText(cleanText);
      }
    },
    [
      activeScenario.id,
      correctionMode,
      languageConfig.id,
      level,
      messages,
      speakMessage,
      status,
      voicePlaybackEnabled,
    ]
  );

  // Retry last failed user message
  const retryLastMessage = useCallback(() => {
    if (pendingUserText) {
      sendMessage(pendingUserText, true);
    }
  }, [pendingUserText, sendMessage]);

  // Voice Speech Recognition Controls
  const stopVoiceInput = useCallback(() => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {
        // Ignore
      }
      recognizerRef.current = null;
    }
    setIsRecording(false);
    setStatus((prev) => (prev === "recording" ? "idle" : prev));
  }, []);

  const cancelVoiceInput = useCallback(() => {
    voiceSessionIdRef.current++;
    abortSpeechRecognition();
    recognizerRef.current = null;
    setIsRecording(false);
    setVoiceDraft("");
    setVoiceError("");
    setStatus((prev) => (prev === "recording" ? "idle" : prev));
  }, []);

  const clearVoiceError = useCallback(() => {
    setVoiceError("");
  }, []);

  const startVoiceInput = useCallback(
    (options = {}) => {
      if (!canRecognize) {
        setVoiceError("Speech recognition is not supported in this browser. You can still type your message.");
        return;
      }

      // If currently listening, clicking again cleanly stops
      if (isRecording) {
        stopVoiceInput();
        return;
      }

      // Mute active speech synthesis so AI speech isn't heard by mic
      cancelSpeech();
      setVoiceError("");
      setVoiceDraft("");
      setIsRecording(true);
      setStatus("recording");

      const sessionId = ++voiceSessionIdRef.current;
      const selectedLang = options.lang || languageConfig.speechRecognitionLocale || "en-US";

      recognizerRef.current = startSpeechRecognition({
        lang: selectedLang,
        continuous: true,
        interimResults: true,
        onStart: () => {
          if (!isMountedRef.current || voiceSessionIdRef.current !== sessionId) return;
          setIsRecording(true);
          setStatus("recording");
        },
        onInterimResult: (interim) => {
          if (!isMountedRef.current || voiceSessionIdRef.current !== sessionId) return;
          setVoiceDraft(interim);
        },
        onError: (err) => {
          if (!isMountedRef.current || voiceSessionIdRef.current !== sessionId) return;
          setVoiceError(err.message || "Microphone recognition error.");
          setIsRecording(false);
          setStatus((prev) => (prev === "recording" ? "idle" : prev));
          recognizerRef.current = null;
        },
        onEnd: ({ finalTranscript } = {}) => {
          if (!isMountedRef.current || voiceSessionIdRef.current !== sessionId) return;
          setIsRecording(false);
          setStatus((prev) => (prev === "recording" ? "idle" : prev));
          if (finalTranscript) {
            setVoiceDraft(finalTranscript);
          }
          recognizerRef.current = null;
        },
      });
    },
    [canRecognize, isRecording, languageConfig.speechRecognitionLocale, stopVoiceInput]
  );

  // End session and log meaningful activity to unified progress
  const endSession = useCallback(() => {
    cancelSpeech();
    abortSpeechRecognition();

    const userExchanges = messages.filter((m) => m.role === "user").length;

    if (userExchanges >= 2 && !hasLoggedProgressRef.current) {
      try {
        recordActivity({
          module: "conversation",
          exerciseId: activeScenario.id,
          score: null,
          difficulty: level,
          status: "completed",
          metadata: {
            scenarioId: activeScenario.id,
            scenarioName: activeScenario.name,
            exchangesCount: userExchanges,
            level,
            correctionMode,
            language: languageConfig.id,
          },
        });
        hasLoggedProgressRef.current = true;

        // Background sync conversation session and messages to cloud account when logged in
        if (typeof window !== "undefined" && typeof fetch === "function") {
          const isUserLoggedIn = getItem(STORAGE_KEYS.IS_LOGGED_IN, false);
          if (isUserLoggedIn) {
            fetch("/api/user/conversations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scenarioId: activeScenario.id,
                level,
                correctionMode,
              }),
            })
              .then(async (res) => {
                if (!res.ok) return;
                const data = await res.json();
                const cloudSessionId = data.session?.id;
                if (cloudSessionId) {
                  for (const msg of messages) {
                    await fetch(`/api/user/conversations/${cloudSessionId}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(msg),
                    }).catch(() => {});
                  }
                }
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.warn("[ConversationSession] Failed to record progress:", err);
      }
    }
  }, [activeScenario.id, activeScenario.name, correctionMode, languageConfig.id, level, messages]);

  // Start new session
  const startNewSession = useCallback(
    (newScenarioId = scenarioId, newLevel = level, newMode = correctionMode) => {
      // Record previous session if meaningful
      endSession();

      cancelSpeech();
      abortSpeechRecognition();
      voiceSessionIdRef.current++;
      recognizerRef.current = null;
      activeRequestIdRef.current++;

      const selected =
        CONVERSATION_SCENARIOS.find((s) => s.id === newScenarioId) ||
        CONVERSATION_SCENARIOS[0];

      setScenarioId(selected.id);
      setLevel(newLevel);
      setCorrectionMode(newMode);
      setSessionId(`conv_${Date.now()}`);
      hasLoggedProgressRef.current = false;
      setSummary(null);
      setErrorMessage("");
      setPendingUserText("");
      setVoiceDraft("");
      setVoiceError("");
      setIsRecording(false);
      setStatus("idle");

      const initial = getScenarioInitialGreeting(selected, language);
      setMessages([
        {
          id: `msg-welcome-${Date.now()}`,
          role: "assistant",
          content: initial.content,
          corrections: [],
          usefulPhrase: null,
          followUpQuestion: initial.followUpQuestion,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    [correctionMode, endSession, language, level, scenarioId]
  );

  // Request educational summary
  const requestSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    setSummaryError("");

    try {
      const payloadMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/conversation/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          scenarioId: activeScenario.id,
          level,
          language: languageConfig.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSummaryError(data.error?.message || "Failed to generate summary.");
        setIsSummaryLoading(false);
        return;
      }

      setSummary(data.summary);
      setIsSummaryLoading(false);
    } catch {
      setSummaryError("Could not reach AI summary service.");
      setIsSummaryLoading(false);
    }
  }, [activeScenario.id, languageConfig.id, level, messages]);

  const sessionState = {
    sessionId,
    scenarioId,
    level,
    correctionMode,
    language: languageConfig.id,
    languageConfig,
    autoSpeakReplies: voicePlaybackEnabled,
    messages,
    status,
    error: errorMessage ? { message: errorMessage, canRetry: Boolean(pendingUserText) } : null,
    lastFailedMessage: pendingUserText,
    summaryData: summary,
    summaryLoading: isSummaryLoading,
    summaryError: summaryError,
    summaryModalOpen: Boolean(summary || isSummaryLoading || summaryError),
    installedVoices,
    matchingVoices,
    selectedVoice,
    hasVoiceForLanguage,
    voiceFallbackStatus,
  };

  return {
    state: sessionState,
    activeScenario,
    scenario: activeScenario,
    sessionId,
    scenarioId,
    setScenarioId,
    changeScenario: setScenarioId,
    level,
    setLevel,
    changeLevel: setLevel,
    correctionMode,
    setCorrectionMode,
    changeCorrectionMode: setCorrectionMode,
    // Multilingual support
    language: languageConfig.id,
    setLanguage,
    changeLanguage,
    languageConfig,
    supportedLanguages: SUPPORTED_LANGUAGES,
    installedVoices,
    matchingVoices,
    selectedVoice,
    hasVoiceForLanguage,
    voiceFallbackStatus,
    previewVoice,
    isPreviewPlaying,
    // Spoken replies
    autoSpeakReplies: voicePlaybackEnabled,
    toggleAutoSpeak: () => setVoicePlaybackEnabled((prev) => !prev),
    voicePlaybackEnabled,
    setVoicePlaybackEnabled,
    messages,
    status,
    errorMessage,
    error: errorMessage ? { message: errorMessage, canRetry: Boolean(pendingUserText) } : null,
    clearError: () => setErrorMessage(""),
    pendingUserText,
    sendMessage,
    retryLastMessage,
    resetSession: startNewSession,
    startNewSession,
    endSession,
    // Voice
    canRecognize,
    canSpeak,
    isRecording,
    voiceDraft,
    setVoiceDraft,
    voiceError,
    clearVoiceError,
    startVoiceInput,
    stopVoiceInput,
    cancelVoiceInput,
    speakMessage,
    stopSpeaking,
    // Summary
    summary,
    summaryData: summary,
    isSummaryLoading,
    summaryLoading: isSummaryLoading,
    summaryError,
    requestSummary,
    clearSummary: () => setSummary(null),
    closeSummary: () => {
      setSummary(null);
      setSummaryError("");
    },
  };
}
