import Link from "next/link";
import Image from "next/image";
import LearningCard from "@/components/LearningCard";
import DailyPlanCard from "@/components/learning/DailyPlanCard";
import {
  AudioLines,
  Languages,
  BookOpen,
  BookMarked,
  ArrowRight,
  Headphones,
  Sparkles,
  Volume2,
  MessageSquare,
  Bot,
} from "lucide-react";

export const metadata = {
  title: "Home",
  description:
    "Build confidence in English, one sentence at a time through shadowing, dictation, grammar, and vocabulary practice.",
};

const MODULES = [
  {
    number: "01",
    title: "Shadowing",
    tag: "Speaking Cadence",
    description:
      "Listen to natural spoken English and practice speaking simultaneously to calibrate pitch, intonation, and rhythm.",
    href: "/say-it",
    icon: Languages,
  },
  {
    number: "02",
    title: "Dictation",
    tag: "Aural Accuracy",
    description:
      "Sharpen your listening comprehension by transcribing authentic native sentences word-for-word in real time.",
    href: "/dictation",
    icon: AudioLines,
  },
  {
    number: "03",
    title: "Grammar",
    tag: "Syntax in Action",
    description:
      "Internalize natural English structures and tenses through contextual examples rather than dry abstract rules.",
    href: "/grammar",
    icon: BookOpen,
  },
  {
    number: "04",
    title: "Vocabulary",
    tag: "Lexical Nuance",
    description:
      "Build a nuanced vocabulary of high-frequency collocations, idioms, and natural conversational expressions.",
    href: "/vocabulary",
    icon: BookMarked,
  },
];

const PILLARS = [
  { label: "4 Core Pathways", detail: "Speaking, Dictation, Grammar, Vocabulary" },
  { label: "Deterministic Scoring", detail: "Exact Levenshtein transcript metrics" },
  { label: "Adaptive Daily Plan", detail: "Curated micro-drills for consistent progress" },
  { label: "Device Persistence", detail: "Real streak and activity tracking" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      {/* Editorial Hero Section with Scene Visual */}
      <section className="pt-2 sm:pt-4 pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Text & Actions */}
          <div className="lg:col-span-7 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E3EDE6] border border-[#CEDDD2] text-[#466657] text-xs font-semibold uppercase tracking-wider mb-5">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Practice • Improve • Express</span>
            </div>

            <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-[52px] text-[#30362F] leading-[1.12] tracking-tight">
              Build confidence in English,{" "}
              <span className="text-[#203D35] italic font-serif">one sentence</span> at a time.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-[#716F65] leading-relaxed max-w-xl">
              Real conversations. Focused practice. Measurable progress. Master the
              natural cadence of English through high-repetition shadowing, active
              listening dictation, and contextual review.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/say-it"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-[#203D35] text-white text-sm font-semibold hover:bg-[#294C42] shadow-sm hover:shadow-md transition-all duration-200 focus-accessible"
              >
                <span>Start Practice</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>

              <Link
                href="/dictation"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-white border border-[#E6E2D9] text-[#30362F] text-sm font-medium hover:border-[#CEDDD2] hover:bg-[#FAF9F5] transition-all duration-200 focus-accessible"
              >
                <Headphones className="w-4 h-4 text-[#716F65]" aria-hidden="true" />
                <span>Try Dictation</span>
              </Link>

              <Link
                href="/conversation"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-[#E3EDE6] border border-[#CEDDD2] text-[#203D35] text-sm font-semibold hover:bg-[#d4e4d7] transition-all duration-200 focus-accessible shadow-xs"
              >
                <MessageSquare className="w-4 h-4 text-[#203D35]" aria-hidden="true" />
                <span>AI Conversation</span>
              </Link>
            </div>
          </div>

          {/* Right Visual Composition */}
          <div className="lg:col-span-5 relative mt-4 lg:mt-0 flex justify-center">
            {/* Ambient subtle back glow */}
            <div className="absolute inset-0 bg-[#E3EDE6]/40 rounded-[2.5rem] filter blur-2xl -z-10 transform scale-95" />

            {/* Framed Image Card */}
            <div className="relative w-full max-w-[440px] bg-white p-2.5 sm:p-3 rounded-[2rem] border border-[#E6E2D9] shadow-card">
              <div className="relative overflow-hidden rounded-[1.5rem] aspect-[3/2] bg-[#FAF9F5]">
                <Image
                  src="/images/hero.png"
                  alt="Student wearing headphones engaged in active English speaking practice with Fluently"
                  width={1536}
                  height={1024}
                  priority
                  className="object-cover w-full h-full transform hover:scale-102 transition-transform duration-500 ease-out"
                />
              </div>

              {/* Floating Reflection Quote Badge */}
              <div className="absolute -bottom-5 sm:-bottom-6 -left-3 sm:-left-6 bg-white/95 backdrop-blur-sm border border-[#E6E2D9] p-3.5 sm:p-4 rounded-2xl shadow-card-hover max-w-[260px] sm:max-w-[290px] flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E3EDE6] text-[#203D35] flex items-center justify-center shrink-0 mt-0.5">
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#30362F] leading-snug">
                    “Small conversations create big opportunities.”
                  </p>
                  <p className="text-[11px] text-[#716F65] mt-1 font-serif italic">
                    Calm, focused repetition daily
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-5 sm:p-6 bg-white border border-[#E6E2D9] rounded-2xl shadow-card">
        {PILLARS.map((pillar, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-1 p-2 sm:p-3 border-r last:border-r-0 border-[#F2F0E9]"
          >
            <span className="font-heading font-semibold text-sm sm:text-base text-[#203D35]">
              {pillar.label}
            </span>
            <span className="text-xs text-[#716F65]">
              {pillar.detail}
            </span>
          </div>
        ))}
      </section>

      {/* Today's Daily Learning Plan Section */}
      <section id="daily-plan">
        <DailyPlanCard />
      </section>

      {/* Featured AI Conversation Mode Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-stone-50 p-6 sm:p-8 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold uppercase tracking-wider mb-3">
              <Bot className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Interactive AI Tutor • Voice & Text</span>
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
              Open-Ended English Conversation Practice
            </h2>
            <p className="mt-2 text-sm sm:text-base text-stone-600 leading-relaxed">
              Step into authentic conversations across 10 realistic scenarios. Speak aloud or type at your own pace, get gentle constructive grammar feedback, and request detailed AI coaching summaries without interrupting your flow.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-stone-600">
              <span className="px-2.5 py-1 rounded-md bg-white border border-stone-200">10 Scenarios</span>
              <span className="px-2.5 py-1 rounded-md bg-white border border-stone-200">3 Difficulty Levels</span>
              <span className="px-2.5 py-1 rounded-md bg-white border border-stone-200">Speech-to-Text & Spoken Replies</span>
              <span className="px-2.5 py-1 rounded-md bg-white border border-stone-200">Gentle Error Coaching</span>
            </div>
          </div>
          <div className="flex sm:flex-col items-center lg:items-end gap-3 shrink-0">
            <Link
              href="/conversation"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 focus-accessible"
            >
              <span>Start Conversation</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Learning Modules Section */}
      <section id="modules" className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#E6E2D9] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#466657] mb-1">
              Methodical Learning
            </p>
            <h2 className="font-heading font-semibold text-2xl sm:text-3xl text-[#30362F]">
              Core Practice Modules
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#716F65] max-w-md">
            Each module isolates a specific cognitive layer of language
            acquisition for maximum retention.
          </p>
        </div>

        {/* 2-column desktop, 1-column mobile grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {MODULES.map((module) => (
            <LearningCard
              key={module.number}
              number={module.number}
              title={module.title}
              tag={module.tag}
              description={module.description}
              href={module.href}
              icon={module.icon}
            />
          ))}
        </div>
      </section>

      {/* Practice Philosophy & Analytics Teaser */}
      <section className="p-6 sm:p-8 bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
            Habit & Analytics
          </span>
          <h3 className="font-heading font-semibold text-xl text-[#30362F] mt-1">
            Track daily consistency, not just test scores
          </h3>
          <p className="text-sm text-[#716F65] mt-2 leading-relaxed">
            Language fluency is built through incremental daily exposure. Review
            your streak, completion pace, and recall stats in the progress dashboard.
          </p>
        </div>
        <Link
          href="/progress"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#E6E2D9] text-[#203D35] text-xs sm:text-sm font-semibold hover:border-[#CEDDD2] hover:bg-[#E3EDE6]/40 transition-colors shrink-0 focus-accessible shadow-xs"
        >
          <span>View Progress</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
