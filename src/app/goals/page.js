"use client";

import ModulePage from "@/components/ModulePage.jsx";
import GoalsWorkspace from "@/components/goals/GoalsWorkspace.jsx";
import { useGoals } from "@/lib/goals/useGoals.js";

export default function GoalsPage() {
  const { goals, isLoading, error, createGoal, updateGoal, deleteGoal, refreshGoals } = useGoals();

  return (
    <ModulePage
      eyebrow="Habits • Focus • Accountability"
      title="Personal Learning Goals"
      description="Define daily learning minutes, weekly drill targets, and skill consistency goals to build lasting English fluency."
      badge="Goals Module"
    >
      <div className="flex flex-col gap-6">
        {error && (
          <div className="p-4 bg-[#F8E8E5] border border-[#E6B6B0] text-[#A5413B] rounded-xl text-xs">
            {error}
          </div>
        )}
        <GoalsWorkspace
          goals={goals}
          isLoading={isLoading}
          onRefresh={refreshGoals}
          onCreateGoal={createGoal}
          onUpdateGoal={updateGoal}
          onDeleteGoal={deleteGoal}
        />
      </div>
    </ModulePage>
  );
}
