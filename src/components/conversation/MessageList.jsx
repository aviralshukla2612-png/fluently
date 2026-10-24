"use client";

import { useEffect, useRef } from "react";
import CorrectionCard from "./CorrectionCard";
import { Volume2, RotateCcw, Bot, User, AlertCircle, Quote } from "lucide-react";

function formatMessageTime(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return "";
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = String(hours % 12 || 12).padStart(2, "0");
  return `${displayHours}:${minutes} ${ampm}`;
}

export default function MessageList({
  messages = [],
  status = "idle",
  errorMessage = "",
  onRetry = () => {},
  onSpeak = () => {},
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, status]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col gap-6"
      role="log"
      aria-label="Conversation history"
    >
      {messages.map((msg) => {
        const isUser = msg.role === "user";

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-3 max-w-[85%] sm:max-w-[78%] ${
              isUser ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            {/* Avatar icon */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-xs ${
                isUser
                  ? "bg-[#203D35] text-white"
                  : "bg-[#E3EDE6] text-[#203D35] border border-[#CEDDD2]"
              }`}
              aria-hidden="true"
            >
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble Content */}
            <div className="flex flex-col gap-1 w-full">
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? "bg-[#203D35] text-white rounded-tr-none shadow-xs"
                    : "bg-white border border-[#E6E2D9] text-[#30362F] rounded-tl-none shadow-card"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Follow-up question if highlighted */}
                {!isUser && msg.followUpQuestion && (
                  <p className="mt-2 text-xs font-medium text-[#466657] border-t border-[#F2F0E9] pt-2">
                    {msg.followUpQuestion}
                  </p>
                )}

                {/* Useful Phrase callout */}
                {!isUser && msg.usefulPhrase && (
                  <div className="mt-2.5 inline-flex items-center justify-between flex-wrap gap-2 px-2.5 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#E6E2D9] text-[11px] text-[#466657]">
                    <div className="inline-flex items-center gap-1.5">
                      <Quote className="w-3 h-3 text-[#327653] shrink-0" aria-hidden="true" />
                      <span>
                        Natural Phrase: <strong>{msg.usefulPhrase}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSpeak(msg.usefulPhrase)}
                      className="inline-flex items-center gap-1 text-[#203D35] hover:text-[#327653] font-semibold transition-colors focus-accessible px-1 py-0.5 rounded cursor-pointer"
                      title="Hear phrase pronunciation"
                      aria-label={`Pronounce phrase: ${msg.usefulPhrase}`}
                    >
                      <Volume2 className="w-3 h-3" aria-hidden="true" />
                      <span>Pronounce</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Inline Corrections */}
              {!isUser && msg.corrections && msg.corrections.length > 0 && (
                <CorrectionCard corrections={msg.corrections} />
              )}

              {/* Bottom controls on tutor messages (Speak aloud) */}
              {!isUser && (
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#929087]">
                  <button
                    type="button"
                    onClick={() => onSpeak(msg.content)}
                    className="inline-flex items-center gap-1 hover:text-[#203D35] transition-colors focus-accessible px-1 py-0.5 rounded"
                    title="Listen to this response"
                    aria-label="Listen to this response aloud"
                  >
                    <Volume2 className="w-3 h-3" aria-hidden="true" />
                    <span>Listen</span>
                  </button>
                  <span>•</span>
                  <span suppressHydrationWarning>
                    {formatMessageTime(msg.timestamp)}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Sending / Thinking Indicator */}
      {status === "sending" && (
        <div className="flex items-start gap-3 max-w-[80%] mr-auto">
          <div className="w-8 h-8 rounded-full bg-[#E3EDE6] text-[#203D35] border border-[#CEDDD2] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div className="p-4 rounded-2xl rounded-tl-none bg-white border border-[#E6E2D9] shadow-card flex items-center gap-2 text-xs text-[#716F65]">
            <span className="w-2 h-2 rounded-full bg-[#327653] animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-[#327653] animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-[#327653] animate-bounce [animation-delay:0.4s]" />
            <span className="ml-1 text-xs">Fluently Tutor is typing...</span>
          </div>
        </div>
      )}

      {/* Error & Retry Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[#F8E8E5] border border-[#A5413B]/30 text-xs text-[#A5413B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#A5413B]/40 text-xs font-semibold text-[#A5413B] hover:bg-[#F8E8E5] transition-colors focus-accessible shadow-xs shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  );
}
