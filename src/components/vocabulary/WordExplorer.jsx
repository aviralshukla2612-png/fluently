"use client";

import { useState } from "react";
import { speakText } from "@/lib/voice/tts.js";
import {
  getSavedWordIds,
  toggleSaveWord,
  getWordReviewState,
  saveWordReview,
} from "@/lib/learning/reviewScheduler.js";
import {
  Search,
  Volume2,
  Bookmark,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

function getVisiblePages(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function WordExplorer({ words = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [savedIds, setSavedIds] = useState(() => getSavedWordIds());
  const [filterSavedOnly, setFilterSavedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [jumpPageInput, setJumpPageInput] = useState("");

  // Dynamic categories
  const categories = ["All", ...new Set(words.map((w) => w.category))];

  // Filtering
  const filteredWords = words.filter((item) => {
    if (filterSavedOnly && !savedIds.includes(item.id)) return false;
    if (selectedCategory !== "All" && item.category !== selectedCategory) return false;
    if (selectedDifficulty !== "all" && item.difficulty !== selectedDifficulty) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchWord = item.word.toLowerCase().includes(q);
      const matchDef = item.meaning.toLowerCase().includes(q);
      const matchEx = item.exampleSentence.toLowerCase().includes(q);
      const matchSyn = item.synonyms?.some((s) => s.toLowerCase().includes(q));
      if (!matchWord && !matchDef && !matchEx && !matchSyn) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedWords = filteredWords.slice(startIndex, startIndex + pageSize);

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      const el = document.getElementById("words-list-header");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handlePageChange = (newPage) => {
    const page = Math.max(1, Math.min(totalPages, newPage));
    setCurrentPage(page);
    scrollToTop();
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleDifficultyChange = (diff) => {
    setSelectedDifficulty(diff);
    setCurrentPage(1);
  };

  const handleSavedOnlyChange = () => {
    setFilterSavedOnly((prev) => !prev);
    setCurrentPage(1);
  };

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const parsed = parseInt(jumpPageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      handlePageChange(parsed);
      setJumpPageInput("");
    }
  };

  const handlePlayPronunciation = (wordText) => {
    speakText(wordText, { lang: "en-US", rate: 0.9 });
  };

  const handleToggleSave = (wordId) => {
    toggleSaveWord(wordId);
    setSavedIds(getSavedWordIds());
  };

  const handleQuickMarkLearned = (wordId) => {
    saveWordReview(wordId, "good");
    // Trigger local state re-render
    setSavedIds([...getSavedWordIds()]);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-2.5 p-3.5 bg-white border border-[#E6E2D9] rounded-2xl shadow-card">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#929087] absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search across 3,700+ words, definitions, collocations..."
              className="w-full pl-10 pr-4 py-2 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs sm:text-sm text-[#30362F] placeholder:text-[#929087] focus-accessible"
            />
          </div>

          {/* Difficulty & Saved Filter */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSavedOnlyChange}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors focus-accessible ${
                filterSavedOnly
                  ? "bg-[#203D35] text-white"
                  : "bg-[#FAF9F5] border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F]"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Saved ({savedIds.length})</span>
            </button>

            <select
              value={selectedDifficulty}
              onChange={(e) => handleDifficultyChange(e.target.value)}
              className="px-3 py-2 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#30362F] font-medium focus-accessible capitalize"
              aria-label="Filter by difficulty"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner (A1-A2)</option>
              <option value="intermediate">Intermediate (B1)</option>
              <option value="advanced">Advanced (B2-C1)</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <Filter className="w-3.5 h-3.5 text-[#716F65] shrink-0 mr-1" aria-hidden="true" />
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors focus-accessible ${
                selectedCategory === cat
                  ? "bg-[#203D35] text-white shadow-xs"
                  : "bg-[#FAF9F5] border border-[#E6E2D9] text-[#716F65] hover:bg-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Words Grid Status & Top Quick Pagination */}
      <div id="words-list-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1 text-xs text-[#716F65] pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Showing <strong className="text-[#30362F] font-semibold">{filteredWords.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + pageSize, filteredWords.length)}</strong> of <strong className="text-[#30362F] font-semibold">{filteredWords.length.toLocaleString()}</strong> words
          </span>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1 ml-1 text-[11px]">
            <span className="text-[#929087]">Show:</span>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handlePageSizeChange(size)}
                className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                  pageSize === size
                    ? "bg-[#203D35] text-white"
                    : "text-[#716F65] hover:text-[#30362F] hover:bg-[#FAF9F5]"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Top Compact Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => handlePageChange(validCurrentPage - 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-[#E6E2D9] text-[#30362F] hover:bg-[#FAF9F5] disabled:opacity-40 disabled:cursor-not-allowed focus-accessible shadow-xs"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Prev</span>
            </button>

            <span className="text-xs font-medium text-[#30362F]">
              {validCurrentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => handlePageChange(validCurrentPage + 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-[#E6E2D9] text-[#30362F] hover:bg-[#FAF9F5] disabled:opacity-40 disabled:cursor-not-allowed focus-accessible shadow-xs"
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Words Grid */}
      {paginatedWords.length === 0 ? (
        <div className="p-10 text-center bg-white border border-[#E6E2D9] rounded-2xl text-[#716F65] text-sm">
          No vocabulary words match your current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {paginatedWords.map((item) => {
            const isSaved = savedIds.includes(item.id);
            const review = getWordReviewState(item.id);

            return (
              <div
                key={item.id}
                className="bg-white border border-[#E6E2D9] rounded-2xl p-5 sm:p-6 shadow-card hover:border-[#CEDDD2] transition-colors flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-baseline gap-2.5">
                        <h3 className="font-heading font-bold text-xl sm:text-2xl text-[#30362F]">
                          {item.word}
                        </h3>
                        <span className="text-xs font-medium text-[#716F65] italic">
                          {item.partOfSpeech}
                        </span>
                      </div>
                      {item.phoneticSpelling && (
                        <span className="text-xs font-mono text-[#466657] mt-0.5 inline-block">
                          {item.phoneticSpelling}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[#466657] bg-[#E3EDE6] px-2 py-0.5 rounded capitalize">
                        {item.difficulty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleSave(item.id)}
                        className={`p-1.5 rounded-lg transition-colors focus-accessible ${
                          isSaved
                            ? "bg-[#E3EDE6] text-[#203D35]"
                            : "text-[#929087] hover:text-[#203D35] hover:bg-[#FAF9F5]"
                        }`}
                        aria-label={isSaved ? `Remove bookmark for ${item.word}` : `Bookmark ${item.word}`}
                      >
                        <Bookmark className="w-4 h-4 fill-current" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Definition */}
                  <p className="text-sm text-[#30362F] mt-3 font-medium">
                    {item.meaning}
                  </p>

                  {/* Context sentence */}
                  <div className="mt-3 p-3 bg-[#FAF9F5] border border-[#E6E2D9] rounded-xl text-xs text-[#716F65] leading-relaxed">
                    <span className="font-semibold text-[#30362F]">Example: </span>
                    “{item.exampleSentence}”
                  </div>

                  {/* Synonyms & Collocations */}
                  {item.synonyms && item.synonyms.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#716F65]">
                      <span className="font-medium text-[#30362F]">Synonyms:</span>
                      <span className="italic">{item.synonyms.join(", ")}</span>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-[#F2F0E9] text-xs">
                  <button
                    type="button"
                    onClick={() => handlePlayPronunciation(item.word)}
                    className="inline-flex items-center gap-1.5 text-[#203D35] font-medium hover:underline focus-accessible"
                  >
                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Pronounce</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {review?.status ? (
                      <span className="text-[11px] font-medium text-[#466657] bg-[#E3EDE6] px-2 py-0.5 rounded capitalize">
                        {review.status} ({review.intervalDays}d)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuickMarkLearned(item.id)}
                        className="text-[11px] text-[#716F65] hover:text-[#203D35] hover:underline"
                      >
                        Mark as learned
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comprehensive Bottom Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E6E2D9] bg-white p-4 rounded-2xl shadow-xs">
          {/* Left: Previous & First buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => handlePageChange(1)}
              className="p-2 rounded-xl text-xs font-medium bg-[#FAF9F5] border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed focus-accessible"
              title="First Page"
              aria-label="First Page"
            >
              <ChevronsLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => handlePageChange(validCurrentPage - 1)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-[#FAF9F5] border border-[#E6E2D9] text-[#30362F] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed focus-accessible shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Previous</span>
            </button>
          </div>

          {/* Middle: Numbered Page Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {getVisiblePages(validCurrentPage, totalPages).map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-[#929087]">
                    ...
                  </span>
                );
              }

              const isCurrent = p === validCurrentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePageChange(p)}
                  className={`w-8 h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors focus-accessible ${
                    isCurrent
                      ? "bg-[#203D35] text-white shadow-xs"
                      : "bg-[#FAF9F5] border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-white"
                  }`}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Right: Next & Last buttons + Jump Input */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => handlePageChange(validCurrentPage + 1)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-[#FAF9F5] border border-[#E6E2D9] text-[#30362F] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed focus-accessible shadow-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => handlePageChange(totalPages)}
              className="p-2 rounded-xl text-xs font-medium bg-[#FAF9F5] border border-[#E6E2D9] text-[#716F65] hover:text-[#30362F] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed focus-accessible"
              title="Last Page"
              aria-label="Last Page"
            >
              <ChevronsRight className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Jump to Page input */}
            <form onSubmit={handleJumpSubmit} className="flex items-center gap-1 ml-2">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                placeholder="Page"
                className="w-14 px-2 py-1.5 text-xs text-center bg-[#FAF9F5] border border-[#E6E2D9] rounded-lg focus-accessible"
                aria-label="Jump to page"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 text-xs font-semibold bg-[#203D35] text-white rounded-lg hover:bg-[#294C42] focus-accessible transition-colors"
              >
                Go
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
