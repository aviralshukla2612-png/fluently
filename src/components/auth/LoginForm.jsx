"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth.js";
import { Eye, EyeOff, LogIn, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("test@fluently.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
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
      setError("Please fill in both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      await login({ email, password });
      router.push(getRedirectUrl());
    } catch (err) {
      setError(err.message || "Failed to log in.");
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
          Welcome back
        </h1>
        <p className="text-sm text-[#716F65] mt-1.5">
          Sign in to access your cloud learning progress and mock test history.
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
          Or continue with email
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-[#716F65] mb-1.5">
            Email address
          </label>
          <input
            id="login-email"
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
          <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-[#716F65] mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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

        <div className="flex items-center justify-between p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#716F65]">
          <div>
            <span className="font-semibold text-[#203D35] block">Default Testing Account:</span>
            <span>test@fluently.com • password123</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEmail("test@fluently.com");
              setPassword("password123");
            }}
            className="px-2.5 py-1 rounded-lg bg-[#E3EDE6] text-[#203D35] font-semibold hover:bg-[#d4e4d8] transition text-xs"
          >
            Auto-fill
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full py-3.5 px-6 rounded-full bg-[#203D35] hover:bg-[#294C42] text-white font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span>Signing in...</span>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-[#E6E2D9] text-center text-xs text-[#716F65]">
        <span>Don&apos;t have an account yet? </span>
        <Link href="/register" className="font-semibold text-[#203D35] hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}
