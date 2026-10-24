"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth.js";
import {
  User,
  Settings,
  Cloud,
  CloudCheck,
  RefreshCw,
  LogOut,
  Trash2,
  AlertTriangle,
  Volume2,
  CheckCircle2,
  Shield,
  Layers,
} from "lucide-react";

export default function AccountSettings() {
  const {
    user,
    preferences,
    isAuthenticated,
    isLoading,
    syncStatus,
    syncError,
    hasUnsyncedLocalData,
    logout,
    updatePreferences,
    syncLocalData,
  } = useAuth();

  const router = useRouter();
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Local form state for preferences
  const [learningLevel, setLearningLevel] = useState(preferences?.learningLevel || "intermediate");
  const [correctionMode, setCorrectionMode] = useState(preferences?.correctionMode || "gentle");
  const [autoSpeak, setAutoSpeak] = useState(preferences?.autoSpeakReplies ?? true);
  const [dailyMinutes, setDailyMinutes] = useState(preferences?.dailyTargetMinutes || 15);

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    setPrefsSuccess(false);

    try {
      await updatePreferences({
        learningLevel,
        correctionMode,
        autoSpeakReplies: autoSpeak,
        dailyTargetMinutes: Number(dailyMinutes),
      });
      setPrefsSuccess(true);
      setTimeout(() => setPrefsSuccess(false), 3000);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSyncNow = async () => {
    await syncLocalData();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim() !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm.');
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || "Failed to delete account.");
      }

      await logout();
      router.push("/");
    } catch (err) {
      setDeleteError(err.message || "Failed to delete account.");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto p-12 text-center text-[#716F65]">
        Loading your account settings...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 sm:p-10 bg-white border border-[#E6E2D9] rounded-3xl text-center shadow-card">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E3EDE6] text-[#203D35] mb-4 shadow-sm">
          <User className="w-7 h-7" />
        </div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#30362F] tracking-tight">
          Account & Cloud Sync
        </h1>
        <p className="text-sm text-[#716F65] mt-2 leading-relaxed max-w-md mx-auto">
          Create an account or sign in to synchronize your English shadowing streak, vocabulary flashcards, and AI conversation history across all your devices.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#203D35] hover:bg-[#294C42] text-white text-sm font-semibold transition-colors shadow-xs"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-white border border-[#E6E2D9] hover:bg-[#FAF9F5] text-[#30362F] text-sm font-semibold transition-colors"
          >
            Create free account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E2D9] pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#466657]">
            Account Management
          </span>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#30362F] tracking-tight mt-0.5">
            Settings & Cloud Profile
          </h1>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FAF9F5] border border-[#E6E2D9] hover:bg-[#F8E8E5] hover:text-[#A5413B] text-xs font-semibold text-[#716F65] transition-colors self-start sm:self-auto focus-accessible"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>

      {/* Account Profile Card */}
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#203D35] text-white font-heading font-bold text-lg flex items-center justify-center shadow-sm">
            {user.displayName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
          </div>
          <div>
            <h2 className="font-heading font-semibold text-base text-[#30362F]">
              {user.displayName || "Learner"}
            </h2>
            <p className="text-xs text-[#716F65]">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3EDE6] text-[#203D35] text-xs font-medium border border-[#CEDDD2]">
            <CloudCheck className="w-3.5 h-3.5 text-[#327653]" />
            <span>Cloud Account Active</span>
          </span>
        </div>
      </div>

      {/* Cloud Sync Manager */}
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#203D35]" />
            <h3 className="font-heading font-semibold text-base text-[#30362F]">
              Multi-Device Cloud Synchronization
            </h3>
          </div>
          {syncStatus === "syncing" && (
            <span className="text-xs font-medium text-[#203D35] flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing...</span>
            </span>
          )}
          {syncStatus === "synced" && (
            <span className="text-xs font-semibold text-[#327653] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Synced</span>
            </span>
          )}
        </div>

        <p className="text-xs text-[#716F65] leading-relaxed">
          Your speaking attempts, dictation exercises, vocabulary review schedule, and AI conversation histories are safely isolated to your personal PostgreSQL cloud storage.
        </p>

        {syncError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            {syncError}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[#F2F0E9]">
          <span className="text-xs text-[#716F65]">
            {hasUnsyncedLocalData
              ? "Local unsynced progress detected on this browser."
              : "All progress on this browser is backed up."}
          </span>
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncStatus === "syncing"}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#203D35] hover:bg-[#294C42] text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
            <span>Sync Local Data Now</span>
          </button>
        </div>
      </div>

      {/* Learning Preferences */}
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#203D35]" />
          <h3 className="font-heading font-semibold text-base text-[#30362F]">
            Tutor & Learning Preferences
          </h3>
        </div>

        <form onSubmit={handleSavePreferences} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pref-level" className="block text-xs font-semibold uppercase tracking-wider text-[#716F65] mb-1.5">
                Default Learning Level
              </label>
              <select
                id="pref-level"
                value={learningLevel}
                onChange={(e) => setLearningLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs sm:text-sm text-[#30362F] focus:outline-none focus:border-[#203D35]"
              >
                <option value="beginner">Beginner (A1 – A2)</option>
                <option value="intermediate">Intermediate (B1 – B2)</option>
                <option value="advanced">Advanced (C1 – C2)</option>
              </select>
            </div>

            <div>
              <label htmlFor="pref-mode" className="block text-xs font-semibold uppercase tracking-wider text-[#716F65] mb-1.5">
                Conversation Feedback Mode
              </label>
              <select
                id="pref-mode"
                value={correctionMode}
                onChange={(e) => setCorrectionMode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs sm:text-sm text-[#30362F] focus:outline-none focus:border-[#203D35]"
              >
                <option value="natural">Natural Conversation (flow first)</option>
                <option value="gentle">Gentle Corrections (1 tip max)</option>
                <option value="tutor">Tutor Mode (detailed guidance)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label htmlFor="pref-target" className="block text-xs font-semibold uppercase tracking-wider text-[#716F65] mb-1.5">
                Daily Practice Target
              </label>
              <select
                id="pref-target"
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs sm:text-sm text-[#30362F] focus:outline-none focus:border-[#203D35]"
              >
                <option value={10}>10 minutes / day</option>
                <option value={15}>15 minutes / day</option>
                <option value={20}>20 minutes / day</option>
                <option value={30}>30 minutes / day</option>
              </select>
            </div>

            <div className="flex items-center gap-3 mt-4 sm:mt-6">
              <input
                id="pref-autospeak"
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="w-4 h-4 rounded text-[#203D35] focus:ring-[#203D35]"
              />
              <label htmlFor="pref-autospeak" className="text-xs text-[#30362F] font-medium cursor-pointer">
                Automatically read AI replies aloud via voice synthesis
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#F2F0E9]">
            {prefsSuccess ? (
              <span className="text-xs font-semibold text-[#327653] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Preferences saved to cloud!</span>
              </span>
            ) : (
              <span className="text-xs text-[#716F65]">Applies across all conversational sessions.</span>
            )}

            <button
              type="submit"
              disabled={savingPrefs}
              className="px-5 py-2 rounded-xl bg-[#203D35] hover:bg-[#294C42] text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {savingPrefs ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>
      </div>

      {/* Privacy & Account Deletion */}
      <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#716F65]" />
          <h3 className="font-heading font-semibold text-base text-[#30362F]">
            Data Privacy & Account Controls
          </h3>
        </div>

        <p className="text-xs text-[#716F65] leading-relaxed">
          Fluently does not store raw audio recordings on the server. Your speech is recognized directly in your browser. AI conversations and learning progress are secured to your user account and never shared with third parties.
        </p>

        <div className="pt-3 border-t border-[#F2F0E9] flex items-center justify-between">
          <span className="text-xs text-[#A5413B]">Permanently remove account and data</span>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E2D9] rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-bold text-lg text-rose-950">Delete Account?</h4>
            </div>

            <p className="text-xs text-[#716F65] leading-relaxed mb-4">
              This action is permanent and cannot be undone. All your speaking drills, saved vocabulary, grammar records, and conversation history will be permanently erased.
            </p>

            {deleteError && (
              <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {deleteError}
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="confirm-delete-input" className="block text-xs font-semibold text-[#30362F] mb-1">
                Type <span className="font-mono text-rose-600 font-bold">DELETE</span> to confirm:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs font-mono text-[#30362F] focus:outline-none focus:border-rose-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmationText("");
                  setDeleteError("");
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#716F65] hover:bg-[#FAF9F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmationText !== "DELETE"}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
