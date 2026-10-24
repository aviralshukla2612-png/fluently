import { prisma, isDatabaseConfigured } from "./prisma.js";

// In-memory fallback store when database is not configured (e.g. testing or offline local dev)
const memoryStore = globalThis.__shadowly_memoryStore || {
  users: new Map(),
  preferences: new Map(),
  activities: new Map(), // userId -> Array
  savedVocabulary: new Map(), // userId -> Set<wordId>
  vocabularyProgress: new Map(), // userId -> Map<wordId, record>
  grammarProgress: new Map(), // userId -> Map<lessonId, record>
  conversationSessions: new Map(), // userId -> Array<session>
  conversationMessages: new Map(), // sessionId -> Array<message>
  dailyPlans: new Map(), // userId -> Map<planDate, plan>
  learningGoals: new Map(), // userId -> Array<goal>
  userAchievements: new Map(), // userId -> Map<achievementId, record>
};

if (!globalThis.__shadowly_memoryStore) {
  globalThis.__shadowly_memoryStore = memoryStore;
}

export const userRepository = {
  /**
   * Resets in-memory store (useful for tests)
   */
  _resetMemoryStore() {
    memoryStore.users.clear();
    memoryStore.preferences.clear();
    memoryStore.activities.clear();
    memoryStore.savedVocabulary.clear();
    memoryStore.vocabularyProgress.clear();
    memoryStore.grammarProgress.clear();
    memoryStore.conversationSessions.clear();
    memoryStore.conversationMessages.clear();
    memoryStore.dailyPlans.clear();
    memoryStore.learningGoals.clear();
    memoryStore.userAchievements.clear();
  },

  async findUserByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();

    if (isDatabaseConfigured()) {
      try {
        return await prisma.user.findUnique({
          where: { email: normalized },
        });
      } catch (err) {
        console.warn("[userRepository] DB query failed, falling back to memory:", err.message);
      }
    }

    return memoryStore.users.get(normalized) || null;
  },

  async findUserById(id) {
    if (!id) return null;

    if (isDatabaseConfigured()) {
      try {
        return await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            displayName: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      } catch (err) {
        console.warn("[userRepository] DB query failed, falling back to memory:", err.message);
      }
    }

    for (const u of memoryStore.users.values()) {
      if (u.id === id) {
        const { passwordHash: _, ...safe } = u;
        return safe;
      }
    }
    return null;
  },

  async createUser({ email, passwordHash, displayName }) {
    const normalized = email.trim().toLowerCase();

    if (isDatabaseConfigured()) {
      try {
        return await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: normalized,
              passwordHash,
              displayName: displayName.trim(),
            },
          });

          // Create default preferences
          await tx.userPreference.create({
            data: {
              userId: user.id,
              learningLevel: "intermediate",
              correctionMode: "gentle",
            },
          });

          return user;
        });
      } catch (err) {
        console.warn("[userRepository] DB create failed, falling back to memory:", err.message);
      }
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const user = {
      id,
      email: normalized,
      passwordHash,
      displayName: displayName.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryStore.users.set(normalized, user);
    memoryStore.preferences.set(id, {
      userId: id,
      learningLevel: "intermediate",
      preferredLanguage: "en",
      correctionMode: "gentle",
      autoSpeakReplies: true,
      dailyTargetMinutes: 15,
      updatedAt: new Date(),
    });

    return user;
  },

  async getUserPreferences(userId) {
    if (isDatabaseConfigured()) {
      try {
        const prefs = await prisma.userPreference.findUnique({
          where: { userId },
        });
        if (prefs) return prefs;
      } catch (err) {
        console.warn("[userRepository] DB query failed:", err.message);
      }
    }

    return (
      memoryStore.preferences.get(userId) || {
        userId,
        learningLevel: "intermediate",
        preferredLanguage: "en",
        correctionMode: "gentle",
        autoSpeakReplies: true,
        dailyTargetMinutes: 15,
      }
    );
  },

  async updateUserPreferences(userId, updateData) {
    const data = {
      ...(updateData.learningLevel && { learningLevel: updateData.learningLevel }),
      ...(updateData.preferredLanguage && { preferredLanguage: updateData.preferredLanguage }),
      ...(updateData.correctionMode && { correctionMode: updateData.correctionMode }),
      ...(typeof updateData.autoSpeakReplies === "boolean" && {
        autoSpeakReplies: updateData.autoSpeakReplies,
      }),
      ...(typeof updateData.dailyTargetMinutes === "number" && {
        dailyTargetMinutes: updateData.dailyTargetMinutes,
      }),
    };

    if (isDatabaseConfigured()) {
      try {
        return await prisma.userPreference.upsert({
          where: { userId },
          create: { userId, ...data },
          update: data,
        });
      } catch (err) {
        console.warn("[userRepository] DB update failed:", err.message);
      }
    }

    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...data, updatedAt: new Date() };
    memoryStore.preferences.set(userId, updated);
    return updated;
  },

  async recordLearningActivity(userId, activityInput) {
    const timestamp = activityInput.timestamp || activityInput.completedAt;
    const clientActivityId = activityInput.id || activityInput.clientActivityId;
    const sessionId = activityInput.metadata?.sessionId;
    const metadata = {
      ...(activityInput.metadata || {}),
      ...(clientActivityId && { clientActivityId }),
    };

    // 1. In-memory store idempotency guard
    const list = memoryStore.activities.get(userId) || [];
    if (sessionId || clientActivityId) {
      const existingInMemory = list.find((a) => {
        const meta = typeof a.metadata === "string" ? JSON.parse(a.metadata || "{}") : a.metadata;
        if (sessionId && meta?.sessionId === sessionId) return true;
        if (clientActivityId && (a.id === clientActivityId || meta?.clientActivityId === clientActivityId)) return true;
        return false;
      });
      if (existingInMemory) {
        return existingInMemory;
      }
    }

    const record = {
      userId,
      module: activityInput.module,
      exerciseId: String(activityInput.exerciseId),
      status: activityInput.status || "completed",
      score: typeof activityInput.score === "number" ? activityInput.score : null,
      difficulty: activityInput.difficulty || "intermediate",
      duration: typeof activityInput.duration === "number" ? activityInput.duration : null,
      metadata,
      createdAt: timestamp ? new Date(timestamp) : new Date(),
    };

    if (isDatabaseConfigured()) {
      try {
        // Database idempotency guard if sessionId is present
        if (sessionId) {
          const existingDb = await prisma.learningActivity.findFirst({
            where: {
              userId,
              metadata: {
                path: ["sessionId"],
                equals: sessionId,
              },
            },
          });
          if (existingDb) {
            return existingDb;
          }
        }

        return await prisma.learningActivity.create({
          data: record,
        });
      } catch (err) {
        console.warn("[userRepository] DB activity creation failed:", err.message);
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error("[userRepository CRITICAL] DATABASE_URL is not configured. Running in memory fallback mode during production.");
    }

    const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const saved = { id, ...record };
    list.push(saved);
    memoryStore.activities.set(userId, list);
    return saved;
  },

  async createLearningActivity(userId, activityInput) {
    return this.recordLearningActivity(userId, activityInput);
  },

  async getLearningActivities(userId, { module, limit = 100, page = 1 } = {}) {
    if (isDatabaseConfigured()) {
      try {
        const where = {
          userId,
          ...(module && { module }),
        };
        const skip = (Math.max(1, page) - 1) * limit;

        const [items, totalCount] = await Promise.all([
          prisma.learningActivity.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
          }),
          prisma.learningActivity.count({ where }),
        ]);

        return {
          items,
          totalCount,
          page,
          totalPages: Math.ceil(totalCount / limit) || 1,
        };
      } catch (err) {
        console.warn("[userRepository] DB activity list failed:", err.message);
      }
    }

    const list = memoryStore.activities.get(userId) || [];
    const filtered = module ? list.filter((a) => a.module === module) : list;
    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const start = (Math.max(1, page) - 1) * limit;
    const items = sorted.slice(start, start + limit);

    return {
      items,
      totalCount: sorted.length,
      page,
      totalPages: Math.ceil(sorted.length / limit) || 1,
    };
  },

  async toggleSavedWord(userId, wordId) {
    if (!wordId) return { saved: false };

    if (isDatabaseConfigured()) {
      try {
        const existing = await prisma.savedVocabulary.findUnique({
          where: { userId_wordId: { userId, wordId } },
        });

        if (existing) {
          await prisma.savedVocabulary.delete({
            where: { userId_wordId: { userId, wordId } },
          });
          return { saved: false };
        } else {
          await prisma.savedVocabulary.create({
            data: { userId, wordId },
          });
          return { saved: true };
        }
      } catch (err) {
        console.warn("[userRepository] DB toggle word failed:", err.message);
      }
    }

    const userWords = memoryStore.savedVocabulary.get(userId) || new Set();
    if (userWords.has(wordId)) {
      userWords.delete(wordId);
      memoryStore.savedVocabulary.set(userId, userWords);
      return { saved: false };
    } else {
      userWords.add(wordId);
      memoryStore.savedVocabulary.set(userId, userWords);
      return { saved: true };
    }
  },

  async getSavedVocabulary(userId) {
    if (isDatabaseConfigured()) {
      try {
        const rows = await prisma.savedVocabulary.findMany({
          where: { userId },
          select: { wordId: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => r.wordId);
      } catch (err) {
        console.warn("[userRepository] DB get saved words failed:", err.message);
      }
    }

    const userWords = memoryStore.savedVocabulary.get(userId) || new Set();
    return Array.from(userWords);
  },

  async updateVocabularyProgress(userId, progressRecord) {
    const { wordId, reviewInterval, nextReviewDate, reviewCount, learningStatus, lastReviewedAt } =
      progressRecord;

    const data = {
      reviewInterval: reviewInterval || 1,
      nextReviewDate: nextReviewDate || new Date().toISOString().slice(0, 10),
      reviewCount: typeof reviewCount === "number" ? reviewCount : 1,
      learningStatus: learningStatus || "learning",
      lastReviewedAt: lastReviewedAt ? new Date(lastReviewedAt) : new Date(),
    };

    if (isDatabaseConfigured()) {
      try {
        return await prisma.vocabularyProgress.upsert({
          where: { userId_wordId: { userId, wordId } },
          create: { userId, wordId, ...data },
          update: data,
        });
      } catch (err) {
        console.warn("[userRepository] DB vocab progress update failed:", err.message);
      }
    }

    const userMap = memoryStore.vocabularyProgress.get(userId) || new Map();
    const existing = userMap.get(wordId) || {};
    const updated = { ...existing, userId, wordId, ...data };
    userMap.set(wordId, updated);
    memoryStore.vocabularyProgress.set(userId, userMap);
    return updated;
  },

  async getVocabularyProgress(userId) {
    if (isDatabaseConfigured()) {
      try {
        return await prisma.vocabularyProgress.findMany({
          where: { userId },
        });
      } catch (err) {
        console.warn("[userRepository] DB get vocab progress failed:", err.message);
      }
    }

    const userMap = memoryStore.vocabularyProgress.get(userId) || new Map();
    return Array.from(userMap.values());
  },

  async updateGrammarProgress(userId, { lessonId, status = "completed", score = null }) {
    if (!lessonId) return null;

    if (isDatabaseConfigured()) {
      try {
        const existing = await prisma.grammarProgress.findUnique({
          where: { userId_lessonId: { userId, lessonId } },
        });

        const bestScore = existing?.bestScore !== null && existing?.bestScore !== undefined
          ? (score !== null ? Math.max(existing.bestScore, score) : existing.bestScore)
          : score;

        return await prisma.grammarProgress.upsert({
          where: { userId_lessonId: { userId, lessonId } },
          create: { userId, lessonId, status, bestScore },
          update: { status, bestScore, completedAt: new Date() },
        });
      } catch (err) {
        console.warn("[userRepository] DB grammar progress failed:", err.message);
      }
    }

    const userMap = memoryStore.grammarProgress.get(userId) || new Map();
    const existing = userMap.get(lessonId) || {};
    const bestScore = existing.bestScore !== undefined
      ? (score !== null ? Math.max(existing.bestScore, score) : existing.bestScore)
      : score;

    const updated = {
      userId,
      lessonId,
      status,
      bestScore,
      completedAt: new Date(),
    };
    userMap.set(lessonId, updated);
    memoryStore.grammarProgress.set(userId, userMap);
    return updated;
  },

  async getGrammarProgress(userId) {
    if (isDatabaseConfigured()) {
      try {
        return await prisma.grammarProgress.findMany({
          where: { userId },
        });
      } catch (err) {
        console.warn("[userRepository] DB get grammar progress failed:", err.message);
      }
    }

    const userMap = memoryStore.grammarProgress.get(userId) || new Map();
    return Array.from(userMap.values());
  },

  async createConversationSession(userId, sessionData) {
    const record = {
      userId,
      scenarioId: sessionData.scenarioId || "free",
      learningLevel: sessionData.level || "intermediate",
      correctionMode: sessionData.correctionMode || "gentle",
      status: "active",
      summaryData: sessionData.summaryData || null,
      startedAt: new Date(),
    };

    if (isDatabaseConfigured()) {
      try {
        return await prisma.conversationSession.create({
          data: record,
        });
      } catch (err) {
        console.warn("[userRepository] DB create session failed:", err.message);
      }
    }

    const list = memoryStore.conversationSessions.get(userId) || [];
    const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const saved = { id, ...record };
    list.unshift(saved);
    memoryStore.conversationSessions.set(userId, list);
    return saved;
  },

  async getConversationSessions(userId, { limit = 20, page = 1 } = {}) {
    if (isDatabaseConfigured()) {
      try {
        const skip = (Math.max(1, page) - 1) * limit;
        const [items, totalCount] = await Promise.all([
          prisma.conversationSession.findMany({
            where: { userId },
            orderBy: { startedAt: "desc" },
            take: limit,
            skip,
            include: {
              _count: { select: { messages: true } },
            },
          }),
          prisma.conversationSession.count({ where: { userId } }),
        ]);

        return { items, totalCount, page, totalPages: Math.ceil(totalCount / limit) || 1 };
      } catch (err) {
        console.warn("[userRepository] DB list sessions failed:", err.message);
      }
    }

    const list = memoryStore.conversationSessions.get(userId) || [];
    const sorted = [...list].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    const start = (Math.max(1, page) - 1) * limit;
    const items = sorted.slice(start, start + limit).map((s) => ({
      ...s,
      _count: {
        messages: (memoryStore.conversationMessages.get(s.id) || []).length,
      },
    }));

    return { items, totalCount: sorted.length, page, totalPages: Math.ceil(sorted.length / limit) || 1 };
  },

  async getConversationSessionById(userId, sessionId) {
    if (!sessionId) return null;

    if (isDatabaseConfigured()) {
      try {
        const session = await prisma.conversationSession.findFirst({
          where: { id: sessionId, userId },
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
            },
          },
        });
        return session;
      } catch (err) {
        console.warn("[userRepository] DB get session by id failed:", err.message);
      }
    }

    const list = memoryStore.conversationSessions.get(userId) || [];
    const session = list.find((s) => s.id === sessionId);
    if (!session) return null;

    const messages = memoryStore.conversationMessages.get(sessionId) || [];
    return { ...session, messages };
  },

  async addConversationMessage(userId, sessionId, messageData) {
    // Verify session ownership first
    const session = await this.getConversationSessionById(userId, sessionId);
    if (!session) {
      throw new Error("Session not found or not owned by user.");
    }

    const record = {
      sessionId,
      role: messageData.role,
      content: messageData.content,
      corrections: messageData.corrections || null,
      usefulPhrase: messageData.usefulPhrase || null,
      followUpQuestion: messageData.followUpQuestion || null,
      createdAt: new Date(),
    };

    if (isDatabaseConfigured()) {
      try {
        return await prisma.conversationMessage.create({
          data: record,
        });
      } catch (err) {
        console.warn("[userRepository] DB add message failed:", err.message);
      }
    }

    const list = memoryStore.conversationMessages.get(sessionId) || [];
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const saved = { id, ...record };
    list.push(saved);
    memoryStore.conversationMessages.set(sessionId, list);
    return saved;
  },

  async updateConversationSession(userId, sessionId, updateData) {
    const session = await this.getConversationSessionById(userId, sessionId);
    if (!session) {
      throw new Error("Session not found or not owned by user.");
    }

    const data = {
      ...(updateData.status && { status: updateData.status }),
      ...(updateData.endedAt && { endedAt: new Date(updateData.endedAt) }),
      ...(updateData.summaryData && { summaryData: updateData.summaryData }),
    };

    if (isDatabaseConfigured()) {
      try {
        return await prisma.conversationSession.update({
          where: { id: sessionId },
          data,
        });
      } catch (err) {
        console.warn("[userRepository] DB update session failed:", err.message);
      }
    }

    const list = memoryStore.conversationSessions.get(userId) || [];
    const idx = list.findIndex((s) => s.id === sessionId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data };
      memoryStore.conversationSessions.set(userId, list);
      return list[idx];
    }
    return null;
  },

  async deleteConversationSession(userId, sessionId) {
    const session = await this.getConversationSessionById(userId, sessionId);
    if (!session) {
      throw new Error("Session not found or not owned by user.");
    }

    if (isDatabaseConfigured()) {
      try {
        await prisma.conversationSession.delete({
          where: { id: sessionId },
        });
        return { success: true };
      } catch (err) {
        console.warn("[userRepository] DB delete session failed:", err.message);
      }
    }

    const list = memoryStore.conversationSessions.get(userId) || [];
    const filtered = list.filter((s) => s.id !== sessionId);
    memoryStore.conversationSessions.set(userId, filtered);
    memoryStore.conversationMessages.delete(sessionId);
    return { success: true };
  },

  async upsertDailyPlan(userId, planData) {
    const { planDate, tasks, completedState, planVersion = "1.0.0" } = planData;

    const data = {
      planVersion,
      tasks: tasks || [],
      completedState: completedState || {},
    };

    if (isDatabaseConfigured()) {
      try {
        return await prisma.dailyPlan.upsert({
          where: { userId_planDate: { userId, planDate } },
          create: { userId, planDate, ...data },
          update: data,
        });
      } catch (err) {
        console.warn("[userRepository] DB upsert daily plan failed:", err.message);
      }
    }

    const userMap = memoryStore.dailyPlans.get(userId) || new Map();
    const updated = { userId, planDate, ...data, updatedAt: new Date() };
    userMap.set(planDate, updated);
    memoryStore.dailyPlans.set(userId, userMap);
    return updated;
  },

  async getDailyPlan(userId, planDate) {
    if (isDatabaseConfigured()) {
      try {
        return await prisma.dailyPlan.findUnique({
          where: { userId_planDate: { userId, planDate } },
        });
      } catch (err) {
        console.warn("[userRepository] DB get daily plan failed:", err.message);
      }
    }

    const userMap = memoryStore.dailyPlans.get(userId) || new Map();
    return userMap.get(planDate) || null;
  },

  /**
   * Idempotent import of local device learning progress into user cloud account.
   * Merges without discarding existing higher scores or duplicate activities.
   */
  async importLegacyLocalData(userId, legacyData) {
    const result = {
      activitiesImported: 0,
      savedWordsImported: 0,
      vocabProgressImported: 0,
      grammarImported: 0,
    };

    // 1. Import activities (idempotent check by clientActivityId or module:exerciseId:timestamp)
    if (Array.isArray(legacyData.activities)) {
      const existingActivities = await this.getLearningActivities(userId, { limit: 1000 });
      const existingSignatures = new Set();
      for (const a of existingActivities.items) {
        if (a.metadata?.clientActivityId) {
          existingSignatures.add(`id:${a.metadata.clientActivityId}`);
        }
        if (a.id) {
          existingSignatures.add(`id:${a.id}`);
        }
        const timeStr = a.createdAt ? new Date(a.createdAt).toISOString() : "";
        if (timeStr) {
          existingSignatures.add(`${a.module}:${a.exerciseId}:${timeStr}`);
        }
      }

      for (const act of legacyData.activities) {
        if (!act || !act.module || !act.exerciseId) continue;
        const actId = act.id || act.clientActivityId;
        const actTime = act.timestamp || act.completedAt;
        const timeStr = actTime ? new Date(actTime).toISOString() : "";
        const sigId = actId ? `id:${actId}` : null;
        const sigContent = timeStr ? `${act.module}:${act.exerciseId}:${timeStr}` : null;

        if ((sigId && existingSignatures.has(sigId)) || (sigContent && existingSignatures.has(sigContent))) {
          continue;
        }

        await this.recordLearningActivity(userId, act);
        if (sigId) existingSignatures.add(sigId);
        if (sigContent) existingSignatures.add(sigContent);
        result.activitiesImported++;
      }
    }

    // 2. Import saved vocabulary
    if (Array.isArray(legacyData.savedWords)) {
      const currentSaved = new Set(await this.getSavedVocabulary(userId));
      for (const wordId of legacyData.savedWords) {
        if (typeof wordId === "string" && wordId.trim() && !currentSaved.has(wordId)) {
          await this.toggleSavedWord(userId, wordId);
          currentSaved.add(wordId);
          result.savedWordsImported++;
        }
      }
    }

    // 3. Import vocabulary review schedules
    if (Array.isArray(legacyData.vocabularyReviews)) {
      for (const rev of legacyData.vocabularyReviews) {
        if (rev && rev.wordId) {
          await this.updateVocabularyProgress(userId, rev);
          result.vocabProgressImported++;
        }
      }
    }

    // 4. Import grammar lesson completions
    if (Array.isArray(legacyData.grammarCompletions)) {
      for (const g of legacyData.grammarCompletions) {
        if (g && g.lessonId) {
          await this.updateGrammarProgress(userId, g);
          result.grammarImported++;
        }
      }
    }

    return result;
  },

  // ==========================================
  // PHASE 8: LEARNING GOALS
  // ==========================================

  async getLearningGoals(userId, { status } = {}) {
    if (isDatabaseConfigured()) {
      try {
        const where = {
          userId,
          ...(status && { status }),
        };
        return await prisma.learningGoal.findMany({
          where,
          orderBy: { createdAt: "desc" },
        });
      } catch (err) {
        console.warn("[userRepository] DB getLearningGoals failed:", err.message);
      }
    }

    const list = memoryStore.learningGoals.get(userId) || [];
    const filtered = status ? list.filter((g) => g.status === status) : list;
    return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async createLearningGoal(arg1, arg2) {
    let userId;
    let goalData;
    if (typeof arg1 === "string") {
      userId = arg1;
      goalData = arg2 || {};
    } else if (arg1 && typeof arg1 === "object") {
      userId = arg1.userId;
      goalData = arg1;
    }

    const {
      goalType,
      targetValue,
      targetUnit = "units",
      skill = null,
      status = "active",
      startDate = new Date().toISOString().split("T")[0],
      endDate = null,
    } = goalData || {};

    // Check for existing duplicate active goal of same type and skill
    const existing = await this.getLearningGoals(userId, { status: "active" });
    const isDuplicate = existing.some(
      (g) => g.goalType === goalType && (g.skill || null) === (skill || null)
    );
    if (isDuplicate) {
      throw new Error(`An active goal for '${goalType}'${skill ? ` (${skill})` : ""} already exists.`);
    }

    const data = {
      userId,
      goalType,
      targetValue: Number(targetValue),
      targetUnit,
      skill: skill || null,
      status,
      startDate,
      endDate: endDate || null,
    };

    if (isDatabaseConfigured()) {
      try {
        return await prisma.learningGoal.create({
          data,
        });
      } catch (err) {
        console.warn("[userRepository] DB createLearningGoal failed:", err.message);
      }
    }

    const id = `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newGoal = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const list = memoryStore.learningGoals.get(userId) || [];
    list.unshift(newGoal);
    memoryStore.learningGoals.set(userId, list);
    return newGoal;
  },

  async updateLearningGoal(arg1, arg2, arg3) {
    let userId;
    let goalId;
    let updateData;

    if (typeof arg1 === "string" && arg1.startsWith("goal_")) {
      goalId = arg1;
      userId = arg2;
      updateData = arg3 || {};
    } else {
      userId = arg1;
      goalId = arg2;
      updateData = arg3 || {};
    }

    if (isDatabaseConfigured()) {
      try {
        // Enforce ownership
        const existing = await prisma.learningGoal.findFirst({
          where: { id: goalId, userId },
        });
        if (!existing) {
          return null;
        }

        const data = {
          ...(updateData.targetValue !== undefined && { targetValue: Number(updateData.targetValue) }),
          ...(updateData.targetUnit !== undefined && { targetUnit: updateData.targetUnit }),
          ...(updateData.status !== undefined && { status: updateData.status }),
          ...(updateData.endDate !== undefined && { endDate: updateData.endDate }),
        };

        return await prisma.learningGoal.update({
          where: { id: goalId },
          data,
        });
      } catch (err) {
        console.warn("[userRepository] DB updateLearningGoal failed:", err.message);
      }
    }

    const list = memoryStore.learningGoals.get(userId) || [];
    const idx = list.findIndex((g) => g.id === goalId);
    if (idx === -1) {
      return null;
    }

    const updated = {
      ...list[idx],
      ...(updateData.targetValue !== undefined && { targetValue: Number(updateData.targetValue) }),
      ...(updateData.targetUnit !== undefined && { targetUnit: updateData.targetUnit }),
      ...(updateData.status !== undefined && { status: updateData.status }),
      ...(updateData.endDate !== undefined && { endDate: updateData.endDate }),
      updatedAt: new Date(),
    };

    list[idx] = updated;
    memoryStore.learningGoals.set(userId, list);
    return updated;
  },

  async deleteLearningGoal(arg1, arg2) {
    let userId;
    let goalId;

    if (typeof arg1 === "string" && arg1.startsWith("goal_")) {
      goalId = arg1;
      userId = arg2;
    } else {
      userId = arg1;
      goalId = arg2;
    }

    if (isDatabaseConfigured()) {
      try {
        const existing = await prisma.learningGoal.findFirst({
          where: { id: goalId, userId },
        });
        if (!existing) {
          return false;
        }
        await prisma.learningGoal.delete({
          where: { id: goalId },
        });
        return true;
      } catch (err) {
        console.warn("[userRepository] DB deleteLearningGoal failed:", err.message);
      }
    }

    const list = memoryStore.learningGoals.get(userId) || [];
    const idx = list.findIndex((g) => g.id === goalId);
    if (idx === -1) {
      return false;
    }
    const filtered = list.filter((g) => g.id !== goalId);
    memoryStore.learningGoals.set(userId, filtered);
    return true;
  },

  // ==========================================
  // PHASE 8: ACHIEVEMENTS & MILESTONES
  // ==========================================

  async getUserAchievements(userId) {
    if (isDatabaseConfigured()) {
      try {
        return await prisma.userAchievement.findMany({
          where: { userId },
          orderBy: { unlockedAt: "desc" },
        });
      } catch (err) {
        console.warn("[userRepository] DB getUserAchievements failed:", err.message);
      }
    }

    const userMap = memoryStore.userAchievements.get(userId) || new Map();
    return Array.from(userMap.values()).sort(
      (a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt)
    );
  },

  async hasUserUnlockedAchievement(userId, achievementId) {
    if (isDatabaseConfigured()) {
      try {
        const found = await prisma.userAchievement.findUnique({
          where: { userId_achievementId: { userId, achievementId } },
        });
        return Boolean(found);
      } catch (err) {
        console.warn("[userRepository] DB hasUserUnlockedAchievement failed:", err.message);
      }
    }

    const userMap = memoryStore.userAchievements.get(userId) || new Map();
    return userMap.has(achievementId);
  },

  async unlockUserAchievement(arg1, arg2, arg3) {
    let userId;
    let achievementId;
    let metadata = null;
    let points = null;

    if (typeof arg1 === "string") {
      userId = arg1;
      achievementId = arg2;
      metadata = arg3 || null;
    } else if (arg1 && typeof arg1 === "object") {
      userId = arg1.userId;
      achievementId = arg1.achievementId;
      points = arg1.points;
      metadata = arg1.metadata || null;
    }

    // Check if already unlocked (idempotency & duplicate prevention)
    const userMap = memoryStore.userAchievements.get(userId) || new Map();
    if (userMap.has(achievementId)) {
      const existing = userMap.get(achievementId);
      return { id: existing.id, achievementId, newlyUnlocked: false, ...existing };
    }

    const record = {
      userId,
      achievementId,
      unlockedAt: new Date(),
      progress: 100.0,
      metadata: metadata || null,
      ...(points !== null && { points }),
    };

    if (isDatabaseConfigured()) {
      try {
        const existing = await prisma.userAchievement.findUnique({
          where: { userId_achievementId: { userId, achievementId } },
        });
        if (existing) {
          return { id: existing.id, achievementId, newlyUnlocked: false, ...existing };
        }
        const created = await prisma.userAchievement.create({
          data: record,
        });
        return { id: created.id, achievementId: created.achievementId, newlyUnlocked: true, achievement: created, ...created };
      } catch (err) {
        console.warn("[userRepository] DB unlockUserAchievement failed:", err.message);
      }
    }

    const id = `ach_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const saved = { id, ...record };
    userMap.set(achievementId, saved);
    memoryStore.userAchievements.set(userId, userMap);
    return { id: saved.id, achievementId: saved.achievementId, newlyUnlocked: true, achievement: saved, ...saved };
  },

  async deleteUserAccount(userId) {
    if (isDatabaseConfigured()) {
      try {
        await prisma.user.delete({
          where: { id: userId },
        });
        return { success: true };
      } catch (err) {
        console.warn("[userRepository] DB delete user failed:", err.message);
      }
    }

    for (const [email, u] of memoryStore.users.entries()) {
      if (u.id === userId) {
        memoryStore.users.delete(email);
        break;
      }
    }
    memoryStore.preferences.delete(userId);
    memoryStore.activities.delete(userId);
    memoryStore.savedVocabulary.delete(userId);
    memoryStore.vocabularyProgress.delete(userId);
    memoryStore.grammarProgress.delete(userId);
    memoryStore.conversationSessions.delete(userId);
    memoryStore.dailyPlans.delete(userId);
    memoryStore.learningGoals.delete(userId);
    memoryStore.userAchievements.delete(userId);

    return { success: true };
  },
};
