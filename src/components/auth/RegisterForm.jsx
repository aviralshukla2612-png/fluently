"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth.js";
import { UserPlus, Eye, EyeOff, AlertCircle, ArrowRight, CloudUpload } from "lucide-react";

export default function RegisterForm() {
  const router = useRouter();
  const { register, syncLocalData, hasUnsyncedLocalData } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [autoSyncLocal, setAutoSyncLocal] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please provide an email and password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      await register({ email, password, displayName });

      if (autoSyncLocal && hasUnsyncedLocalData) {
        await syncLocalData().catch(() => {});
      }

      router.push("/progress");
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white border border-[#E6E2D9] rounded-3xl shadow-card">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-[#E6E2D9] mb-4 shadow-xs p-1">
          <Image
            src="/images/logo.png"
            alt="Fluently"
            width={48}
            height={48}
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#30362F] tracking-tight">
          Create an Account
        </h1>
        <p className="text-sm text-[#716F65] mt-1.5">
          Save your vocabulary, speaking streaks, and AI conversation history forever.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <p className="leading-snug">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="reg-name" className="block text-xs font-semibold uppercase tracking-wider text-[#716F65] mb-1.5">
            Your Name / Nickname
          </label>
          <input
            id="reg-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Alex"
            className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-sm text-[#30362F] placeholder:text-[#929087] focus:outline-none focus:border-[#203D35] focus:bg-white transition-all"
          />
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-xs font-semibold uppercase tracking-wider text-[#716F65] mb-1.5">
            Email address
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-sm text-[#30362F] placeholder:text-[#929087] focus:outline-none focus:border-[#203D35] focus:bg-white transition-all"
          />
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-xs font-semibold uppercase tracking-wider text-[#716F65] mb-1.5">
            Password (min 8 characters)
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-11 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-sm text-[#30362F] placeholder:text-[#929087] focus:outline-none focus:border-[#203D35] focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#716F65] hover:text-[#30362F] transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {hasUnsyncedLocalData && (
          <div className="p-3.5 bg-[#FAF9F5] border border-[#CEDDD2] rounded-xl flex items-start gap-3">
            <input
              id="reg-autosync"
              type="checkbox"
              checked={autoSyncLocal}
              onChange={(e) => setAutoSyncLocal(e.target.checked)}
              className="mt-0.5 rounded text-[#203D35] focus:ring-[#203D35]"
            />
            <label htmlFor="reg-autosync" className="text-xs text-[#30362F] cursor-pointer">
              <span className="font-semibold block flex items-center gap-1.5">
                <CloudUpload className="w-3.5 h-3.5 text-[#203D35]" />
                Import existing progress on this device
              </span>
              <span className="text-[#716F65] text-[11px] block mt-0.5">
                Sync existing drills, saved words, and streak history into your new account.
              </span>
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full py-3.5 px-6 rounded-full bg-[#203D35] hover:bg-[#294C42] text-white font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span>Creating account...</span>
          ) : (
            <>
              <span>Create account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-[#E6E2D9] text-center text-xs text-[#716F65]">
        <span>Already have an account? </span>
        <Link href="/login" className="font-semibold text-[#203D35] hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
