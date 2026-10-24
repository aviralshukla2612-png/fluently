"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  Award,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  CheckCircle2,
} from "lucide-react";

export default function ExamHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const res = await fetch("/api/exams/history");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load examination history");
        }
        setAttempts(data.attempts || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/mock-tests"
            className="text-sm text-slate-400 hover:text-white flex items-center gap-1.5 transition"
          >
            ← Back to Mock Exam Center
          </Link>
          <span className="text-xs text-slate-400">Personal Assessment History</span>
        </div>

        {/* Header */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Your Mock Exam Attempts</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Review past mock exams, track your band score progress over time, and revisit qualitative feedback reports.
          </p>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-3" />
            <p className="text-slate-400 text-sm">Loading your exam records...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-slate-900 border border-red-500/30 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-300 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition"
            >
              Retry
            </button>
          </div>
        ) : attempts.length === 0 ? (
          <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
            <FileText className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-200">No Mock Exam Attempts Yet</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              You haven&apos;t taken any IELTS-style diagnostic or full mock examinations yet. Start with our free diagnostic test to evaluate your baseline band score.
            </p>
            <div className="pt-2">
              <Link
                href="/mock-tests"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition"
              >
                Browse Mock Tests
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {attempts.map((att) => (
              <div
                key={att.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-6 hover:border-slate-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {att.exam?.examType === "DIAGNOSTIC" ? "Free Diagnostic" : "Academic Full Mock"}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        att.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {att.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-white">
                    {att.exam?.title || "IELTS-Style Mock Test"}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(att.startedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {att.completedAt ? "Finished" : "Active / Expired"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-800">
                  {att.overallBand !== null && att.overallBand !== undefined ? (
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">Estimated Band</span>
                      <span className="text-2xl font-black text-emerald-400">
                        {Number(att.overallBand).toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">Incomplete</div>
                  )}

                  {att.status === "COMPLETED" ? (
                    <Link
                      href={`/mock-tests/results/${att.id}`}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      View Report
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      href={`/mock-tests/${att.examId}/attempt/${att.id}`}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition"
                    >
                      Resume
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
