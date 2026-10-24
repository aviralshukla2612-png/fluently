"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  isSpeechSynthesisSupported,
  getAvailableVoices,
  speakText,
  cancelSpeech,
} from "./tts";
import {
  isRecordingSupported,
  startRecording as startMediaRecording,
  stopRecording as stopMediaRecording,
  cancelRecording as cancelMediaRecording,
  releaseMediaStream,
} from "./recorder";
import {
  isSpeechRecognitionSupported,
  startSpeechRecognition,
  abortSpeechRecognition,
} from "./speechRecognition";
import { scoreAttempt } from "../scoring/scoreAttempt.js";
import { recordActivity } from "../learning/progressService.js";

export const VOICE_STATES = {
  IDLE: "idle",
  PLAYING_REFERENCE: "playing-reference",
  READY_TO_RECORD: "ready-to-record",
  RECORDING: "recording",
  PROCESSING: "processing",
  COMPLETED: "completed",
  ERROR: "error",
};

export function useVoiceEngine({ initialSentence = null, initialSpeed = 1.0 } = {}) {
  // Authoritative session state
  const [state, setState] = useState(VOICE_STATES.IDLE);
  const [currentSentence, setCurrentSentence] = useState(initialSentence);
  const [playbackSpeed, setPlaybackSpeed] = useState(initialSpeed);

  // Voice selection
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  // Recording metadata
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState(null); // { blob, audioUrl, duration }

  // Speech Recognition results
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [recognitionError, setRecognitionError] = useState(null);

  // Phase 3 Deterministic Scoring & History
  const [currentScore, setCurrentScore] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const attemptsRef = useRef([]);
  const finalTranscriptRef = useRef("");

  // Browser capability flags
  const [ttsSupported] = useState(() =>
    typeof window !== "undefined" ? isSpeechSynthesisSupported() : false
  );
  const [recordingSupported] = useState(() =>
    typeof window !== "undefined" ? isRecordingSupported() : false
  );
  const [recognitionSupported] = useState(() =>
    typeof window !== "undefined" ? isSpeechRecognitionSupported() : false
  );

  // Error handling
  const [errorMessage, setErrorMessage] = useState("");

  // Refs for tracking active objects and timer cleanup
  const timerRef = useRef(null);
  const recognizerRef = useRef(null);
  const audioUrlRef = useRef(null);
  const isMountedRef = useRef(true);

  // Initialize voices on mount
  useEffect(() => {
    isMountedRef.current = true;

    getAvailableVoices().then((availableVoices) => {
      if (!isMountedRef.current) return;
      setVoices(availableVoices);
      // Prioritize natural US/UK English voices
      const defaultVoice =
        availableVoices.find((v) => v.lang === "en-US" && !v.name.includes("Google")) ||
        availableVoices.find((v) => v.lang?.startsWith("en")) ||
        availableVoices[0] ||
        null;
      setSelectedVoice(defaultVoice);
    });

    return () => {
      isMountedRef.current = false;
      cancelSpeech();
      cancelMediaRecording();
      abortSpeechRecognition();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  // Update current sentence
  const setSentence = useCallback((sentence) => {
    cancelSpeech();
    cancelMediaRecording();
    abortSpeechRecognition();
    if (timerRef.current) clearInterval(timerRef.current);

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setCurrentSentence(sentence);
    setRecordedAudio(null);
    setCurrentScore(null);
    finalTranscriptRef.current = "";
    setInterimTranscript("");
    setFinalTranscript("");
    setRecognitionError(null);
    setErrorMessage("");
    setRecordingDuration(0);
    setState(VOICE_STATES.IDLE);
  }, []);

  // 1. Play Reference Sentence (TTS)
  const playReference = useCallback(() => {
    if (!currentSentence?.text) return;

    // Do not allow playing if currently recording
    if (state === VOICE_STATES.RECORDING) return;

    setState(VOICE_STATES.PLAYING_REFERENCE);
    setErrorMessage("");

    speakText(currentSentence.text, {
      lang: currentSentence.language || "en-US",
      rate: playbackSpeed,
      voice: selectedVoice,
      onStart: () => {
        if (isMountedRef.current) {
          setState(VOICE_STATES.PLAYING_REFERENCE);
        }
      },
      onEnd: () => {
        if (isMountedRef.current) {
          // Transition to ready-to-record as required in coordination sequence
          setState(VOICE_STATES.READY_TO_RECORD);
        }
      },
      onError: (err) => {
        if (isMountedRef.current) {
          setErrorMessage(err.message || "Failed to play reference sentence audio.");
          setState(VOICE_STATES.ERROR);
        }
      },
    });
  }, [currentSentence, playbackSpeed, selectedVoice, state]);

  // Stop Reference Playback
  const stopReference = useCallback(() => {
    cancelSpeech();
    setState(VOICE_STATES.IDLE);
  }, []);

  // 2. Start Recording
  const startRecording = useCallback(async () => {
    // Prevent recording if TTS is playing
    if (state === VOICE_STATES.PLAYING_REFERENCE) {
      cancelSpeech();
    }

    setErrorMessage("");
    setInterimTranscript("");
    setFinalTranscript("");
    finalTranscriptRef.current = "";
    setCurrentScore(null);
    setRecognitionError(null);
    setRecordingDuration(0);

    // Revoke previous audio object URL if present
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setRecordedAudio(null);

    try {
      // Start media recorder
      await startMediaRecording({
        onStart: () => {
          if (!isMountedRef.current) return;
          setState(VOICE_STATES.RECORDING);

          // Start duration timer
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setRecordingDuration((prev) => prev + 1);
          }, 1000);
        },
        onError: (err) => {
          if (!isMountedRef.current) return;
          if (timerRef.current) clearInterval(timerRef.current);
          setErrorMessage(err.message || "Recording encountered an unexpected error.");
          setState(VOICE_STATES.ERROR);
        },
      });

      // Start parallel speech recognition if supported
      if (isSpeechRecognitionSupported()) {
        recognizerRef.current = startSpeechRecognition({
          lang: currentSentence?.language || "en-US",
          continuous: true,
          interimResults: true,
          onInterimResult: (interim) => {
            if (isMountedRef.current) setInterimTranscript(interim);
          },
          onFinalResult: (finalText) => {
            if (isMountedRef.current) {
              finalTranscriptRef.current = finalText;
              setFinalTranscript(finalText);
              setInterimTranscript("");
            }
          },
          onError: (recErr) => {
            // Speech recognition failure does NOT cancel the audio recording
            if (isMountedRef.current) {
              setRecognitionError(recErr.message);
            }
          },
        });
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      releaseMediaStream();
      setErrorMessage(err.message || "Could not access microphone.");
      setState(VOICE_STATES.ERROR);
    }
  }, [currentSentence, state]);

  // 3. Stop Recording
  const stopRecording = useCallback(async () => {
    if (state !== VOICE_STATES.RECORDING) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setState(VOICE_STATES.PROCESSING);

    // Gracefully stop recognition adapter
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {
        // Ignore
      }
      recognizerRef.current = null;
    }

    try {
      const result = await stopMediaRecording();
      audioUrlRef.current = result.audioUrl;

      if (isMountedRef.current) {
        setRecordedAudio(result);

        // Run deterministic scoring engine on finalized transcript
        const transcriptToScore = finalTranscriptRef.current || finalTranscript || "";
        const score = scoreAttempt(currentSentence?.text || "", transcriptToScore);
        setCurrentScore(score);

        // Record in session attempt history
        const sentenceId = currentSentence?.id || "default";
        const sentenceAttempts = attemptsRef.current.filter((a) => a.sentenceId === sentenceId);
        const newAttempt = {
          id: `att-${Date.now()}-${sentenceAttempts.length + 1}`,
          sentenceId,
          referenceText: currentSentence?.text || "",
          transcriptText: transcriptToScore,
          score,
          sequence: sentenceAttempts.length + 1,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        };
        attemptsRef.current = [...attemptsRef.current, newAttempt];
        setAttempts(attemptsRef.current);

        // Record valid attempt in unified learning progress
        if (score.status === "scored") {
          try {
            recordActivity({
              id: newAttempt.id,
              module: "speaking",
              exerciseId: sentenceId,
              score: score.textMatchScore,
              difficulty: currentSentence?.difficulty || "intermediate",
              status: "completed",
              metadata: {
                wer: score.wer,
                referenceWordCount: score.referenceWordCount,
                correctWords: score.metrics?.correctWords || 0,
              },
            });
          } catch (progressErr) {
            console.warn("[VoiceEngine] Failed to record speaking progress:", progressErr);
          }
        }

        setState(VOICE_STATES.COMPLETED);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setErrorMessage(err.message || "Failed to finalize audio recording.");
        setState(VOICE_STATES.ERROR);
      }
    }
  }, [currentSentence, finalTranscript, state]);

  // 4. Retry / Reset current attempt
  const resetSession = useCallback(() => {
    cancelSpeech();
    cancelMediaRecording();
    abortSpeechRecognition();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setRecordedAudio(null);
    setCurrentScore(null);
    finalTranscriptRef.current = "";
    setInterimTranscript("");
    setFinalTranscript("");
    setRecognitionError(null);
    setErrorMessage("");
    setRecordingDuration(0);
    setState(VOICE_STATES.IDLE);
  }, []);

  // 5. Clear entire attempt history
  const clearAttemptHistory = useCallback(() => {
    attemptsRef.current = [];
    setAttempts([]);
  }, []);

  return {
    state,
    currentSentence,
    setSentence,
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
    capabilities: {
      ttsSupported,
      recordingSupported,
      recognitionSupported,
    },
  };
}
