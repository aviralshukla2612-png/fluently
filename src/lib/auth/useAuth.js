"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/learning/storage.js";

const AuthContext = createContext({
  user: null,
  preferences: null,
  isLoading: true,
  isAuthenticated: false,
  syncStatus: "idle", // 'idle' | 'syncing' | 'synced' | 'error'
  syncError: null,
  hasUnsyncedLocalData: false,
  login: async () => {},
  loginWithGoogle: async () => {},
  register: async () => {},
  logout: async () => {},
  updatePreferences: async () => {},
  syncLocalData: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [syncError, setSyncError] = useState(null);
  const [hasUnsyncedLocalData, setHasUnsyncedLocalData] = useState(false);

  // Check if device has local learning data that can be synced
  const checkLocalData = useCallback(() => {
    try {
      const activities = getItem(STORAGE_KEYS.ACTIVITIES, []);
      const savedWords = getItem(STORAGE_KEYS.SAVED_VOCABULARY, []);
      const hasData = (Array.isArray(activities) && activities.length > 0) ||
        (Array.isArray(savedWords) && savedWords.length > 0);
      setHasUnsyncedLocalData(hasData);
    } catch {
      setHasUnsyncedLocalData(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setPreferences(data.preferences);
        setItem(STORAGE_KEYS.IS_LOGGED_IN, true);
      } else {
        setUser(null);
        setPreferences(null);
        setItem(STORAGE_KEYS.IS_LOGGED_IN, false);
      }
    } catch {
      setUser(null);
      setPreferences(null);
      setItem(STORAGE_KEYS.IS_LOGGED_IN, false);
    } finally {
      setIsLoading(false);
      checkLocalData();
    }
  }, [checkLocalData]);

  useEffect(() => {
    let isCancelled = false;

    const initAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (isCancelled) return;
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setPreferences(data.preferences);
          setItem(STORAGE_KEYS.IS_LOGGED_IN, true);
        } else {
          setUser(null);
          setPreferences(null);
          setItem(STORAGE_KEYS.IS_LOGGED_IN, false);
        }
      } catch {
        if (!isCancelled) {
          setUser(null);
          setPreferences(null);
          setItem(STORAGE_KEYS.IS_LOGGED_IN, false);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          checkLocalData();
        }
      }
    };

    initAuth();

    return () => {
      isCancelled = true;
    };
  }, [checkLocalData]);

  const login = async ({ email, password }) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || "Failed to log in.");
    }

    await refreshUser();
    return data;
  };

  const loginWithGoogle = async (googleData = {}) => {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(googleData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || "Failed to continue with Google.");
    }

    await refreshUser();
    return data;
  };

  const register = async ({ email, password, displayName }) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || "Failed to register.");
    }

    await refreshUser();
    return data;
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    setUser(null);
    setPreferences(null);
    setItem(STORAGE_KEYS.IS_LOGGED_IN, false);
    setSyncStatus("idle");
    checkLocalData();
  };

  const updatePreferences = async (updates) => {
    if (!user) return;
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences);
      }
    } catch (err) {
      console.warn("[Auth] Failed to update preferences:", err);
    }
  };

  /**
   * Synchronize local device state into user account idempotently
   */
  const syncLocalData = async () => {
    if (!user) return { success: false, message: "Login required to sync." };

    setSyncStatus("syncing");
    setSyncError(null);

    try {
      const activities = getItem(STORAGE_KEYS.ACTIVITIES, []);
      const savedWords = getItem(STORAGE_KEYS.SAVED_VOCABULARY, []);
      const vocabularyReviews = getItem(STORAGE_KEYS.VOCABULARY_REVIEWS, []);
      const grammarCompletions = getItem(STORAGE_KEYS.GRAMMAR_PROGRESS, []);

      const payload = {
        activities,
        savedWords,
        vocabularyReviews,
        grammarCompletions,
      };

      const res = await fetch("/api/user/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Sync failed.");
      }

      setSyncStatus("synced");
      checkLocalData();
      return { success: true, data };
    } catch (err) {
      setSyncStatus("error");
      setSyncError(err.message);
      return { success: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        isLoading,
        isAuthenticated: Boolean(user),
        syncStatus,
        syncError,
        hasUnsyncedLocalData,
        login,
        loginWithGoogle,
        register,
        logout,
        updatePreferences,
        syncLocalData,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
