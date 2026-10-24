import { Volume2, Square, Globe } from "lucide-react";
import { VOICE_STATES } from "@/lib/voice/useVoiceEngine";
import { DEFAULT_SPEED_OPTIONS } from "@/data/sentences";

export default function ReferenceAudioPlayer({
  sentence,
  state,
  playbackSpeed,
  onSpeedChange,
  onPlay,
  onStop,
  voices = [],
  selectedVoice = null,
  onVoiceChange,
  disabled = false,
}) {
  const isPlaying = state === VOICE_STATES.PLAYING_REFERENCE;
  const isRecording = state === VOICE_STATES.RECORDING;

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-5 sm:p-6 shadow-card flex flex-col gap-4">
      {/* Header with language and category */}
      <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-2.5 text-xs">
        <div className="flex items-center gap-2 text-[#716F65]">
          <span className="font-semibold uppercase tracking-wider text-[#466657] bg-[#E3EDE6] px-2.5 py-0.5 rounded-full text-[11px]">
            {sentence?.category || "Target Sentence"}
          </span>
          <span className="text-[#CEDDD2]">•</span>
          <span className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-[#929087]" aria-hidden="true" />
            <span>{sentence?.language || "en-US"}</span>
          </span>
        </div>

        {sentence?.difficulty && (
          <span className="text-[11px] text-[#716F65] bg-[#FAF9F5] border border-[#E6E2D9] px-2 py-0.5 rounded-md">
            {sentence.difficulty}
          </span>
        )}
      </div>

      {/* Primary Reference Sentence Display */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#929087]">
          Reference Target
        </span>
        <p className="font-heading font-semibold text-xl sm:text-2xl text-[#30362F] leading-snug tracking-tight">
          “{sentence?.text || "..."}”
        </p>

        {sentence?.phonetic && (
          <p className="text-xs font-mono text-[#466657] bg-[#FAF9F5] px-2.5 py-0.5 rounded-md self-start border border-[#E6E2D9] mt-0.5">
            {sentence.phonetic}
          </p>
        )}

        {sentence?.contextNote && (
          <p className="text-xs text-[#716F65] mt-0.5 italic">
            Tip: {sentence.contextNote}
          </p>
        )}
      </div>

      {/* Reference Audio Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[#F2F0E9]">
        {/* Play/Stop Audio Button */}
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#30362F] text-white text-xs font-semibold hover:bg-black transition-colors focus-accessible shadow-xs"
              aria-label="Stop reference sentence audio"
            >
              <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>Stop Playback</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onPlay}
              disabled={disabled || isRecording}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#203D35] text-white text-xs sm:text-sm font-semibold hover:bg-[#294C42] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm focus-accessible"
              aria-label="Play reference sentence audio"
            >
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span>Listen to Reference</span>
            </button>
          )}
        </div>

        {/* Speed adjustment controls */}
        <div className="flex items-center gap-1.5 text-xs text-[#716F65]">
          <span className="font-medium mr-1 text-[11px] uppercase tracking-wider text-[#929087]">
            Speed:
          </span>
          {DEFAULT_SPEED_OPTIONS.map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => onSpeedChange(spd)}
              disabled={isRecording}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors focus-accessible ${
                playbackSpeed === spd
                  ? "bg-[#203D35] text-white font-semibold shadow-xs"
                  : "bg-[#FAF9F5] border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-white"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Voice Selector (if multiple voices available) */}
        {voices.length > 1 && (
          <div className="w-full sm:w-auto flex items-center gap-2 text-xs">
            <label htmlFor="voice-select" className="text-[#929087] text-[11px] uppercase font-semibold">
              Voice:
            </label>
            <select
              id="voice-select"
              value={selectedVoice?.name || ""}
              onChange={(e) => {
                const found = voices.find((v) => v.name === e.target.value);
                if (found && onVoiceChange) onVoiceChange(found);
              }}
              disabled={isRecording}
              className="bg-[#FAF9F5] border border-[#E6E2D9] rounded-lg px-2 py-1 text-xs text-[#30362F] focus-accessible max-w-[200px] truncate"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
