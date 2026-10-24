"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, Square, RotateCcw, AlertCircle, CheckCircle2 } from "lucide-react";
import { countWords } from "@/lib/exams/scoring/objectiveGrader.js";

export default function SpeakingRecorder({
  prompt = "",
  initialTranscript = "",
  onTranscriptChange,
  targetDurationSeconds = 60,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(initialTranscript);
  const [prevInitial, setPrevInitial] = useState(initialTranscript);
  const [duration, setDuration] = useState(0);
  const [speechSupported] = useState(() => {
    return typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  });
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  if (initialTranscript !== prevInitial) {
    setPrevInitial(initialTranscript);
    setTranscript(initialTranscript);
  }

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event) => {
        let finalStr = "";
        for (let i = 0; i < event.results.length; i++) {
          finalStr += event.results[i][0].transcript + " ";
        }
        const clean = finalStr.trim();
        setTranscript(clean);
        if (onTranscriptChange) onTranscriptChange(clean);
      };

      rec.onerror = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, [onTranscriptChange]);

  const startRecording = () => {
    setDuration(0);
    setIsRecording(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
    }

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleManualEdit = (e) => {
    const val = e.target.value;
    setTranscript(val);
    if (onTranscriptChange) onTranscriptChange(val);
  };

  const wordCount = countWords(transcript);

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col gap-4">
      {/* Recording Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2F0E9] pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Speaking Response Capture
          </span>
          <h4 className="font-heading font-bold text-lg text-[#30362F] mt-0.5">
            Voice Recording & Live Transcription
          </h4>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-semibold px-3 py-1 bg-[#FAF9F5] border border-[#E6E2D9] rounded-full text-[#30362F]">
            {Math.floor(duration / 60)}:
            {String(duration % 60).padStart(2, "0")} / {targetDurationSeconds}s
          </span>

          <span className="text-xs font-medium text-[#716F65]">
            {wordCount} words
          </span>
        </div>
      </div>

      {/* Recording Action Button */}
      <div className="flex items-center justify-center py-4">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#203D35] text-white font-bold text-sm hover:bg-[#294C42] shadow-sm transition-transform active:scale-95 focus-accessible"
          >
            <Mic className="w-5 h-5 text-[#E3EDE6]" aria-hidden="true" />
            <span>Start Speaking</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#A5413B] text-white font-bold text-sm hover:bg-[#8A3631] shadow-sm transition-transform active:scale-95 focus-accessible animate-pulse"
          >
            <Square className="w-5 h-5 fill-current" aria-hidden="true" />
            <span>Stop Recording</span>
          </button>
        )}
      </div>

      {/* Transcript Textarea / Review */}
      <div>
        <div className="flex items-center justify-between mb-1.5 text-xs text-[#716F65]">
          <span className="font-medium">Candidate Transcript</span>
          <span>You may edit or refine text before submitting</span>
        </div>
        <textarea
          rows={5}
          value={transcript}
          onChange={handleManualEdit}
          placeholder="Your spoken response will appear here in real-time. If your browser does not support microphone capture, you can also type your spoken notes directly."
          className="w-full p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-sm text-[#30362F] placeholder:text-[#929087] focus-accessible resize-y leading-relaxed"
        />
      </div>

      {!speechSupported && (
        <div className="p-3 bg-[#FBF1D8] border border-[#8C6D1F]/20 rounded-xl text-xs text-[#8C6D1F] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Browser Speech Recognition is not available in this browser. You can type your spoken response directly into the transcript box.
          </span>
        </div>
      )}
    </div>
  );
}
