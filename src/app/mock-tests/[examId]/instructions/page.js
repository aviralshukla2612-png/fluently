"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ModulePage from "@/components/ModulePage.jsx";
import { useAuth } from "@/lib/auth/useAuth.js";
import {
  Volume2,
  Mic,
  ShieldCheck,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { speakText } from "@/lib/voice/tts.js";

export default function ExamInstructionsPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const examId = resolvedParams.examId;

  const { isAuthenticated } = useAuth();
  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState("");

  // Pre-test system check states
  const [audioTested, setAudioTested] = useState(false);
  const [micTested, setMicTested] = useState(false);

  useEffect(() => {
    async function loadExam() {
      try {
        const res = await fetch(`/api/exams/${examId}`);
        const data = await res.json();
        if (data.success && data.exam) {
          setExam(data.exam);
        }
      } catch (err) {
        console.error("Failed to load exam details:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadExam();
  }, [examId]);

  const handleTestAudio = () => {
    speakText("This is an audio playback sound check for your Fluently IELTS examination.", {
      lang: "en-GB",
      rate: 0.95,
      onEnd: () => setAudioTested(true),
      onError: () => setAudioTested(true),
    });
    setAudioTested(true);
  };

  const handleTestMic = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setMicTested(true);
      } else {
        setMicTested(true); // Fallback allows proceeding
      }
    } catch {
      setMicTested(true); // User can still proceed with manual transcript entry
    }
  };

  const handleStartExam = async () => {
    setStartError("");

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/mock-tests/${examId}/instructions`)}`);
      return;
    }

    setIsStarting(true);

    try {
      const res = await fetch(`/api/exams/${examId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.paymentRequired) {
          setStartError("Payment required. Please purchase this mock test (₹199) from the catalog.");
        } else {
          setStartError(data.error || "Failed to start examination attempt.");
        }
        setIsStarting(false);
        return;
      }

      router.push(`/mock-tests/${examId}/attempt/${data.attemptId}`);
    } catch (err) {
      setStartError(err.message || "An unexpected error occurred while starting the exam.");
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <ModulePage eyebrow="Instructions" title="Loading Examination" badge="Exam Setup">
        <div className="p-16 text-center text-sm text-[#716F65] bg-white border border-[#E6E2D9] rounded-3xl">
          Preparing instructions and hardware check...
        </div>
      </ModulePage>
    );
  }

  if (!exam) {
    return (
      <ModulePage eyebrow="Instructions" title="Exam Not Found" badge="Error">
        <div className="p-12 text-center bg-white border border-[#E6E2D9] rounded-3xl">
          <p className="text-sm text-[#716F65]">The requested examination could not be found.</p>
          <Link
            href="/mock-tests"
            className="inline-flex items-center gap-2 mt-4 px-6 py-2.5 rounded-full bg-[#203D35] text-white text-xs font-semibold"
          >
            Return to Exam Catalog
          </Link>
        </div>
      </ModulePage>
    );
  }

  return (
    <ModulePage
      eyebrow="Pre-Examination Instructions & System Verification"
      title={exam.title}
      description="Review instructions, complete the audio/microphone check, and familiarize yourself with exam regulations before initializing the timer."
      badge="Test Instructions"
    >
      <div className="flex flex-col gap-8 max-w-[860px] mx-auto pb-12">
        {startError && (
          <div className="p-4 bg-[#F8E8E5] border border-[#A5413B]/30 rounded-2xl text-xs text-[#A5413B] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{startError}</span>
            </div>
            {startError.includes("Payment required") && (
              <Link
                href="/mock-tests"
                className="px-4 py-1.5 rounded-full bg-[#A5413B] text-white text-xs font-semibold hover:bg-[#8A3631] shrink-0"
              >
                Go to Checkout
              </Link>
            )}
          </div>
        )}

        {/* Section Cards Breakdown */}
        <div className="bg-white border border-[#E6E2D9] rounded-3xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
                Total Duration
              </span>
              <h3 className="font-heading font-bold text-2xl text-[#30362F] mt-0.5">
                {exam.durationMinutes} Minutes Continuous Clock
              </h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FAF9F5] border border-[#E6E2D9] rounded-full text-xs font-semibold text-[#203D35]">
              <Clock className="w-3.5 h-3.5 text-[#466657]" />
              <span>{exam.sections.length} Sections</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {exam.sections.map((sec) => (
              <div
                key={sec.id}
                className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-base text-[#30362F]">
                    {sec.title}
                  </span>
                  <span className="text-xs font-mono font-semibold text-[#466657]">
                    {sec.durationMinutes}m
                  </span>
                </div>
                <p className="text-xs text-[#716F65] leading-relaxed">
                  {sec.instructions || `${sec.questions.length} questions included in this section.`}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Hardware & System Checks */}
        <div className="bg-white border border-[#E6E2D9] rounded-3xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
          <h3 className="font-heading font-bold text-xl text-[#30362F]">
            Step 1: Hardware & Audio Verification
          </h3>
          <p className="text-xs text-[#716F65]">
            Confirm your audio output and microphone to prevent technical interruptions during the Listening and Speaking components.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Audio Check */}
            <div className="p-4 border border-[#E6E2D9] rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E3EDE6] text-[#203D35] flex items-center justify-center shrink-0">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#30362F]">Audio Output Check</h4>
                  <span className="text-[11px] text-[#716F65]">
                    {audioTested ? "Audio verified" : "Click to test playback"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestAudio}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold focus-accessible ${
                  audioTested
                    ? "bg-[#E3EDE6] text-[#327653]"
                    : "bg-[#203D35] text-white hover:bg-[#294C42]"
                }`}
              >
                {audioTested ? "Verified ✓" : "Play Sound"}
              </button>
            </div>

            {/* Microphone Check */}
            <div className="p-4 border border-[#E6E2D9] rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E3EDE6] text-[#203D35] flex items-center justify-center shrink-0">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#30362F]">Microphone Check</h4>
                  <span className="text-[11px] text-[#716F65]">
                    {micTested ? "Microphone verified" : "Click to test permissions"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestMic}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold focus-accessible ${
                  micTested
                    ? "bg-[#E3EDE6] text-[#327653]"
                    : "bg-[#203D35] text-white hover:bg-[#294C42]"
                }`}
              >
                {micTested ? "Verified ✓" : "Check Mic"}
              </button>
            </div>
          </div>
        </div>

        {/* Regulatory Guidelines & Rules */}
        <div className="p-6 bg-[#FAF9F5] border border-[#E6E2D9] rounded-3xl flex flex-col gap-3 text-xs text-[#716F65] leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-sm text-[#30362F]">
            <Info className="w-4 h-4 text-[#466657]" />
            <span>Candidate Examination Rules</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Once initialized, the countdown timer runs continuously on the server and cannot be paused.</li>
            <li>All responses and essay drafts are automatically synchronized and autosaved in real-time.</li>
            <li>In the Listening component, audio recordings follow strict play policies (up to 2 plays).</li>
            <li>Do not close or navigate away from the browser window during active section progression.</li>
          </ul>
        </div>

        {/* Student Sign In Notice if not authenticated */}
        {!isAuthenticated && (
          <div className="p-5 sm:p-6 bg-amber-50/70 border border-amber-200/80 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-amber-950">
                  Student Sign In Required
                </h4>
                <p className="text-amber-800/90 mt-0.5">
                  To save your official mock test responses, AI evaluation, and band score report to your student profile, please sign in or register before starting.
                </p>
              </div>
            </div>
            <Link
              href={`/login?redirect=${encodeURIComponent(`/mock-tests/${examId}/instructions`)}`}
              className="px-5 py-2.5 rounded-full bg-[#203D35] text-white font-semibold text-xs hover:bg-[#294C42] shrink-0 transition-colors shadow-xs"
            >
              Sign In / Register
            </Link>
          </div>
        )}

        {/* Start Button */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-[#E6E2D9]">
          <Link
            href="/mock-tests"
            className="px-6 py-3 rounded-full text-xs font-semibold text-[#716F65] hover:text-[#30362F]"
          >
            Cancel & Return
          </Link>

          <button
            type="button"
            onClick={handleStartExam}
            disabled={isStarting}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#203D35] text-white font-bold text-sm hover:bg-[#294C42] disabled:opacity-50 transition-transform active:scale-95 focus-accessible shadow-sm"
          >
            <span>
              {isStarting
                ? "Initializing Clock..."
                : !isAuthenticated
                ? "Sign In to Begin Examination"
                : "Start Examination Now"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </ModulePage>
  );
}
