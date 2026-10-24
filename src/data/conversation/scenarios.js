/**
 * Shadowly — AI Conversation Scenarios Dataset
 * Curated, authentic communicative scenarios for open-ended English conversation.
 */

export const CONVERSATION_SCENARIOS = [
  {
    id: "free",
    name: "Free Conversation",
    description: "Open-ended, friendly dialogue on any topic you want to talk about.",
    difficultyRecommendation: "All levels",
    defaultLevel: "intermediate",
    openingQuestion: "Hi there! It's great to chat with you today. What's on your mind, or what would you like to talk about?",
    tutorContext: "Act as a friendly, supportive conversation partner. Follow the learner's lead, ask thoughtful open-ended questions, and keep the dialogue natural and engaging.",
  },
  {
    id: "daily-life",
    name: "Daily Life & Routines",
    description: "Chat about daily habits, recent activities, weekend plans, and daily routines.",
    difficultyRecommendation: "Beginner – Intermediate",
    defaultLevel: "beginner",
    openingQuestion: "How has your day been going so far? Did you do anything interesting or relaxing today?",
    tutorContext: "Focus on everyday vocabulary, simple present/past verbs, routines, family, weather, and common daily activities.",
  },
  {
    id: "restaurant",
    name: "Ordering at a Restaurant",
    description: "Roleplay dining out: browsing menus, asking for recommendations, and ordering meals.",
    difficultyRecommendation: "Beginner – Intermediate",
    defaultLevel: "beginner",
    openingQuestion: "Welcome to The Olive Branch Bistro! Table for one? Are you ready to look over the menu, or can I get you something to drink first?",
    tutorContext: "You are a polite, attentive restaurant server. Guide the customer through drinks, appetizers, dietary preferences, specials, and desserts using polite service English.",
  },
  {
    id: "shopping",
    name: "Shopping & Retail",
    description: "Practice asking for sizes, prices, product advice, returns, and discounts.",
    difficultyRecommendation: "Beginner – Intermediate",
    defaultLevel: "beginner",
    openingQuestion: "Hello! Welcome to our store. Are you looking for anything specific today, or just browsing around?",
    tutorContext: "You are a helpful retail store assistant. Ask about preferences, offer recommendations, discuss colors, sizes, prices, and return policies.",
  },
  {
    id: "travel",
    name: "Travel & Directions",
    description: "Practice airport transit, asking for street directions, hotel check-in, and sightseeing tips.",
    difficultyRecommendation: "Intermediate",
    defaultLevel: "intermediate",
    openingQuestion: "Welcome to the tourist information center! Are you visiting the city for the first time, or looking for specific directions?",
    tutorContext: "You are an informative local guide or concierge. Help the traveler navigate, suggest local landmarks, public transit options, and hidden neighborhood gems.",
  },
  {
    id: "interview",
    name: "Job Interview Practice",
    description: "Prepare for professional job interviews: career background, strengths, and handling tough questions.",
    difficultyRecommendation: "Intermediate – Advanced",
    defaultLevel: "intermediate",
    openingQuestion: "Thanks for meeting with me today. To get started, could you walk me through your background and what motivated you to apply for this role?",
    tutorContext: "You are an encouraging but professional interviewer. Ask structured questions regarding experience, problem solving, teamwork, and career ambitions.",
  },
  {
    id: "workplace",
    name: "Workplace & Office Talk",
    description: "Practice project updates, team meetings, discussing deadlines, and water-cooler small talk.",
    difficultyRecommendation: "Intermediate – Advanced",
    defaultLevel: "intermediate",
    openingQuestion: "Hey! Do you have a quick couple of minutes to catch up on this week's sprint priorities before our afternoon sync?",
    tutorContext: "You are a friendly, collaborative colleague. Discuss project deadlines, status updates, team coordination, and casual workplace conversation.",
  },
  {
    id: "meeting-people",
    name: "Meeting New People",
    description: "Practice self-introductions, icebreakers, hobbies, and making new acquaintances.",
    difficultyRecommendation: "Beginner – Intermediate",
    defaultLevel: "beginner",
    openingQuestion: "Hi! I don't think we've met yet. I'm Alex. What brings you to this event today?",
    tutorContext: "You are an outgoing, polite acquaintance at a social or professional mixer. Ask friendly icebreaker questions about background, interests, and hometowns.",
  },
  {
    id: "hobbies",
    name: "Hobbies & Free Time",
    description: "Discuss music, cinema, sports, creative arts, reading, and personal passions.",
    difficultyRecommendation: "Intermediate",
    defaultLevel: "intermediate",
    openingQuestion: "What do you like to do when you have free time? Do you have any favorite hobbies or creative activities?",
    tutorContext: "Engage enthusiastically about personal passions, favorite books, music genres, fitness routines, and creative hobbies.",
  },
  {
    id: "presentations",
    name: "English for Presentations",
    description: "Practice opening a talk, signposting transitions, presenting charts, and answering audience questions.",
    difficultyRecommendation: "Advanced",
    defaultLevel: "advanced",
    openingQuestion: "I understand you're preparing an upcoming presentation. What is the topic of your talk, and who is your target audience?",
    tutorContext: "You are an executive communication coach. Help the learner structure clear opening hooks, signpost key points, present metrics convincingly, and handle Q&A questions.",
  },
];

export const DEFAULT_SCENARIO_ID = "free";

export function getScenarioById(id) {
  if (!id) return CONVERSATION_SCENARIOS[0];
  const found = CONVERSATION_SCENARIOS.find((s) => s.id === id);
  return found || CONVERSATION_SCENARIOS[0];
}
