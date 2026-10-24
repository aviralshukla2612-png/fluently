/**
 * Shadowly — Centralized Achievement Catalog
 * Phase 8 Learning Engagement & Milestones
 *
 * Immutable, version-controlled definition of all badges, milestones,
 * unlock criteria, and reward points.
 */

export const ACHIEVEMENT_CATEGORIES = {
  CONSISTENCY: "consistency",
  ACTIVITY: "activity",
  VOCABULARY: "vocabulary",
  GRAMMAR: "grammar",
  SPEAKING: "speaking",
  IMPROVEMENT: "improvement",
};

export const ACHIEVEMENT_CATALOG = [
  // --- Consistency ---
  {
    id: "first_practice",
    name: "First Step",
    description: "Complete your very first English learning exercise.",
    category: ACHIEVEMENT_CATEGORIES.CONSISTENCY,
    icon: "Footprints",
    tier: "bronze",
    points: 10,
    hidden: false,
    evaluator: ({ activities }) => {
      const completed = activities.filter((a) => a.status === "completed");
      return {
        unlocked: completed.length >= 1,
        progress: Math.min(100, Math.round((completed.length / 1) * 100)),
        current: Math.min(1, completed.length),
        target: 1,
        unit: "drill",
      };
    },
  },
  {
    id: "streak_3",
    name: "Building Momentum",
    description: "Practice for 3 consecutive days.",
    category: ACHIEVEMENT_CATEGORIES.CONSISTENCY,
    icon: "Flame",
    tier: "bronze",
    points: 25,
    hidden: false,
    evaluator: ({ streak }) => {
      const current = Math.max(streak?.currentStreak || 0, streak?.longestStreak || 0);
      return {
        unlocked: current >= 3,
        progress: Math.min(100, Math.round((current / 3) * 100)),
        current,
        target: 3,
        unit: "days",
      };
    },
  },
  {
    id: "streak_7",
    name: "Weekly Champion",
    description: "Maintain an unbroken 7-day practice streak.",
    category: ACHIEVEMENT_CATEGORIES.CONSISTENCY,
    icon: "Zap",
    tier: "silver",
    points: 50,
    hidden: false,
    evaluator: ({ streak }) => {
      const current = Math.max(streak?.currentStreak || 0, streak?.longestStreak || 0);
      return {
        unlocked: current >= 7,
        progress: Math.min(100, Math.round((current / 7) * 100)),
        current,
        target: 7,
        unit: "days",
      };
    },
  },
  {
    id: "streak_14",
    name: "Two-Week Fortitude",
    description: "Maintain a 14-day consecutive learning streak.",
    category: ACHIEVEMENT_CATEGORIES.CONSISTENCY,
    icon: "ShieldCheck",
    tier: "gold",
    points: 100,
    hidden: false,
    evaluator: ({ streak }) => {
      const current = Math.max(streak?.currentStreak || 0, streak?.longestStreak || 0);
      return {
        unlocked: current >= 14,
        progress: Math.min(100, Math.round((current / 14) * 100)),
        current,
        target: 14,
        unit: "days",
      };
    },
  },
  {
    id: "streak_30",
    name: "Habit Master",
    description: "Reach an incredible 30-day learning streak.",
    category: ACHIEVEMENT_CATEGORIES.CONSISTENCY,
    icon: "Crown",
    tier: "platinum",
    points: 250,
    hidden: false,
    evaluator: ({ streak }) => {
      const current = Math.max(streak?.currentStreak || 0, streak?.longestStreak || 0);
      return {
        unlocked: current >= 30,
        progress: Math.min(100, Math.round((current / 30) * 100)),
        current,
        target: 30,
        unit: "days",
      };
    },
  },

  // --- Learning Activity ---
  {
    id: "activities_10",
    name: "Getting Started",
    description: "Complete 10 total learning drills across any module.",
    category: ACHIEVEMENT_CATEGORIES.ACTIVITY,
    icon: "Award",
    tier: "bronze",
    points: 20,
    hidden: false,
    evaluator: ({ activities }) => {
      const completed = activities.filter((a) => a.status === "completed");
      return {
        unlocked: completed.length >= 10,
        progress: Math.min(100, Math.round((completed.length / 10) * 100)),
        current: completed.length,
        target: 10,
        unit: "drills",
      };
    },
  },
  {
    id: "activities_50",
    name: "Dedicated Learner",
    description: "Complete 50 total learning drills.",
    category: ACHIEVEMENT_CATEGORIES.ACTIVITY,
    icon: "Medal",
    tier: "silver",
    points: 75,
    hidden: false,
    evaluator: ({ activities }) => {
      const completed = activities.filter((a) => a.status === "completed");
      return {
        unlocked: completed.length >= 50,
        progress: Math.min(100, Math.round((completed.length / 50) * 100)),
        current: completed.length,
        target: 50,
        unit: "drills",
      };
    },
  },
  {
    id: "activities_100",
    name: "Centurion",
    description: "Complete 100 total learning exercises.",
    category: ACHIEVEMENT_CATEGORIES.ACTIVITY,
    icon: "Sparkles",
    tier: "gold",
    points: 150,
    hidden: false,
    evaluator: ({ activities }) => {
      const completed = activities.filter((a) => a.status === "completed");
      return {
        unlocked: completed.length >= 100,
        progress: Math.min(100, Math.round((completed.length / 100) * 100)),
        current: completed.length,
        target: 100,
        unit: "drills",
      };
    },
  },

  // --- Vocabulary ---
  {
    id: "vocab_10",
    name: "Lexicon Builder",
    description: "Review 10 vocabulary words.",
    category: ACHIEVEMENT_CATEGORIES.VOCABULARY,
    icon: "BookMarked",
    tier: "bronze",
    points: 20,
    hidden: false,
    evaluator: ({ activities }) => {
      const vocab = activities.filter((a) => a.module === "vocabulary" && a.status === "completed");
      return {
        unlocked: vocab.length >= 10,
        progress: Math.min(100, Math.round((vocab.length / 10) * 100)),
        current: vocab.length,
        target: 10,
        unit: "reviews",
      };
    },
  },
  {
    id: "vocab_50",
    name: "Vocabulary Virtuoso",
    description: "Review 50 vocabulary words in spaced repetition.",
    category: ACHIEVEMENT_CATEGORIES.VOCABULARY,
    icon: "BookOpen",
    tier: "silver",
    points: 75,
    hidden: false,
    evaluator: ({ activities }) => {
      const vocab = activities.filter((a) => a.module === "vocabulary" && a.status === "completed");
      return {
        unlocked: vocab.length >= 50,
        progress: Math.min(100, Math.round((vocab.length / 50) * 100)),
        current: vocab.length,
        target: 50,
        unit: "reviews",
      };
    },
  },

  // --- Grammar ---
  {
    id: "grammar_5",
    name: "Sentence Architect",
    description: "Complete 5 grammar structure units.",
    category: ACHIEVEMENT_CATEGORIES.GRAMMAR,
    icon: "Layers",
    tier: "bronze",
    points: 30,
    hidden: false,
    evaluator: ({ activities }) => {
      const grammar = activities.filter((a) => a.module === "grammar" && a.status === "completed");
      return {
        unlocked: grammar.length >= 5,
        progress: Math.min(100, Math.round((grammar.length / 5) * 100)),
        current: grammar.length,
        target: 5,
        unit: "lessons",
      };
    },
  },
  {
    id: "grammar_perfection",
    name: "Flawless Syntax",
    description: "Score 90% or higher on any grammar lesson.",
    category: ACHIEVEMENT_CATEGORIES.GRAMMAR,
    icon: "CheckCheck",
    tier: "silver",
    points: 50,
    hidden: false,
    evaluator: ({ activities }) => {
      const highScores = activities.filter(
        (a) => a.module === "grammar" && a.status === "completed" && typeof a.score === "number" && a.score >= 90
      );
      return {
        unlocked: highScores.length >= 1,
        progress: highScores.length >= 1 ? 100 : 0,
        current: highScores.length >= 1 ? 1 : 0,
        target: 1,
        unit: "high score",
      };
    },
  },

  // --- Speaking & Conversation ---
  {
    id: "speaking_5",
    name: "Finding Your Voice",
    description: "Complete 5 speech shadowing drills.",
    category: ACHIEVEMENT_CATEGORIES.SPEAKING,
    icon: "Languages",
    tier: "bronze",
    points: 25,
    hidden: false,
    evaluator: ({ activities }) => {
      const speaking = activities.filter((a) => a.module === "speaking" && a.status === "completed");
      return {
        unlocked: speaking.length >= 5,
        progress: Math.min(100, Math.round((speaking.length / 5) * 100)),
        current: speaking.length,
        target: 5,
        unit: "shadowings",
      };
    },
  },
  {
    id: "conversation_3",
    name: "Active Dialogue",
    description: "Participate in 3 AI tutor conversation sessions.",
    category: ACHIEVEMENT_CATEGORIES.SPEAKING,
    icon: "MessageSquare",
    tier: "bronze",
    points: 30,
    hidden: false,
    evaluator: ({ activities }) => {
      const conv = activities.filter((a) => a.module === "conversation" && a.status === "completed");
      return {
        unlocked: conv.length >= 3,
        progress: Math.min(100, Math.round((conv.length / 3) * 100)),
        current: conv.length,
        target: 3,
        unit: "sessions",
      };
    },
  },
  {
    id: "conversation_10",
    name: "Fluent Communicator",
    description: "Complete 10 conversational scenarios with the AI tutor.",
    category: ACHIEVEMENT_CATEGORIES.SPEAKING,
    icon: "MessagesSquare",
    tier: "gold",
    points: 100,
    hidden: false,
    evaluator: ({ activities }) => {
      const conv = activities.filter((a) => a.module === "conversation" && a.status === "completed");
      return {
        unlocked: conv.length >= 10,
        progress: Math.min(100, Math.round((conv.length / 10) * 100)),
        current: conv.length,
        target: 10,
        unit: "sessions",
      };
    },
  },

  // --- Personal Improvement ---
  {
    id: "growth_mindset",
    name: "Growth Mindset",
    description: "Demonstrate positive score improvement across practice sessions.",
    category: ACHIEVEMENT_CATEGORIES.IMPROVEMENT,
    icon: "TrendingUp",
    tier: "silver",
    points: 50,
    hidden: false,
    evaluator: ({ analytics }) => {
      const improvingSkill = Object.values(analytics?.skills || {}).find(
        (s) => s.trend && s.trend.direction === "improving"
      );
      return {
        unlocked: Boolean(improvingSkill),
        progress: improvingSkill ? 100 : 0,
        current: improvingSkill ? 1 : 0,
        target: 1,
        unit: "skill improved",
      };
    },
  },
];

export function getAchievementById(id) {
  return ACHIEVEMENT_CATALOG.find((a) => a.id === id) || null;
}
