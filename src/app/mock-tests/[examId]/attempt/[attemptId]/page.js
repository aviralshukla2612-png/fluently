"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ExamTimer from "@/components/exams/ExamTimer.jsx";
import QuestionNavigator from "@/components/exams/QuestionNavigator.jsx";
import AudioPlayer from "@/components/exams/AudioPlayer.jsx";
import SpeakingRecorder from "@/components/exams/SpeakingRecorder.jsx";
import { countWords } from "@/lib/exams/scoring/objectiveGrader.js";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Send,
  Save,
  CheckCircle2,
  FileText,
  Volume2,
  BookOpen,
  PenTool,
  Mic,
} from "lucide-react";

export default function ExamAttemptRunnerPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { examId, attemptId } = resolvedParams;

  const [attemptState, setAttemptState] = useState(null);
  const [exam, setExam] = useState(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({}); // questionId -> value
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const autosaveTimerRef = useRef(null);

  // 1. Load Attempt and Exam Definition
  useEffect(() => {
    async function loadAttemptData() {
      try {
        const res = await fetch(`/api/exams/attempts/${attemptId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setErrorMessage(data.error || "Failed to load examination attempt.");
          setIsLoading(false);
          return;
        }

        setAttemptState(data.attempt);
        setExam(data.exam);
        setResponses(data.savedResponses || {});

        // If attempt is already completed, route directly to results
        if (data.attempt.status === "COMPLETED") {
          router.push(`/mock-tests/results/${attemptId}`);
          return;
        }

        // Restore section position if currentSection was saved
        if (data.attempt.currentSection && data.exam?.sections) {
          const idx = data.exam.sections.findIndex((s) => s.sectionType === data.attempt.currentSection);
          if (idx !== -1) setActiveSectionIndex(idx);
        }
      } catch (err) {
        setErrorMessage(err.message || "Failed to load exam data.");
      } finally {
        setIsLoading(false);
      }
    }
    loadAttemptData();
  }, [attemptId, router]);

  // 2. Final Submit Handler
  const handleFinalSubmit = useCallback(async () => {
    setIsSubmittingFinal(true);
    setErrorMessage("");

    try {
      // Flush any pending unsaved responses
      const responseList = Object.entries(responses).map(([qid, val]) => ({
        questionId: qid,
        responseValue: String(val || ""),
        wordCount: typeof val === "string" ? countWords(val) : 0,
      }));

      await fetch(`/api/exams/attempts/${attemptId}/autosave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: responseList }),
      });

      const res = await fetch(`/api/exams/attempts/${attemptId}/submit-final`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to finalize examination submission.");
        setIsSubmittingFinal(false);
        return;
      }

      router.push(`/mock-tests/results/${attemptId}`);
    } catch (err) {
      setErrorMessage(err.message || "Failed to submit examination.");
      setIsSubmittingFinal(false);
    }
  }, [attemptId, responses, router]);

  // 3. Debounced Autosave Engine
  const triggerAutosave = useCallback(
    async (updatedResponses) => {
      setIsSaving(true);
      try {
        const responseList = Object.entries(updatedResponses).map(([qid, val]) => ({
          questionId: qid,
          responseValue: String(val || ""),
          wordCount: typeof val === "string" ? countWords(val) : 0,
        }));

        const res = await fetch(`/api/exams/attempts/${attemptId}/autosave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responses: responseList }),
        });

        const data = await res.json();
        if (data.success) {
          setLastSavedTime(new Date().toLocaleTimeString());
        } else if (data.isExpired) {
          alert("Your examination duration has expired. Redirecting to submit.");
          handleFinalSubmit();
        }
      } catch (err) {
        console.error("Autosave error:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [attemptId, handleFinalSubmit]
  );

  const handleResponseChange = (questionId, value) => {
    setResponses((prev) => {
      const next = { ...prev, [questionId]: value };
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        triggerAutosave(next);
      }, 1500);
      return next;
    });
  };

  // Section & Question Accessors
  const currentSection = exam?.sections?.[activeSectionIndex] || null;
  const currentQuestions = currentSection?.questions || [];
  const currentQuestion = currentQuestions[activeQuestionIndex] || null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-sm text-[#716F65]">
        Initializing examination environment and clock...
      </div>
    );
  }

  if (errorMessage && !attemptState) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6">
        <div className="bg-white border border-[#E6E2D9] rounded-3xl p-8 max-w-[500px] text-center shadow-card">
          <AlertTriangle className="w-10 h-10 text-[#A5413B] mx-auto mb-3" />
          <h3 className="font-heading font-bold text-xl text-[#30362F]">Exam Session Error</h3>
          <p className="text-xs text-[#716F65] mt-2">{errorMessage}</p>
          <Link
            href="/mock-tests"
            className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-full bg-[#203D35] text-white text-xs font-semibold"
          >
            Return to Mock Tests
          </Link>
        </div>
      </div>
    );
  }

  const answeredCount = currentQuestions.filter(
    (q) => responses[q.id] && String(responses[q.id]).trim().length > 0
  ).length;

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#30362F] flex flex-col font-sans">
      {/* Top Sticky Test Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E6E2D9] px-4 sm:px-8 py-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#327653] animate-pulse" />
            <h1 className="font-heading font-bold text-sm sm:text-base text-[#203D35]">
              {exam?.title}
            </h1>
          </div>
          <span className="hidden sm:inline text-xs text-[#716F65]">
            • {attemptState?.isDiagnostic ? "Diagnostic Mode" : "Official Academic Clock"}
          </span>
        </div>

        {/* Section Navigation Tabs */}
        <div className="hidden lg:flex items-center gap-1.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-full p-1">
          {exam?.sections?.map((sec, idx) => {
            const isActive = idx === activeSectionIndex;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setActiveSectionIndex(idx);
                  setActiveQuestionIndex(0);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors focus-accessible ${
                  isActive
                    ? "bg-[#203D35] text-white shadow-xs"
                    : "text-[#716F65] hover:text-[#30362F]"
                }`}
              >
                {sec.title}
              </button>
            );
          })}
        </div>

        {/* Timer & Autosave Status */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#716F65]">
            <Save className={`w-3.5 h-3.5 ${isSaving ? "text-[#327653] animate-spin" : "text-[#929087]"}`} />
            <span>{isSaving ? "Saving..." : lastSavedTime ? `Saved ${lastSavedTime}` : "Autosave active"}</span>
          </div>

          <ExamTimer
            initialRemainingSeconds={attemptState?.remainingSeconds || 0}
            onExpire={() => {
              alert("Exam time limit reached. Submitting your responses.");
              handleFinalSubmit();
            }}
          />

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-1.5 rounded-full bg-[#203D35] text-white text-xs font-semibold hover:bg-[#294C42] shadow-xs focus-accessible"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Main Examination Workspace */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center Work Area (Cols 1-8 or 1-9) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
          {/* Section Indicator Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-[#E6E2D9] rounded-2xl shadow-card">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
                Active Component ({activeSectionIndex + 1} of {exam?.sections?.length})
              </span>
              <h2 className="font-heading font-bold text-xl text-[#30362F]">
                {currentSection?.title}
              </h2>
            </div>

            <div className="text-xs text-[#716F65]">
              Question <strong>{activeQuestionIndex + 1}</strong> of <strong>{currentQuestions.length}</strong>
              <span className="ml-2 px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E6E2D9] font-medium text-[#466657]">
                {answeredCount}/{currentQuestions.length} answered
              </span>
            </div>
          </div>

          {/* Component-Specific Context Renderers */}
          {/* 1. LISTENING AUDIO */}
          {currentSection?.sectionType === "LISTENING" && (
            <AudioPlayer
              title={`Listening Passage ${Math.floor(activeQuestionIndex / 10) + 1}`}
              transcript={
                currentSection?.config?.audioTracks?.[Math.floor(activeQuestionIndex / 10)]?.transcript ||
                currentSection?.config?.transcript ||
                "Simulated listening track"
              }
              maxPlays={2}
            />
          )}

          {/* 2. READING PASSAGE (Split View) */}
          {currentSection?.sectionType === "READING" && (
            <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card max-h-[380px] overflow-y-auto leading-relaxed text-xs sm:text-sm text-[#30362F] font-serif border-l-4 border-l-[#203D35]">
              <h3 className="font-heading font-bold text-base text-[#203D35] mb-3">
                {currentSection?.config?.passages?.[Math.floor(activeQuestionIndex / 13)]?.title ||
                  currentSection?.config?.passageTitle ||
                  "Reading Passage"}
              </h3>
              <div className="whitespace-pre-line text-[#4B5248]">
                {currentSection?.config?.passages?.[Math.floor(activeQuestionIndex / 13)]?.text ||
                  currentSection?.config?.passageText ||
                  "No passage text available."}
              </div>
            </div>
          )}

          {/* QUESTION CARD */}
          {currentQuestion ? (
            <div className="bg-white border border-[#E6E2D9] rounded-3xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-mono font-bold text-[#466657] uppercase tracking-wider">
                    Question {currentQuestion.questionNumber}
                  </span>
                  <h3 className="font-heading font-semibold text-base sm:text-lg text-[#30362F] mt-1">
                    {currentQuestion.prompt}
                  </h3>
                </div>

                {currentQuestion.wordLimit && (
                  <span className="text-[11px] font-semibold text-[#8C6D1F] bg-[#FBF1D8] border border-[#8C6D1F]/30 px-2.5 py-1 rounded-full shrink-0">
                    Max {currentQuestion.wordLimit} Words
                  </span>
                )}
              </div>

              {/* ANSWER INPUT RENDERERS */}
              {/* Option A: Multiple Choice */}
              {currentQuestion.options && Array.isArray(currentQuestion.options) && (
                <div className="flex flex-col gap-2.5">
                  {currentQuestion.options.map((opt, oIdx) => {
                    const isSelected = responses[currentQuestion.id] === opt;
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleResponseChange(currentQuestion.id, opt)}
                        className={`p-4 rounded-xl border text-left text-xs sm:text-sm transition-all focus-accessible flex items-center justify-between ${
                          isSelected
                            ? "bg-[#E3EDE6] border-[#203D35] text-[#203D35] font-semibold shadow-xs"
                            : "bg-[#FAF9F5] border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[11px] font-bold shrink-0">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#327653]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Option B: True/False/Not Given */}
              {(currentQuestion.questionType === "TRUE_FALSE_NOT_GIVEN" ||
                currentQuestion.questionType === "YES_NO_NOT_GIVEN") && (
                <div className="grid grid-cols-3 gap-3">
                  {["TRUE", "FALSE", "NOT GIVEN"].map((val) => {
                    const isSelected = responses[currentQuestion.id] === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleResponseChange(currentQuestion.id, val)}
                        className={`py-3 px-4 rounded-xl border text-center text-xs sm:text-sm font-semibold transition-all focus-accessible ${
                          isSelected
                            ? "bg-[#203D35] border-[#203D35] text-white shadow-xs"
                            : "bg-[#FAF9F5] border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-white"
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Option C: Short Answer / Fill in Blank */}
              {(currentQuestion.questionType === "COMPLETION" ||
                currentQuestion.questionType === "SHORT_ANSWER") && (
                <div>
                  <label className="text-xs text-[#716F65] block mb-1.5 font-medium">
                    Type your answer:
                  </label>
                  <input
                    type="text"
                    value={responses[currentQuestion.id] || ""}
                    onChange={(e) => handleResponseChange(currentQuestion.id, e.target.value)}
                    placeholder="Enter answer here..."
                    className="w-full p-3.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-sm text-[#30362F] placeholder:text-[#929087] focus-accessible font-medium"
                  />
                </div>
              )}

              {/* Option D: Writing Tasks */}
              {(currentQuestion.questionType === "WRITING_TASK1" ||
                currentQuestion.questionType === "WRITING_TASK2") && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-[#716F65]">
                    <span>Essay Response Editor</span>
                    <span className="font-semibold text-[#203D35]">
                      Word Count: {countWords(responses[currentQuestion.id] || "")}
                      {currentQuestion.scoringRubric?.minWords &&
                        ` (Minimum recommended: ${currentQuestion.scoringRubric.minWords})`}
                    </span>
                  </div>
                  <textarea
                    rows={12}
                    value={responses[currentQuestion.id] || ""}
                    onChange={(e) => handleResponseChange(currentQuestion.id, e.target.value)}
                    placeholder="Write your essay response here. Paragraphs and sentence structure will be evaluated on Task Achievement, Coherence, Vocabulary, and Grammar."
                    className="w-full p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl text-sm text-[#30362F] leading-relaxed placeholder:text-[#929087] focus-accessible resize-y font-sans"
                  />
                </div>
              )}

              {/* Option E: Speaking Tasks */}
              {(currentQuestion.questionType === "SPEAKING_PART1" ||
                currentQuestion.questionType === "SPEAKING_PART2" ||
                currentQuestion.questionType === "SPEAKING_PART3") && (
                <SpeakingRecorder
                  prompt={currentQuestion.prompt}
                  initialTranscript={responses[currentQuestion.id] || ""}
                  onTranscriptChange={(val) => handleResponseChange(currentQuestion.id, val)}
                  targetDurationSeconds={currentQuestion.scoringRubric?.targetDurationSeconds || 60}
                />
              )}

              {/* Bottom Question Navigation Controls */}
              <div className="flex items-center justify-between pt-6 border-t border-[#F2F0E9]">
                <button
                  type="button"
                  disabled={activeQuestionIndex === 0}
                  onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E6E2D9] text-xs font-semibold text-[#716F65] hover:text-[#30362F] hover:bg-[#FAF9F5] disabled:opacity-40 disabled:cursor-not-allowed focus-accessible"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={activeQuestionIndex === currentQuestions.length - 1}
                  onClick={() => setActiveQuestionIndex((prev) => Math.min(currentQuestions.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#203D35] text-white text-xs font-semibold hover:bg-[#294C42] disabled:opacity-40 disabled:cursor-not-allowed focus-accessible shadow-xs"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-[#E6E2D9] rounded-2xl text-sm text-[#716F65]">
              No questions found in this section.
            </div>
          )}
        </div>

        {/* Right Sidebar: Palette Navigator & Section Transitions (Cols 9-12 or 10-12) */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
          <QuestionNavigator
            questions={currentQuestions}
            currentIndex={activeQuestionIndex}
            savedResponses={responses}
            onSelectQuestion={(idx) => setActiveQuestionIndex(idx)}
          />

          {/* Section Jumper */}
          <div className="bg-white border border-[#E6E2D9] rounded-2xl p-5 shadow-card flex flex-col gap-3">
            <h4 className="font-heading font-semibold text-sm text-[#30362F]">
              Section Progression
            </h4>
            <div className="flex flex-col gap-1.5">
              {exam?.sections?.map((sec, idx) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setActiveSectionIndex(idx);
                    setActiveQuestionIndex(0);
                  }}
                  className={`w-full p-2.5 rounded-xl text-xs font-medium text-left flex items-center justify-between transition-colors focus-accessible ${
                    idx === activeSectionIndex
                      ? "bg-[#E3EDE6] text-[#203D35] font-bold"
                      : "text-[#716F65] hover:bg-[#FAF9F5]"
                  }`}
                >
                  <span>{sec.title}</span>
                  <span className="text-[11px] text-[#929087] font-mono">{sec.durationMinutes}m</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Submit Confirmation Dialog */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E2D9] rounded-3xl p-6 sm:p-8 max-w-[500px] w-full shadow-2xl flex flex-col gap-4">
            <h3 className="font-heading font-bold text-xl text-[#30362F]">
              Finalize Examination Submission?
            </h3>
            <p className="text-xs text-[#716F65] leading-relaxed">
              You are about to submit your examination for final evaluation. Your objective answers will be scored, and writing/speaking sections will be evaluated against IELTS criteria. Once submitted, answers cannot be edited.
            </p>

            <div className="p-3.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs flex justify-between">
              <span className="text-[#716F65]">Total Answers Logged:</span>
              <strong className="text-[#203D35] font-bold">
                {Object.values(responses).filter((v) => v && String(v).trim().length > 0).length}
              </strong>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#716F65] hover:text-[#30362F]"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmittingFinal}
                className="px-6 py-2.5 rounded-full bg-[#203D35] text-white text-xs font-semibold hover:bg-[#294C42] disabled:opacity-50 shadow-sm"
              >
                {isSubmittingFinal ? "Evaluating Responses..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
