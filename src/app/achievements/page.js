"use client";

import ModulePage from "@/components/ModulePage.jsx";
import AchievementsGrid from "@/components/achievements/AchievementsGrid.jsx";
import AchievementToast from "@/components/notifications/AchievementToast.jsx";
import { useAchievements } from "@/lib/achievements/useAchievements.js";

export default function AchievementsPage() {
  const {
    achievements,
    totalPoints,
    unlockedCount,
    totalCount,
    activeToast,
    dismissToast,
  } = useAchievements();

  return (
    <ModulePage
      eyebrow="Milestones • Honors • Progress"
      title="Achievements & Honors"
      description="Celebrate verified milestones earned through consistent practice in Speaking, Dictation, Vocabulary, Grammar, and AI Conversation."
      badge="Milestones Module"
    >
      <div className="flex flex-col gap-6">
        <AchievementsGrid
          achievements={achievements}
          totalPoints={totalPoints}
          unlockedCount={unlockedCount}
          totalCount={totalCount}
        />
        <AchievementToast achievement={activeToast} onDismiss={dismissToast} />
      </div>
    </ModulePage>
  );
}
