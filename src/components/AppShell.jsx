"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import Navbar from "./Navbar";
import LanguageSelector from "./LanguageSelector";
import { useAuth } from "@/lib/auth/useAuth";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const isConversation = pathname === "/conversation";
  const isAuthActive = pathname === "/settings" || pathname === "/login";

  return (
    <div
      className={`bg-[#F5F2EA] text-[#30362F] flex flex-col font-sans selection:bg-[#E3EDE6] selection:text-[#203D35] ${
        isConversation ? "h-dvh max-h-screen overflow-hidden" : "min-h-screen"
      }`}
    >
      {/* Top Application Header */}
      <header
        className={`w-full shrink-0 ${
          isConversation
            ? "pt-3.5 sm:pt-4 pb-2"
            : "pt-8 sm:pt-10 md:pt-12 pb-3 sm:pb-4"
        }`}
      >
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col gap-4 sm:gap-5">
          {/* Main Navigation Row */}
          <div className="w-full flex items-center justify-between gap-3 md:gap-4">
            {/* Brand Logo */}
            <div className="shrink-0">
              <Link
                href="/"
                className="group inline-flex items-center gap-2.5 focus-accessible rounded-lg py-1 px-1.5"
                aria-label="Fluently Home"
              >
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-white shadow-xs border border-[#E6E2D9] flex items-center justify-center p-0.5 transition-transform duration-200 group-hover:scale-105">
                  <Image
                    src="/images/logo.png"
                    alt="Fluently Logo"
                    width={36}
                    height={36}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
                <span className="font-heading font-bold text-xl tracking-tight text-[#203D35]">
                  Fluently
                </span>
              </Link>
            </div>

            {/* Desktop Pill Navigation (Centered, completely visible without any clipping) */}
            <div className="hidden lg:flex items-center justify-center flex-1">
              <Navbar />
            </div>

            {/* Right Controls: Language Selector + Sign In / User Profile */}
            <div className="flex items-center gap-2 shrink-0">
              <LanguageSelector />
              <Link
                href={isAuthenticated ? "/settings" : "/login"}
                aria-current={isAuthActive ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-accessible shadow-xs border ${
                  isAuthActive
                    ? "bg-[#203D35] text-white border-[#203D35]"
                    : "bg-white border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-[#FAF9F5]"
                }`}
                title={isAuthenticated ? "Account & Settings" : "Sign In to Fluently"}
              >
                <User
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isAuthActive ? "text-white" : "text-[#716F65]"
                  }`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">
                  {isAuthenticated ? (user?.displayName || "Account") : "Sign In"}
                </span>
              </Link>
            </div>
          </div>

          {/* Mobile / Tablet Nav Pill row when < lg */}
          <div className="lg:hidden w-full flex justify-center overflow-x-auto no-scrollbar py-0.5">
            <Navbar />
          </div>

          {/* Sub-bar beneath navigation aligned with main content */}
          <div className="w-full max-w-[1120px] mx-auto px-2 sm:px-0 flex items-center justify-between border-b border-[#E6E2D9]/60 pb-2 pt-0.5 text-[11px] sm:text-xs text-[#929087]">
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#327653]" aria-hidden="true" />
              <span className="font-medium tracking-wide uppercase">English Shadowing & Immersion</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline">Natural Speech • Active Listening</span>
              <span className="font-medium text-[#716F65]">Interactive Tutor</span>
            </div>
          </div>
        </div>
      </header>

      {/* Semantic Main Content */}
      <main
        className={`flex-1 w-full max-w-[1120px] mx-auto px-3 sm:px-6 md:px-8 ${
          isConversation ? "flex flex-col min-h-0 overflow-hidden pb-2 pt-1" : "py-6 md:py-10"
        }`}
      >
        {children}
      </main>

      {/* Minimal editorial footer only when not on full-height conversation view */}
      {!isConversation && (
        <footer className="w-full border-t border-[#E6E2D9] py-8 text-center text-xs text-[#929087] shrink-0">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 Fluently. Practice with purpose and clarity.</p>
            <div className="flex items-center gap-4 text-[#716F65]">
              <span>Calm & Focused</span>
              <span>•</span>
              <span>Natural Accent</span>
              <span>•</span>
              <span>Sentence by Sentence</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
