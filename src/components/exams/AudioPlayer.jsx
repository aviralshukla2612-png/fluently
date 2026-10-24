"use client";

import { useState } from "react";
import { Volume2, Play, Pause, RotateCcw } from "lucide-react";
import { speakText, cancelSpeech } from "@/lib/voice/tts.js";

export default function AudioPlayer({
  transcript = "",
  audioUrl = "",
  title = "Audio Track",
  maxPlays = 2,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);

  const handleTogglePlay = () => {
    if (isPlaying) {
      cancelSpeech();
      setIsPlaying(false);
      return;
    }

    if (playCount >= maxPlays) return;

    setIsPlaying(true);
    setPlayCount((prev) => prev + 1);

    // Use Web Speech API TTS to articulate the authentic listening passage
    speakText(transcript, {
      lang: "en-GB", // British English accent standard for IELTS
      rate: 0.95,
      pitch: 1.0,
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  const handleStop = () => {
    cancelSpeech();
    setIsPlaying(false);
  };

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-4 sm:p-5 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#E3EDE6] text-[#203D35] flex items-center justify-center shrink-0">
          <Volume2 className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h4 className="font-heading font-semibold text-sm text-[#30362F]">{title}</h4>
          <span className="text-xs text-[#716F65]">
            Simulated British English Academic Audio • Plays remaining: {Math.max(0, maxPlays - playCount)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleTogglePlay}
          disabled={playCount >= maxPlays && !isPlaying}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-colors focus-accessible shadow-xs ${
            isPlaying
              ? "bg-[#A5413B] text-white hover:bg-[#8A3631]"
              : playCount >= maxPlays
              ? "bg-[#FAF9F5] text-[#929087] border border-[#E6E2D9] cursor-not-allowed"
              : "bg-[#203D35] text-white hover:bg-[#294C42]"
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause Audio</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>{playCount === 0 ? "Play Audio" : "Replay Track"}</span>
            </>
          )}
        </button>

        {isPlaying && (
          <button
            type="button"
            onClick={handleStop}
            className="p-2.5 rounded-full bg-[#FAF9F5] border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F]"
            aria-label="Stop playback"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
