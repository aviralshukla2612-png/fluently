"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  User,
  Menu,
  X,
  House,
  GraduationCap,
  Languages,
  AudioLines,
  MessageSquare,
  BookOpen,
  BookMarked,
  ChartNoAxesColumnIncreasing,
} from "lucide-react";
import Navbar from "./Navbar";
import MobileBottomNav from "./MobileBottomNav";
import LanguageSelector from "./LanguageSelector";
import { useAuth } from "@/lib/auth/useAuth";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

            {/* Right Controls: Language Selector + Sign In + Mobile Menu Button */}
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

              {/* Mobile Menu Toggle Button (< lg) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[#E6E2D9] text-[#30362F] hover:bg-[#FAF9F5] focus-accessible shadow-xs transition-colors"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-4 h-4 text-[#203D35]" aria-hidden="true" />
                ) : (
                  <Menu className="w-4 h-4 text-[#716F65]" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile / Tablet Full Navigation Drawer (< lg) */}
          {mobileMenuOpen && (
            <div className="lg:hidden w-full bg-white border border-[#E6E2D9] rounded-2xl p-3 shadow-card animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#466657] px-3 pt-1 pb-2">
                All Modules & Practice
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {[
                  { label: "Home", href: "/", icon: House, desc: "Daily practice & overview" },
                  { label: "Mock Tests", href: "/mock-tests", icon: GraduationCap, desc: "IELTS & diagnostic tests" },
                  { label: "Say It", href: "/say-it", icon: Languages, desc: "Sentence shadowing & scoring" },
                  { label: "Dictation", href: "/dictation", icon: AudioLines, desc: "Active listening transcription" },
                  { label: "Conversation", href: "/conversation", icon: MessageSquare, desc: "Interactive AI dialogue" },
                  { label: "Grammar", href: "/grammar", icon: BookOpen, desc: "Syntax lessons & quizzes" },
                  { label: "Vocabulary", href: "/vocabulary", icon: BookMarked, desc: "Spaced repetition flashcards" },
                  { label: "Progress", href: "/progress", icon: ChartNoAxesColumnIncreasing, desc: "Streak, analytics & review" },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors focus-accessible ${
                        isActive
                          ? "bg-[#E3EDE6] text-[#203D35] font-semibold"
                          : "text-[#30362F] hover:bg-[#FAF9F5]"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-[#203D35] text-white shadow-xs"
                            : "bg-[#FAF9F5] border border-[#E6E2D9] text-[#716F65]"
                        }`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold leading-tight truncate">
                          {item.label}
                        </span>
                        <span className="text-[11px] text-[#716F65] leading-tight truncate">
                          {item.desc}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

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
          isConversation
            ? "flex flex-col min-h-0 overflow-hidden pb-2 pt-1"
            : "py-4 sm:py-6 md:py-10 pb-24 md:pb-10"
        }`}
      >
        {children}
      </main>

      {/* Minimal editorial footer only when not on full-height conversation view */}
      {!isConversation && (
        <footer className="w-full border-t border-[#E6E2D9] py-8 pb-28 md:pb-8 text-center text-xs text-[#929087] shrink-0">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 Fluently. Practice with purpose and clarity.</p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[#716F65]">
              <span>Calm & Focused</span>
              <span className="hidden sm:inline">•</span>
              <span>Natural Accent</span>
              <span className="hidden sm:inline">•</span>
              <span>Sentence by Sentence</span>
            </div>
          </div>
        </footer>
      )}

      {/* Floating Bottom Navigation on Mobile Phones (< md) */}
      <MobileBottomNav />
    </div>
  );
}
