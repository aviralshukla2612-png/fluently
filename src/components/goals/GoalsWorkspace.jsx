"use client";

import { useState } from "react";
import {
  Target,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle,
  X,
} from "lucide-react";
import { GOAL_TYPE_CONFIG, GOAL_TYPES, SUPPORTED_SKILLS } from "@/lib/goals/goalManager.js";

export default function GoalsWorkspace({
  goals = [],
  onRefresh = () => {},
  onCreateGoal = async () => {},
  onUpdateGoal = async () => {},
  onDeleteGoal = async () => {},
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goalType, setGoalType] = useState(GOAL_TYPES.DAILY_MINUTES);
  const [targetValue, setTargetValue] = useState(GOAL_TYPE_CONFIG.daily_minutes.defaultTarget);
  const [skill, setSkill] = useState("speaking");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedConfig = GOAL_TYPE_CONFIG[goalType] || GOAL_TYPE_CONFIG.daily_minutes;

  const handleOpenModal = () => {
    setGoalType(GOAL_TYPES.DAILY_MINUTES);
    setTargetValue(GOAL_TYPE_CONFIG.daily_minutes.defaultTarget);
    setSkill("speaking");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleTypeChange = (type) => {
    setGoalType(type);
    const config = GOAL_TYPE_CONFIG[type];
    if (config) {
      setTargetValue(config.defaultTarget);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const payload = {
        goalType,
        targetValue: Number(targetValue),
        targetUnit: selectedConfig.unit,
        ...(goalType === GOAL_TYPES.SKILL_ACTIVITIES && { skill }),
      };

      const result = await onCreateGoal(payload);
      if (result?.success === false) {
        setFormError(result.error?.message || "Failed to create goal.");
        setIsSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      setFormError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePause = async (goal) => {
    const newStatus = goal.status === "paused" ? "active" : "paused";
    await onUpdateGoal(goal.id, { status: newStatus });
    onRefresh();
  };

  const handleDelete = async (goalId) => {
    if (confirm("Are you sure you want to delete this learning goal?")) {
      await onDeleteGoal(goalId);
      onRefresh();
    }
  };

  return (
    <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2F0E9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
              Learning Commitments
            </span>
          </div>
          <h3 className="font-heading font-semibold text-lg sm:text-xl text-[#30362F] mt-0.5">
            Personal Learning Goals
          </h3>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#203D35] hover:bg-[#294C42] text-white rounded-xl text-xs font-semibold transition-colors focus-accessible shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="py-10 px-4 text-center bg-[#FAF9F5] border border-dashed border-[#E6E2D9] rounded-xl flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E7F2E9] border border-[#CEDDD2] flex items-center justify-center text-[#203D35]">
            <Target className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h4 className="font-heading font-semibold text-sm text-[#30362F]">No active goals yet</h4>
            <p className="text-xs text-[#716F65] max-w-sm mt-1">
              Set clear daily practice targets or weekly consistency goals to build lasting English fluency habits.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenModal}
            className="mt-1 px-4 py-1.5 rounded-lg bg-white border border-[#CEDDD2] text-xs font-semibold text-[#203D35] hover:bg-[#FAF9F5] transition-colors focus-accessible shadow-xs"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const p = goal.progress || {};
            const isPaused = goal.status === "paused";
            const isCompleted = p.isCompleted;

            return (
              <div
                key={goal.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  isPaused
                    ? "bg-[#FAF9F5]/60 border-[#E6E2D9] opacity-80"
                    : isCompleted
                    ? "bg-[#E7F2E9]/40 border-[#CEDDD2]"
                    : "bg-[#FAF9F5] border-[#E6E2D9] hover:border-[#CEDDD2]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-[#30362F] flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-[#466657]" />
                      <span>{goal.title}</span>
                      {goal.skill && (
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-white border border-[#E6E2D9] text-[#716F65]">
                          {goal.skill}
                        </span>
                      )}
                    </span>

                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                        isPaused
                          ? "bg-white text-[#929087] border-[#E6E2D9]"
                          : isCompleted
                          ? "bg-[#E7F2E9] text-[#327653] border-[#CEDDD2]"
                          : "bg-white text-[#716F65] border-[#E6E2D9]"
                      }`}
                    >
                      {isPaused ? "Paused" : isCompleted ? "Completed" : "In Progress"}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#716F65]">
                    Target: {goal.targetValue} {p.targetUnit || goal.targetUnit}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] text-[#716F65]">
                    <span>
                      {p.current} / {p.target} {p.targetUnit}
                    </span>
                    <span className="font-semibold text-[#203D35]">{p.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-white border border-[#E6E2D9] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${p.percentage}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? "bg-[#327653]" : "bg-[#203D35]"
                      }`}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between border-t border-[#E6E2D9]/60 pt-2 text-xs text-[#716F65]">
                  <span className="text-[10px] text-[#929087]">
                    Started {goal.startDate}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTogglePause(goal)}
                      title={isPaused ? "Resume goal" : "Pause goal"}
                      aria-label={isPaused ? "Resume goal" : "Pause goal"}
                      className="p-1 rounded hover:bg-white text-[#716F65] hover:text-[#203D35] transition-colors focus-accessible"
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(goal.id)}
                      title="Delete goal"
                      aria-label="Delete goal"
                      className="p-1 rounded hover:bg-white text-[#A5413B] transition-colors focus-accessible"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E6E2D9] flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-3">
              <h4 className="font-heading font-bold text-base text-[#30362F]">
                Create a Learning Goal
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[#929087] hover:text-[#30362F] rounded focus-accessible"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-[#F8E8E5] text-[#A5413B] text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Goal Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#30362F]">Goal Type</label>
                <select
                  value={goalType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#30362F] focus-accessible"
                >
                  {Object.entries(GOAL_TYPE_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.name} ({cfg.period})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-[#929087]">{selectedConfig.description}</span>
              </div>

              {/* Skill Selector if skill-specific */}
              {goalType === GOAL_TYPES.SKILL_ACTIVITIES && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#30362F]">Skill</label>
                  <select
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#30362F] focus-accessible capitalize"
                  >
                    {SUPPORTED_SKILLS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Value */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#30362F]">
                  Target ({selectedConfig.unit})
                </label>
                <input
                  type="number"
                  min={selectedConfig.min}
                  max={selectedConfig.max}
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#30362F] focus-accessible"
                  required
                />
                <span className="text-[10px] text-[#929087]">
                  Suggested range: {selectedConfig.min} - {selectedConfig.max} {selectedConfig.unit}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2F0E9]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#716F65] hover:text-[#30362F] focus-accessible"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#203D35] hover:bg-[#294C42] text-white rounded-xl text-xs font-semibold transition-colors focus-accessible shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
