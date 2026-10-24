"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  Sparkles,
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  RefreshCw,
  Clock,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export default function ExamResultsPage({ params }) {
  const unwrappedParams = use(params);
  const { attemptId } = unwrappedParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        const res = await fetch(`/api/exams/attempts/${attemptId}/report`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load examination report");
        }
        setReport(data.report);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Generating Your Exam Assessment Report...</h2>
        <p className="text-slate-400 text-sm mt-1">Calculating raw scores and synthesizing AI evaluation rubrics.</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="p-8 rounded-2xl bg-slate-900 border border-red-500/30 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Report Unavailable</h2>
          <p className="text-slate-400 text-sm mb-6">{error || "Unable to find attempt report."}</p>
          <Link
            href="/mock-tests"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition"
          >
            Back to Mock Tests
          </Link>
        </div>
      </div>
    );
  }

  const { overallBand, sectionResults, evaluationDetails, recommendations, summary, candidateName, attemptDate } = report;

  const sectionIcons = {
    LISTENING: Headphones,
    READING: BookOpen,
    WRITING: PenTool,
    SPEAKING: Mic,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:text-black print:p-0">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link
            href="/mock-tests"
            className="text-sm text-slate-400 hover:text-white flex items-center gap-1.5 transition"
          >
            ← All Mock Tests
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/mock-tests/history"
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-sm font-medium hover:text-white hover:border-slate-700 transition"
            >
              Attempt History
            </Link>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400 transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* Disclaimer Banner */}
        <div className="rounded-xl p-4 bg-slate-900/80 border border-amber-500/30 text-amber-200/90 text-xs sm:text-sm flex items-start gap-3 print:border-black print:bg-transparent print:text-black">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 print:hidden" />
          <div>
            <span className="font-semibold text-amber-300 print:text-black">Independent Practice Assessment: </span>
            This report represents an unofficial practice evaluation by Fluently. Automated Writing and Speaking scores are AI-assisted estimates based on IELTS criteria and may differ from official British Council / IDP human examiners.
          </div>
        </div>

        {/* Header Hero Card */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-8 shadow-2xl relative overflow-hidden print:border-black print:bg-white print:text-black print:shadow-none">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3 print:border-black print:text-black">
                <Sparkles className="w-3.5 h-3.5" />
                Performance Report
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {report.examTitle || "IELTS-Style Academic Mock"}
              </h1>
              <p className="text-slate-400 text-sm mt-1 print:text-slate-700">
                Candidate: <span className="text-slate-200 font-medium print:text-black">{candidateName || "Candidate"}</span> • Date: {attemptDate ? new Date(attemptDate).toLocaleDateString("en-IN", { dateStyle: "long" }) : new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Overall Score Badge */}
            <div className="bg-slate-950/80 border border-emerald-500/40 rounded-2xl p-6 text-center shrink-0 min-w-[200px] shadow-lg print:border-black print:bg-slate-50">
              <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1 font-medium print:text-slate-700">
                Overall Estimated Band
              </span>
              <div className="text-5xl font-black text-emerald-400 print:text-black">
                {overallBand !== null && overallBand !== undefined ? Number(overallBand).toFixed(1) : "N/A"}
              </div>
              <span className="text-xs text-slate-400 mt-2 block print:text-slate-700">
                CEFR Equivalent: {overallBand >= 7.5 ? "C1/C2 Proficient" : overallBand >= 6.0 ? "B2 Independent" : "B1 Threshold"}
              </span>
            </div>
          </div>
        </div>

        {/* Section Score Breakdown Grid */}
        <div>
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            Section-by-Section Results
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sectionResults && sectionResults.map((sec) => {
              const Icon = sectionIcons[sec.sectionType] || Award;
              return (
                <div
                  key={sec.sectionType}
                  className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition print:border-black print:bg-white"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {sec.sectionType}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 print:hidden">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="my-2">
                    <div className="text-3xl font-extrabold text-white print:text-black">
                      {sec.estimatedBand !== null && sec.estimatedBand !== undefined
                        ? `Band ${Number(sec.estimatedBand).toFixed(1)}`
                        : "Ungraded"}
                    </div>
                    {sec.rawScore !== null && sec.rawScore !== undefined && (
                      <p className="text-xs text-slate-400 mt-1 print:text-slate-600">
                        Raw Score: <span className="font-semibold text-slate-200 print:text-black">{sec.rawScore}</span> / {sec.maxRawScore || 40} correct
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 print:border-black print:text-slate-700">
                    {sec.sectionType === "LISTENING" || sec.sectionType === "READING"
                      ? "Objective scoring based on official conversion table"
                      : "AI-evaluated against standard IELTS rubric criteria"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Evaluation Tabs: Writing & Speaking */}
        {evaluationDetails && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Detailed Qualitative Evaluation
            </h2>

            {/* Writing Details */}
            {evaluationDetails.writing && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6 print:border-black print:bg-white">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-4 print:border-black">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 print:hidden">
                      <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Academic Writing Evaluation</h3>
                      <p className="text-xs text-slate-400">Assessed on Task Achievement, Cohesion, Lexical Resource, & Grammar</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-400 print:text-black">
                      Band {evaluationDetails.writing.estimatedBand !== null ? Number(evaluationDetails.writing.estimatedBand).toFixed(1) : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Criteria breakdown */}
                {evaluationDetails.writing.criteria && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(evaluationDetails.writing.criteria).map(([critKey, critVal]) => (
                      <div key={critKey} className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 space-y-2 print:border-black print:bg-slate-50">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-300 capitalize">
                            {critKey.replace(/([A-Z])/g, " $1")}
                          </span>
                          <span className="text-sm font-bold text-emerald-400 print:text-black">
                            Band {critVal.band || critVal.score || "N/A"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed print:text-slate-800">
                          {critVal.explanation || critVal.feedback || "Demonstrated appropriate competence across rubric criteria."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2 print:border-black print:bg-transparent">
                    <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 print:text-black">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Key Writing Strengths
                    </h4>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside print:text-black">
                      {(evaluationDetails.writing.strengths || ["Cohesive paragraph organization", "Varied transition phrases"]).map((st, i) => (
                        <li key={i}>{st}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-2 print:border-black print:bg-transparent">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 print:text-black">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Areas for Score Boost
                    </h4>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside print:text-black">
                      {(evaluationDetails.writing.weaknesses || ["Extend complex sentence structures", "Enhance precision in academic collocations"]).map((wk, i) => (
                        <li key={i}>{wk}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Speaking Details */}
            {evaluationDetails.speaking && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6 print:border-black print:bg-white">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-4 print:border-black">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 print:hidden">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Speaking Interview Evaluation</h3>
                      <p className="text-xs text-slate-400">Assessed on Fluency, Lexical Range, Grammatical Accuracy, & Intelligibility</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-400 print:text-black">
                      Band {evaluationDetails.speaking.estimatedBand !== null ? Number(evaluationDetails.speaking.estimatedBand).toFixed(1) : "N/A"}
                    </span>
                  </div>
                </div>

                {evaluationDetails.speaking.criteria && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(evaluationDetails.speaking.criteria).map(([critKey, critVal]) => (
                      <div key={critKey} className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 space-y-2 print:border-black print:bg-slate-50">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-300 capitalize">
                            {critKey.replace(/([A-Z])/g, " $1")}
                          </span>
                          <span className="text-sm font-bold text-emerald-400 print:text-black">
                            Band {critVal.band || critVal.score || "N/A"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed print:text-slate-800">
                          {critVal.explanation || critVal.feedback || "Speech delivered with natural cadence and intelligible articulation."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Personalized Fluently Learning Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 p-6 space-y-4 print:hidden">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold tracking-tight">Recommended Next Steps in Fluently</h2>
            </div>
            <p className="text-xs text-slate-400">
              Based on weaknesses identified during this exam attempt, our AI learning coach recommends targeting these interactive modules:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {recommendations.map((rec, i) => (
                <Link
                  key={i}
                  href={rec.href || "/"}
                  className="group block p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-400">{rec.module || "Practice"}</span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-100 group-hover:text-white mb-1">{rec.title}</h4>
                  <p className="text-xs text-slate-400">{rec.reason}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer / Return actions */}
        <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link
            href="/mock-tests"
            className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold text-sm hover:bg-slate-800 transition"
          >
            ← Back to Exam Center
          </Link>
          <Link
            href="/mock-tests"
            className="px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition"
          >
            Take Another Practice Test
          </Link>
        </div>

      </div>
    </div>
  );
}
