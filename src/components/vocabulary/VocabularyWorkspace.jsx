"use client";

import { useState } from "react";
import { VOCABULARY_DATASET } from "@/data/vocabulary/words.js";
import { getDueWords } from "@/lib/learning/reviewScheduler.js";
import WordExplorer from "./WordExplorer";
import FlashcardDeck from "./FlashcardDeck";
import VocabularyQuiz from "./VocabularyQuiz";
import { BookOpen, Layers, HelpCircle, Clock, Sparkles } from "lucide-react";

export default function VocabularyWorkspace() {
  const [activeTab, setActiveTab] = useState("explorer"); // 'explorer' | 'flashcards' | 'quiz' | 'due'

  const dueWords = getDueWords(VOCABULARY_DATASET);

  return (
    <div className="flex flex-col gap-5 max-w-[1020px] mx-auto">
      {/* Top Module Subnav Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E2D9] pb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Active Lexical Study
          </span>
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#30362F] mt-0.5">
            Vocabulary & Collocations
          </h2>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setActiveTab("explorer")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors focus-accessible ${
              activeTab === "explorer"
                ? "bg-[#203D35] text-white shadow-xs"
                : "bg-white border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-[#FAF9F5]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Word Bank ({VOCABULARY_DATASET.length.toLocaleString()})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("flashcards")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors focus-accessible ${
              activeTab === "flashcards"
                ? "bg-[#203D35] text-white shadow-xs"
                : "bg-white border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-[#FAF9F5]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Flashcards</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("quiz")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors focus-accessible ${
              activeTab === "quiz"
                ? "bg-[#203D35] text-white shadow-xs"
                : "bg-white border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-[#FAF9F5]"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Quiz Practice</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("due")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors focus-accessible ${
              activeTab === "due"
                ? "bg-[#203D35] text-white shadow-xs"
                : "bg-white border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-[#FAF9F5]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Due Today ({dueWords.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "explorer" && <WordExplorer words={VOCABULARY_DATASET} />}
      {activeTab === "flashcards" && <FlashcardDeck words={VOCABULARY_DATASET} />}
      {activeTab === "quiz" && <VocabularyQuiz words={VOCABULARY_DATASET} />}
      {activeTab === "due" && (
        <div className="flex flex-col gap-6">
          <div className="p-4 sm:p-5 bg-white border border-[#E6E2D9] rounded-2xl shadow-card flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold text-base text-[#30362F]">
                Spaced Repetition Queue
              </h3>
              <p className="text-xs text-[#716F65] mt-0.5">
                {dueWords.length === 0
                  ? "All words have been reviewed for today! Great job."
                  : `${dueWords.length} words are ready for scheduled recall practice.`}
              </p>
            </div>
            {dueWords.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("flashcards")}
                className="px-4 py-2 rounded-full bg-[#203D35] text-white text-xs font-semibold hover:bg-[#294C42] shadow-sm transition-colors focus-accessible"
              >
                Review Deck Now
              </button>
            )}
          </div>

          <WordExplorer words={dueWords} />
        </div>
      )}

      {/* Bottom Educational Banner */}
      <div className="p-6 bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E3EDE6] text-[#203D35] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-[#30362F]">
              Spaced Repetition Practice Intervals
            </p>
            <p className="text-xs text-[#716F65]">
              Rating words as Good (3 days) or Easy (7 days) schedules future review intervals deterministically, building durable long-term memory.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
