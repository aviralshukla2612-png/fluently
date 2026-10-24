/**
 * Shadowly Free Diagnostic Assessment Dataset
 * Original questions and passages designed to provide a rapid, provisional skill assessment.
 */

export const DIAGNOSTIC_EXAM = {
  id: "exam_diagnostic_01",
  title: "Fluently IELTS Diagnostic Assessment",
  slug: "ielts-diagnostic-test",
  examType: "ACADEMIC",
  version: "1.0.0",
  status: "PUBLISHED",
  description:
    "A free, streamlined diagnostic test evaluating listening, reading, writing, and speaking fundamentals with provisional band indicators.",
  durationMinutes: 45,
  pricePaise: 0,
  currency: "INR",
  isDiagnostic: true,
  sections: [
    {
      id: "sec_diag_listening",
      sectionType: "LISTENING",
      title: "Diagnostic Listening",
      orderIndex: 0,
      durationMinutes: 12,
      instructions: "Listen to the audio recording carefully and answer Questions 1 to 6. You may only listen once.",
      config: {
        audioUrl: "/audio/diagnostic/listening_part1.mp3",
        transcript:
          "Welcome to the City Library orientation session. Today, we are discussing the recent digital archive upgrades. The research commons now operates from 8 AM to 9 PM on weekdays. Students requiring access to rare manuscripts must reserve a workstation at least twenty-four hours in advance. There is no fee for cardholders, though printing incurs a charge of ten cents per page.",
      },
      questions: [
        {
          id: "diag_l1",
          questionNumber: 1,
          questionType: "SHORT_ANSWER",
          prompt: "What time does the research commons open on weekdays?",
          correctAnswerKey: ["8 AM", "8:00 AM", "8 a.m.", "8am"],
          wordLimit: 2,
        },
        {
          id: "diag_l2",
          questionNumber: 2,
          questionType: "COMPLETION",
          prompt: "Workstations for rare manuscripts must be reserved at least _______ hours in advance.",
          correctAnswerKey: ["24", "twenty-four", "twenty four"],
          wordLimit: 2,
        },
        {
          id: "diag_l3",
          questionNumber: 3,
          questionType: "MULTIPLE_CHOICE",
          prompt: "What is the fee for library cardholders to use the research workstations?",
          options: ["Ten cents", "No fee", "Twenty-four dollars", "Five dollars"],
          correctAnswerKey: "No fee",
        },
        {
          id: "diag_l4",
          questionNumber: 4,
          questionType: "SHORT_ANSWER",
          prompt: "How much is charged per printed page?",
          correctAnswerKey: ["ten cents", "10 cents", "10¢"],
          wordLimit: 2,
        },
        {
          id: "diag_l5",
          questionNumber: 5,
          questionType: "TRUE_FALSE_NOT_GIVEN",
          prompt: "The research commons remains open past 9 PM on Fridays.",
          correctAnswerKey: "FALSE",
        },
        {
          id: "diag_l6",
          questionNumber: 6,
          questionType: "COMPLETION",
          prompt: "The orientation session was focused on digital archive _______.",
          correctAnswerKey: ["upgrades", "upgrade"],
          wordLimit: 1,
        },
      ],
    },
    {
      id: "sec_diag_reading",
      sectionType: "READING",
      title: "Diagnostic Reading",
      orderIndex: 1,
      durationMinutes: 15,
      instructions: "Read the passage below and answer Questions 7 to 12.",
      config: {
        passageTitle: "Neuroplasticity and Adult Second Language Acquisition",
        passageText:
          "For decades, linguistic orthodoxy maintained the 'Critical Period Hypothesis', asserting that native-like fluency in a second language was unattainable after adolescence due to diminished cerebral plasticity. However, recent neuroimaging investigations have fundamentally overturned this assumption. Modern studies demonstrate that the adult brain retains remarkable neuroplasticity, capable of establishing robust synaptogenesis and white-matter density adaptations in response to intensive auditory shadowing and structured lexical retrieval.\n\nWhile juvenile learners generally acquire phonological nuances effortlessly through implicit assimilation, adult learners possess distinct cognitive advantages. Adults exhibit superior metacognitive awareness, broader existing semantic networks, and advanced syntactic analytical skills. Consequently, when adult learners combine communicative immersion with deliberate pronunciation practice, their rate of conceptual acquisition frequently surpasses that of younger counterparts, proving that language mastery is driven more by pedagogical quality and deliberate repetition than by chronological age alone.",
      },
      questions: [
        {
          id: "diag_r1",
          questionNumber: 7,
          questionType: "TRUE_FALSE_NOT_GIVEN",
          prompt: "Recent neuroimaging studies support the traditional Critical Period Hypothesis.",
          correctAnswerKey: "FALSE",
        },
        {
          id: "diag_r2",
          questionNumber: 8,
          questionType: "TRUE_FALSE_NOT_GIVEN",
          prompt: "Adult brains are capable of structural adaptations in response to intensive auditory shadowing.",
          correctAnswerKey: "TRUE",
        },
        {
          id: "diag_r3",
          questionNumber: 9,
          questionType: "TRUE_FALSE_NOT_GIVEN",
          prompt: "Younger learners always achieve higher test scores on written grammar exams.",
          correctAnswerKey: "NOT GIVEN",
        },
        {
          id: "diag_r4",
          questionNumber: 10,
          questionType: "MULTIPLE_CHOICE",
          prompt: "According to the passage, what cognitive advantage do adult learners exhibit?",
          options: [
            "Effortless implicit phonological mimicry",
            "Superior metacognitive awareness and semantic networks",
            "Faster auditory reflexes during childhood",
            "Complete immunity to grammatical errors",
          ],
          correctAnswerKey: "Superior metacognitive awareness and semantic networks",
        },
        {
          id: "diag_r5",
          questionNumber: 11,
          questionType: "COMPLETION",
          prompt: "Juvenile learners typically acquire phonological nuances through _______ assimilation.",
          correctAnswerKey: ["implicit"],
          wordLimit: 1,
        },
        {
          id: "diag_r6",
          questionNumber: 12,
          questionType: "COMPLETION",
          prompt: "Language mastery is governed more by pedagogical quality and deliberate repetition than by _______ alone.",
          correctAnswerKey: ["chronological age", "age"],
          wordLimit: 2,
        },
      ],
    },
    {
      id: "sec_diag_writing",
      sectionType: "WRITING",
      title: "Diagnostic Writing",
      orderIndex: 2,
      durationMinutes: 12,
      instructions: "Respond to the prompt below. Write at least 100 words.",
      config: {
        taskType: "TASK_2_SHORT",
        minWords: 100,
      },
      questions: [
        {
          id: "diag_w1",
          questionNumber: 13,
          questionType: "WRITING_TASK2",
          prompt:
            "Some people believe that studying online is just as effective as attending traditional in-person classes. To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own experience. Write at least 100 words.",
          scoringRubric: {
            criteria: ["Task Response", "Coherence and Cohesion", "Lexical Resource", "Grammatical Range and Accuracy"],
            minWords: 100,
          },
          wordLimit: null,
        },
      ],
    },
    {
      id: "sec_diag_speaking",
      sectionType: "SPEAKING",
      title: "Diagnostic Speaking",
      orderIndex: 3,
      durationMinutes: 6,
      instructions: "Speak clearly into your microphone in response to each prompt.",
      config: {
        allowRetry: true,
      },
      questions: [
        {
          id: "diag_s1",
          questionNumber: 14,
          questionType: "SPEAKING_PART1",
          prompt: "Could you tell me about your daily routine and what part of the day you find most productive?",
          scoringRubric: { targetDurationSeconds: 45 },
        },
        {
          id: "diag_s2",
          questionNumber: 15,
          questionType: "SPEAKING_PART2",
          prompt:
            "Describe a skill or hobby you would like to master in the future. You should say: what the skill is, why you want to learn it, how you plan to learn it, and explain how mastering this skill would impact your life.",
          scoringRubric: { prepTimeSeconds: 30, targetDurationSeconds: 90 },
        },
      ],
    },
  ],
};
