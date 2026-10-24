"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, Headphones } from "lucide-react";

export default function RecordedAudioPlayer({
  recordedAudio,
  onRetry,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);



  const togglePlay = () => {
    if (!audioRef.current || !recordedAudio?.audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.warn("[Player] Playback error:", err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || recordedAudio?.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (timeInSeconds) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (!recordedAudio?.audioUrl) {
    return (
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex items-center justify-between text-xs text-[#929087]">
        <div className="flex items-center gap-2.5">
          <Headphones className="w-4 h-4 text-[#CEDDD2]" aria-hidden="true" />
          <span>No voice recording yet. Record an attempt above to playback.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-7 shadow-card flex flex-col gap-4">
      {/* Hidden standard audio element */}
      <audio
        ref={audioRef}
        src={recordedAudio.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-3 text-xs">
        <div className="flex items-center gap-2 text-[#30362F] font-semibold">
          <Volume2 className="w-4 h-4 text-[#327653]" aria-hidden="true" />
          <span>Your Recorded Attempt</span>
        </div>
        <span className="text-[11px] text-[#716F65] bg-[#FAF9F5] border border-[#E6E2D9] px-2 py-0.5 rounded-md">
          {recordedAudio.mimeType || "audio/webm"}
        </span>
      </div>

      {/* Playback Controls & Progress Bar */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-[#203D35] hover:bg-[#294C42] text-white flex items-center justify-center shrink-0 transition-all shadow-sm focus-accessible"
          aria-label={isPlaying ? "Pause recorded audio" : "Play recorded audio"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" aria-hidden="true" />
          ) : (
            <Play className="w-5 h-5 ml-0.5 fill-current" aria-hidden="true" />
          )}
        </button>

        {/* Progress track */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="w-full bg-[#FAF9F5] border border-[#E6E2D9] h-2 rounded-full overflow-hidden">
            <div
              style={{
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              }}
              className="bg-[#203D35] h-full transition-all"
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-[#929087]">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || recordedAudio.duration || 0)}</span>
          </div>
        </div>
      </div>

      {/* Footer with Retry Action */}
      <div className="pt-2 border-t border-[#F2F0E9] flex items-center justify-between">
        <span className="text-xs text-[#716F65]">
          Listen and compare your pronunciation with the reference.
        </span>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF9F5] border border-[#E6E2D9] text-xs font-semibold text-[#203D35] hover:bg-[#E3EDE6] transition-colors focus-accessible"
        >
          <RotateCcw className="w-3 h-3" aria-hidden="true" />
          <span>Record Again</span>
        </button>
      </div>
    </div>
  );
}
