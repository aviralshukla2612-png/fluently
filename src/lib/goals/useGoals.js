"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/useAuth.js";
import { useProgress } from "@/lib/learning/useProgress.js";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/learning/storage.js";
import { evaluateAllGoals, validateGoalInput } from "@/lib/goals/goalManager.js";

export function useGoals() {
  const { isAuthenticated } = useAuth();
  const { activities } = useProgress();
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGoals = useCallback(async () => {
    try {
      if (isAuthenticated) {
        const res = await fetch("/api/learning/goals", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setGoals(json.goals || []);
        } else {
          // If server fails or unauthorized, fallback to empty or local
          const localStored = getItem(STORAGE_KEYS.GOALS, []);
          setGoals(evaluateAllGoals(localStored, activities));
        }
      } else {
        // Guest mode: local evaluation from storage & activities
        await Promise.resolve();
        const localStored = getItem(STORAGE_KEYS.GOALS, []);
        setGoals(evaluateAllGoals(localStored, activities));
      }
    } catch (err) {
      setError(err.message);
      const localStored = getItem(STORAGE_KEYS.GOALS, []);
      setGoals(evaluateAllGoals(localStored, activities));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, activities]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await fetchGoals();
    };
    if (active) {
      run();
    }
    return () => {
      active = false;
    };
  }, [fetchGoals]);

  const createGoal = useCallback(
    async (payload) => {
      if (isAuthenticated) {
        try {
          const res = await fetch("/api/learning/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = await res.json();
          if (!res.ok) {
            return { success: false, error: json.error || { message: "Failed to create goal" } };
          }
          await fetchGoals();
          return { success: true, goal: json.goal };
        } catch (err) {
          return { success: false, error: { message: err.message } };
        }
      } else {
        // Guest mode
        const validation = validateGoalInput(payload);
        if (!validation.isValid) {
          return { success: false, error: { message: validation.errors[0]?.message || "Invalid goal input" } };
        }

        const localStored = getItem(STORAGE_KEYS.GOALS, []);
        // Prevent duplicate active goal of same type/skill
        const duplicate = localStored.find(
          (g) => g.status === "active" && g.goalType === payload.goalType && (payload.skill ? g.skill === payload.skill : true)
        );
        if (duplicate) {
          return { success: false, error: { message: "An active goal of this type already exists." } };
        }

        const newGoal = {
          id: `local_goal_${Date.now()}`,
          userId: "guest",
          goalType: payload.goalType,
          targetValue: Number(payload.targetValue),
          targetUnit: payload.targetUnit || "drills",
          skill: payload.skill || null,
          startDate: new Date().toISOString().slice(0, 10),
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updated = [...localStored, newGoal];
        setItem(STORAGE_KEYS.GOALS, updated);
        setGoals(evaluateAllGoals(updated, activities));
        return { success: true, goal: newGoal };
      }
    },
    [isAuthenticated, activities, fetchGoals]
  );

  const updateGoal = useCallback(
    async (goalId, updates) => {
      if (isAuthenticated) {
        try {
          const res = await fetch(`/api/learning/goals/${goalId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
          const json = await res.json();
          if (!res.ok) {
            return { success: false, error: json.error };
          }
          await fetchGoals();
          return { success: true, goal: json.goal };
        } catch (err) {
          return { success: false, error: { message: err.message } };
        }
      } else {
        // Guest mode
        const localStored = getItem(STORAGE_KEYS.GOALS, []);
        const updated = localStored.map((g) => (g.id === goalId ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g));
        setItem(STORAGE_KEYS.GOALS, updated);
        setGoals(evaluateAllGoals(updated, activities));
        return { success: true };
      }
    },
    [isAuthenticated, activities, fetchGoals]
  );

  const deleteGoal = useCallback(
    async (goalId) => {
      if (isAuthenticated) {
        try {
          const res = await fetch(`/api/learning/goals/${goalId}`, {
            method: "DELETE",
          });
          const json = await res.json();
          if (!res.ok) {
            return { success: false, error: json.error };
          }
          await fetchGoals();
          return { success: true };
        } catch (err) {
          return { success: false, error: { message: err.message } };
        }
      } else {
        // Guest mode
        const localStored = getItem(STORAGE_KEYS.GOALS, []);
        const updated = localStored.filter((g) => g.id !== goalId);
        setItem(STORAGE_KEYS.GOALS, updated);
        setGoals(evaluateAllGoals(updated, activities));
        return { success: true };
      }
    },
    [isAuthenticated, activities, fetchGoals]
  );

  return {
    goals,
    isLoading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    refreshGoals: fetchGoals,
  };
}
