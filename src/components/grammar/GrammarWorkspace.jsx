"use client";

import { useState } from "react";
import { GRAMMAR_LESSONS } from "@/data/grammar/lessons.js";
import { getItem, STORAGE_KEYS } from "@/lib/learning/storage.js";
import GrammarQuiz from "./GrammarQuiz";
import {
  BookOpen,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  Award,
  Sparkles,
  ChevronRight,
} from "lucide-react";

export default function GrammarWorkspace() {
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [activeLessonId, setActiveLessonId] = useState(GRAMMAR_LESSONS[0].id);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [completedLessonsMap, setCompletedLessonsMap] = useState(() =>
    getItem(STORAGE_KEYS.GRAMMAR_PROGRESS, {})
  );

  const filteredLessons =
    selectedDifficulty === "all"
      ? GRAMMAR_LESSONS
      : GRAMMAR_LESSONS.filter((l) => l.difficulty === selectedDifficulty);

  const activeLesson =
    GRAMMAR_LESSONS.find((l) => l.id === activeLessonId) || GRAMMAR_LESSONS[0];

  const handleSelectLesson = (lessonId) => {
    setActiveLessonId(lessonId);
    setIsQuizMode(false);
  };

  const handleLessonCompleted = (lessonId, score) => {
    setCompletedLessonsMap((prev) => ({
      ...prev,
      [lessonId]: {
        completed: true,
        highScore: Math.max(prev[lessonId]?.highScore || 0, score),
      },
    }));
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1020px] mx-auto">
      {/* Top Header & Difficulty Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E2D9] pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Active Grammar Unit
          </span>
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#30362F] mt-0.5">
            {isQuizMode ? `Quiz: ${activeLesson.title}` : activeLesson.title}
          </h2>
        </div>

        {/* Tier switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {["all", "beginner", "intermediate", "advanced"].map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedDifficulty(tier)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors focus-accessible ${
                selectedDifficulty === tier
                  ? "bg-[#203D35] text-white shadow-xs"
                  : "bg-white border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-[#FAF9F5]"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Lesson View or Quiz View */}
      {isQuizMode ? (
        <GrammarQuiz
          lesson={activeLesson}
          onCompleteLesson={handleLessonCompleted}
          onBackToLesson={() => setIsQuizMode(false)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Lesson Explanations, Rule Box, Examples */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
              {/* Unit Meta */}
              <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
                    {activeLesson.category}
                  </span>
                  <h3 className="font-heading font-bold text-2xl text-[#30362F] mt-1">
                    {activeLesson.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#716F65] bg-[#FAF9F5] border border-[#E6E2D9] px-3 py-1 rounded-full capitalize">
                    {activeLesson.difficulty}
                  </span>
                  {completedLessonsMap[activeLesson.id]?.completed && (
                    <span className="text-xs text-[#327653] bg-[#E7F2E9] border border-[#CEDDD2] px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Completed</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Learning Objective */}
              <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-[#466657] shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs sm:text-sm text-[#30362F] font-medium leading-relaxed">
                  <strong>Objective:</strong> {activeLesson.learningObjective}
                </p>
              </div>

              {/* Short explanation */}
              <p className="text-sm text-[#716F65] leading-relaxed">
                {activeLesson.shortExplanation}
              </p>

              {/* Grammar Formula / Form Rule Box */}
              <div className="p-4 sm:p-5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#30362F]">
                  Sentence Structure Formula
                </span>
                <code className="text-sm font-mono text-[#203D35] bg-white border border-[#E6E2D9] p-3 rounded-lg block overflow-x-auto">
                  {activeLesson.grammarRule}
                </code>
              </div>

              {/* Authentic Conversational Examples */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#30362F]">
                  Authentic Conversational Examples
                </span>
                <div className="flex flex-col gap-2.5">
                  {activeLesson.examples.map((ex, i) => (
                    <div
                      key={i}
                      className="p-3.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                    >
                      <span className="font-medium text-[#30362F] text-sm">
                        {ex.sentence}
                      </span>
                      <span className="text-[#716F65] italic text-[11px] shrink-0">
                        {ex.note}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Common Mistakes */}
              {activeLesson.commonMistakes && activeLesson.commonMistakes.length > 0 && (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#30362F] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#93621B]" aria-hidden="true" />
                    <span>Common Learner Mistakes</span>
                  </span>
                  <div className="flex flex-col gap-3">
                    {activeLesson.commonMistakes.map((mistake, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl flex flex-col gap-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[#A5413B] line-through font-medium">
                            {mistake.incorrect}
                          </span>
                          <span className="text-[#716F65]">→</span>
                          <span className="text-[#327653] font-semibold">
                            {mistake.correct}
                          </span>
                        </div>
                        <p className="text-[#716F65] text-[11px]">
                          {mistake.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Practice Button */}
              <div className="pt-4 border-t border-[#F2F0E9] flex items-center justify-between">
                <span className="text-xs text-[#929087]">
                  {activeLesson.practiceQuestions?.length || 0} interactive questions available
                </span>
                <button
                  type="button"
                  onClick={() => setIsQuizMode(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#203D35] text-white text-xs sm:text-sm font-semibold hover:bg-[#294C42] shadow-sm transition-colors focus-accessible"
                >
                  <span>Practice Structure</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Curriculum List & Progress */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white border border-[#E6E2D9] rounded-2xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#466657]" aria-hidden="true" />
                  <h3 className="font-heading font-semibold text-base text-[#30362F]">
                    Curriculum Units
                  </h3>
                </div>
                <span className="text-xs text-[#929087]">
                  {filteredLessons.length} units
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {filteredLessons.map((l) => {
                  const isCompleted = completedLessonsMap[l.id]?.completed;
                  const isCurrent = l.id === activeLessonId;

                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => handleSelectLesson(l.id)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-colors focus-accessible ${
                        isCurrent
                          ? "bg-[#FAF9F5] border-[#203D35] font-semibold text-[#203D35]"
                          : "bg-white border-[#E6E2D9] text-[#716F65] hover:bg-[#FAF9F5]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {isCompleted ? (
                          <CheckCircle className="w-3.5 h-3.5 text-[#327653] shrink-0" aria-hidden="true" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-[#E6E2D9] shrink-0" />
                        )}
                        <span className="truncate">{l.title}</span>
                      </div>
                      <span className="text-[10px] font-medium capitalize text-[#929087] shrink-0">
                        {l.difficulty}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl p-6">
              <h4 className="font-heading font-semibold text-sm text-[#30362F] mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#327653]" aria-hidden="true" />
                <span>Contextual Grammar Principle</span>
              </h4>
              <p className="text-xs text-[#716F65] leading-relaxed">
                Rather than memorizing abstract tables, internalize patterns through repeated contextual exposure and active question answering.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
