"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth.js";
import { UserPlus, Eye, EyeOff, AlertCircle, ArrowRight, CloudUpload } from "lucide-react";

export default function RegisterForm() {
  const router = useRouter();
  const { register, loginWithGoogle, syncLocalData, hasUnsyncedLocalData } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [autoSyncLocal, setAutoSyncLocal] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const getRedirectUrl = () => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    return params?.get("redirect") || "/progress";
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      if (autoSyncLocal && hasUnsyncedLocalData) {
        await syncLocalData().catch(() => {});
      }
      router.push(getRedirectUrl());
    } catch (err) {
      setError(err.message || "Failed to continue with Google.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

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

      router.push(getRedirectUrl());
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white border border-[#E6E2D9] rounded-3xl shadow-card">
      <div className="text-center mb-6">
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
          Save your mock test scores, vocabulary, and AI conversation history forever.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <p className="leading-snug">{error}</p>
        </div>
      )}

      {/* Google Sign-In Action */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isLoading}
        className="w-full py-3 px-4 rounded-2xl border border-[#E6E2D9] bg-white hover:bg-[#FAF9F5] hover:border-[#CEDDD2] text-[#30362F] font-semibold text-sm transition-all duration-200 shadow-xs flex items-center justify-center gap-3 focus-accessible disabled:opacity-60 disabled:cursor-not-allowed mb-5"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>{isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
      </button>

      {/* Divider */}
      <div className="relative mb-5 flex items-center justify-center">
        <div className="border-t border-[#E6E2D9] w-full" />
        <span className="bg-white px-3 text-[11px] uppercase font-semibold text-[#929087] tracking-wider shrink-0">
          Or register with email
        </span>
      </div>

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
