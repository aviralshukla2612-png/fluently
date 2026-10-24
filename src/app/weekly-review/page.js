"use client";

import ModulePage from "@/components/ModulePage.jsx";
import WeeklyReviewCard from "@/components/progress/WeeklyReviewCard.jsx";
import { useProgress } from "@/lib/learning/useProgress.js";

export default function WeeklyReviewPage() {
  const { activities, isLoaded } = useProgress();

  return (
    <ModulePage
      eyebrow="Reflect • Analyze • Advance"
      title="Weekly Learning Review"
      description="Inspect week-over-week performance changes, identify expanding competencies, and discover verified focus areas for next week."
      badge="Review Module"
    >
      <div className="flex flex-col gap-6">
        {!isLoaded ? (
          <div className="bg-white border border-[#E6E2D9] rounded-2xl p-12 text-center text-[#716F65] animate-pulse">
            Loading your weekly learning review...
          </div>
        ) : (
          <WeeklyReviewCard activities={activities} />
        )}
      </div>
    </ModulePage>
  );
}
