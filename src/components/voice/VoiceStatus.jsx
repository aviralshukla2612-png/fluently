import {
  Volume2,
  Mic,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { VOICE_STATES } from "@/lib/voice/useVoiceEngine";

export default function VoiceStatus({ state, errorMessage, recognitionError }) {
  if (state === VOICE_STATES.ERROR || errorMessage) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-start gap-3 p-4 bg-[#F8E8E5] border border-[#A5413B]/30 rounded-xl text-xs text-[#A5413B]"
      >
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <p className="font-semibold">Notice</p>
          <p className="mt-0.5 leading-relaxed">
            {errorMessage || "An unexpected error occurred during audio processing."}
          </p>
        </div>
      </div>
    );
  }

  if (state === VOICE_STATES.PLAYING_REFERENCE) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E3EDE6] border border-[#CEDDD2] text-xs font-medium text-[#203D35]"
      >
        <Volume2 className="w-3.5 h-3.5 animate-pulse text-[#327653]" aria-hidden="true" />
        <span>Playing reference speaker model...</span>
      </div>
    );
  }

  if (state === VOICE_STATES.READY_TO_RECORD) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8F6EE] border border-[#327653]/30 text-xs font-medium text-[#327653]"
      >
        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Reference complete. Press record to shadow the sentence.</span>
      </div>
    );
  }

  if (state === VOICE_STATES.RECORDING) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F8E8E5] border border-[#D94A64]/40 text-xs font-semibold text-[#D94A64]"
      >
        <span className="w-2 h-2 rounded-full bg-[#D94A64] animate-ping" aria-hidden="true" />
        <span>Microphone active — speak clearly</span>
      </div>
    );
  }

  if (state === VOICE_STATES.PROCESSING) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF9F5] border border-[#E6E2D9] text-xs font-medium text-[#716F65]"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#203D35]" aria-hidden="true" />
        <span>Finalizing audio recording & transcript...</span>
      </div>
    );
  }

  if (state === VOICE_STATES.COMPLETED) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col gap-1 text-xs"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8F6EE] border border-[#327653]/30 font-medium text-[#327653] self-start">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Recording successfully captured</span>
        </div>
        {recognitionError && (
          <span className="text-[11px] text-[#929087] mt-1">
            Note: {recognitionError}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF9F5] border border-[#E6E2D9] text-xs text-[#716F65]"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#929087]" aria-hidden="true" />
      <span>Listen to reference or start recording</span>
    </div>
  );
}
