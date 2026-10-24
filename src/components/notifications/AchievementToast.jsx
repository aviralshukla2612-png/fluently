"use client";

import { useEffect, useState } from "react";
import { Sparkles, X, Trophy } from "lucide-react";

export default function AchievementToast({ achievement, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!achievement) return;
    const enterTimer = setTimeout(() => {
      setVisible(true);
    }, 20);
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      if (onDismiss) setTimeout(onDismiss, 300);
    }, 6000);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#203D35] text-white p-4 rounded-2xl shadow-xl border border-[#CEDDD2]/30 flex items-start gap-3 transition-all duration-300 transform ${
        visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-[#327653] flex items-center justify-center text-white shrink-0 mt-0.5">
        <Trophy className="w-5 h-5 text-[#FDD835]" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#CEDDD2]">
          <Sparkles className="w-3.5 h-3.5 text-[#FDD835]" />
          <span>Achievement Unlocked!</span>
        </div>
        <h4 className="font-heading font-bold text-sm text-white truncate mt-0.5">
          {achievement.name}
        </h4>
        <p className="text-xs text-[#FAF9F5]/90 mt-0.5 line-clamp-2">
          {achievement.description}
        </p>
        {achievement.points && (
          <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 bg-[#FAF9F5]/10 rounded-full text-[#FDD835]">
            +{achievement.points} Points
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setVisible(false);
          if (onDismiss) setTimeout(onDismiss, 300);
        }}
        className="p-1 text-white/70 hover:text-white rounded-lg transition-colors focus-accessible shrink-0"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
