import { MessageSquare, Sparkles, AlertCircle } from "lucide-react";
import { VOICE_STATES } from "@/lib/voice/useVoiceEngine";

export default function TranscriptPanel({
  interimTranscript,
  finalTranscript,
  recognitionSupported,
  recognitionError,
  state,
}) {
  const hasContent = !!(finalTranscript || interimTranscript);
  const isRecording = state === VOICE_STATES.RECORDING;

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-5 sm:p-6 shadow-card flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#466657]" aria-hidden="true" />
          <h3 className="font-heading font-semibold text-sm text-[#30362F]">
            Speech Recognition Transcript
          </h3>
        </div>

        <span className="text-[11px] font-medium text-[#716F65] bg-[#FAF9F5] border border-[#E6E2D9] px-2.5 py-0.5 rounded-full">
          {recognitionSupported ? "Browser Engine (en-US)" : "Unsupported Browser"}
        </span>
      </div>

      {/* Transcript Content Area */}
      <div
        className="min-h-[80px] p-3.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col justify-center"
        aria-live="polite"
      >
        {!recognitionSupported ? (
          <div className="flex items-start gap-2.5 text-xs text-[#716F65]">
            <AlertCircle className="w-4 h-4 text-[#93621B] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[#30362F]">Speech Recognition Unavailable</p>
              <p className="mt-0.5">
                Your browser does not expose the Web Speech API. You can still record,
                review, and listen to your voice recording below.
              </p>
            </div>
          </div>
        ) : hasContent ? (
          <div className="flex flex-col gap-1 text-sm sm:text-base leading-relaxed">
            {finalTranscript && (
              <span className="text-[#30362F] font-medium">
                {finalTranscript}
              </span>
            )}
            {interimTranscript && (
              <span className="text-[#929087] italic animate-pulse">
                {interimTranscript}
              </span>
            )}
          </div>
        ) : isRecording ? (
          <div className="flex items-center gap-2 text-xs text-[#466657]">
            <span className="w-2 h-2 rounded-full bg-[#466657] animate-ping" aria-hidden="true" />
            <span>Listening for spoken words...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-xs text-[#929087]">
            <Sparkles className="w-4 h-4 text-[#CEDDD2]" aria-hidden="true" />
            <span>
              Real-time transcript will appear here as you speak. No fabricated results.
            </span>
          </div>
        )}
      </div>

      {recognitionError && (
        <p className="text-xs text-[#93621B] bg-[#F8EFD9] px-3 py-1.5 rounded-lg">
          {recognitionError}
        </p>
      )}
    </div>
  );
}
