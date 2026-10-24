"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

export default function ExamTimer({ initialRemainingSeconds = 0, onExpire }) {
  const [secondsLeft, setSecondsLeft] = useState(initialRemainingSeconds);
  const [prevInitial, setPrevInitial] = useState(initialRemainingSeconds);

  if (initialRemainingSeconds !== prevInitial) {
    setPrevInitial(initialRemainingSeconds);
    setSecondsLeft(initialRemainingSeconds);
  }

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onExpire]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const formattedTime =
    hours > 0
      ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isWarning = secondsLeft > 0 && secondsLeft < 300; // < 5 mins
  const isCritical = secondsLeft > 0 && secondsLeft < 60; // < 1 min

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-colors ${
        isCritical
          ? "bg-[#F8E8E5] text-[#A5413B] animate-pulse border border-[#A5413B]/30"
          : isWarning
          ? "bg-[#FBF1D8] text-[#8C6D1F] border border-[#8C6D1F]/30"
          : "bg-[#FAF9F5] text-[#203D35] border border-[#E6E2D9]"
      }`}
      aria-label={`Time remaining: ${formattedTime}`}
    >
      {isWarning ? (
        <AlertTriangle className="w-3.5 h-3.5 text-[#A5413B]" aria-hidden="true" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-[#466657]" aria-hidden="true" />
      )}
      <span>{formattedTime}</span>
    </div>
  );
}
