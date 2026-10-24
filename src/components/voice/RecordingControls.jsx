import { Mic, Square, Loader2 } from "lucide-react";
import { VOICE_STATES } from "@/lib/voice/useVoiceEngine";

function formatSeconds(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function RecordingControls({
  state,
  duration,
  onStart,
  onStop,
  disabled = false,
}) {
  const isRecording = state === VOICE_STATES.RECORDING;
  const isPlayingRef = state === VOICE_STATES.PLAYING_REFERENCE;
  const isProcessing = state === VOICE_STATES.PROCESSING;
  const canRecord = !disabled && !isPlayingRef && !isProcessing;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white border border-[#E6E2D9] rounded-2xl shadow-card gap-5 text-center">
      {/* Visual ring container */}
      <div className="relative flex items-center justify-center">
        {/* Animated pulse halo only during active recording */}
        {isRecording && (
          <>
            <span
              className="absolute w-24 h-24 rounded-full bg-[#D94A64]/20 animate-ping"
              aria-hidden="true"
            />
            <span
              className="absolute w-28 h-28 rounded-full bg-[#D94A64]/10 animate-pulse"
              aria-hidden="true"
            />
          </>
        )}

        {/* Primary Circular Action Button */}
        {isRecording ? (
          <button
            type="button"
            onClick={onStop}
            className="relative z-10 w-20 h-20 rounded-full bg-[#D94A64] hover:bg-[#C03E56] text-white flex flex-col items-center justify-center shadow-lg transition-transform hover:scale-105 focus-accessible"
            aria-label="Stop recording audio"
          >
            <Square className="w-7 h-7 fill-current mb-0.5" aria-hidden="true" />
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Stop
            </span>
          </button>
        ) : isProcessing ? (
          <div
            className="w-20 h-20 rounded-full bg-[#FAF9F5] border-2 border-[#E6E2D9] text-[#716F65] flex flex-col items-center justify-center"
            aria-label="Processing audio recording"
          >
            <Loader2 className="w-7 h-7 animate-spin text-[#203D35]" aria-hidden="true" />
          </div>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={!canRecord}
            className={`relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-md transition-all duration-200 focus-accessible ${
              canRecord
                ? "bg-[#203D35] hover:bg-[#294C42] hover:scale-105 text-white ring-4 ring-[#E3EDE6]"
                : "bg-[#F2F0E9] text-[#929087] cursor-not-allowed"
            }`}
            aria-label="Start recording your voice"
          >
            <Mic className="w-7 h-7 mb-0.5" aria-hidden="true" />
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Record
            </span>
          </button>
        )}
      </div>

      {/* Status indicator and timer */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          {isRecording && (
            <span className="w-2.5 h-2.5 rounded-full bg-[#D94A64] animate-pulse" aria-hidden="true" />
          )}
          <span className="font-heading font-bold text-lg text-[#30362F]">
            {isRecording
              ? `Recording: ${formatSeconds(duration)}`
              : isPlayingRef
              ? "Listen to reference before recording"
              : isProcessing
              ? "Saving audio recording..."
              : state === VOICE_STATES.READY_TO_RECORD
              ? "Ready! Tap to start recording"
              : "Tap microphone to record your shadowing attempt"}
          </span>
        </div>

        <p className="text-xs text-[#716F65] max-w-sm">
          {isRecording
            ? "Speak the reference sentence naturally into your microphone."
            : isPlayingRef
            ? "Reference audio is playing. Recording is paused to prevent feedback."
            : "Your recording remains in browser memory and can be replayed instantly."}
        </p>
      </div>
    </div>
  );
}
