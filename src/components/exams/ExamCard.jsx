"use client";

import Link from "next/link";
import { Clock, CheckCircle2, Award, ArrowRight, ShieldCheck } from "lucide-react";

export default function ExamCard({
  exam,
  onPurchase,
  isPurchasing = false,
  hasEntitlement = false,
  isAuthenticated = false,
}) {
  const isFree = exam.isDiagnostic || exam.pricePaise === 0;

  return (
    <div
      className={`relative bg-white border rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 shadow-card ${
        !isFree
          ? "border-[#203D35]/30 hover:border-[#203D35] ring-1 ring-[#203D35]/10"
          : "border-[#E6E2D9] hover:border-[#CEDDD2]"
      }`}
    >
      {!isFree && (
        <div className="absolute -top-3.5 right-6 px-3.5 py-1 bg-[#203D35] text-white text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm">
          Full Examination • Academic
        </div>
      )}

      {isFree && (
        <div className="absolute -top-3.5 right-6 px-3.5 py-1 bg-[#E3EDE6] text-[#203D35] text-[11px] font-bold uppercase tracking-wider rounded-full shadow-xs">
          Free Diagnostic
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#466657] uppercase tracking-wider">
          <span>{exam.examType} Simulation</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {exam.durationMinutes} mins
          </span>
        </div>

        <h3 className="font-heading font-bold text-2xl text-[#30362F] mt-2">
          {exam.title}
        </h3>

        <p className="text-sm text-[#716F65] mt-2.5 leading-relaxed">
          {exam.description}
        </p>

        {/* Section Skills Pills */}
        <div className="grid grid-cols-2 gap-2 mt-5 text-xs text-[#30362F]">
          <div className="flex items-center gap-2 p-2 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#327653] shrink-0" />
            <span>Listening (Audio Simulation)</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#327653] shrink-0" />
            <span>Reading (Academic Passages)</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#327653] shrink-0" />
            <span>Writing (AI IELTS Rubric)</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#327653] shrink-0" />
            <span>Speaking (Voice Interview)</span>
          </div>
        </div>
      </div>

      {/* Pricing & CTA */}
      <div className="mt-8 pt-6 border-t border-[#F2F0E9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] text-[#716F65] font-medium block">
            {isFree ? "Completely Free Access" : "One-Time Mock Fee"}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-heading font-black text-3xl text-[#203D35]">
              {isFree ? "Free" : "₹199"}
            </span>
            {!isFree && <span className="text-xs text-[#716F65]">/ attempt</span>}
          </div>
        </div>

        <div>
          {!isAuthenticated ? (
            <Link
              href={`/login?redirect=${encodeURIComponent(`/mock-tests/${exam.id}/instructions`)}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#203D35] text-white font-bold text-sm hover:bg-[#294C42] transition-colors focus-accessible shadow-sm w-full sm:w-auto"
            >
              <span>Sign In to Start</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          ) : isFree ? (
            <Link
              href={`/mock-tests/${exam.id}/instructions`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#FAF9F5] border border-[#E6E2D9] text-[#203D35] font-bold text-sm hover:bg-[#E3EDE6] transition-colors focus-accessible shadow-xs w-full sm:w-auto"
            >
              <span>Start Diagnostic</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          ) : hasEntitlement ? (
            <Link
              href={`/mock-tests/${exam.id}/instructions`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#203D35] text-white font-bold text-sm hover:bg-[#294C42] transition-colors focus-accessible shadow-sm w-full sm:w-auto"
            >
              <span>Begin Exam (Unlocked)</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onPurchase && onPurchase(exam)}
              disabled={isPurchasing}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#203D35] text-white font-bold text-sm hover:bg-[#294C42] disabled:opacity-50 transition-colors focus-accessible shadow-sm w-full sm:w-auto"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>{isPurchasing ? "Preparing Checkout..." : "Unlock Full Mock (₹199)"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
