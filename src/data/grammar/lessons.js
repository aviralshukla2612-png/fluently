/**
 * Shadowly / Lingova — Grammar Curriculum Dataset
 * Beginner, Intermediate, and Advanced grammar units with formulas, examples, common mistakes, and interactive questions.
 */

export const GRAMMAR_LESSONS = [
  // --- BEGINNER ---
  {
    id: "gram-b-pres-simple",
    title: "Present Simple",
    difficulty: "beginner",
    category: "Verbs & Tenses",
    learningObjective: "Master the present simple tense for persistent facts, regular habits, and daily routines.",
    shortExplanation: "Use the present simple to express actions that happen regularly or states that are generally true.",
    grammarRule: "Subject + base verb (+ -s/-es for 3rd person singular: he, she, it)",
    examples: [
      { sentence: "I work at a design studio in the city center.", note: "Regular occupational state" },
      { sentence: "She speaks three languages fluently.", note: "Persistent ability (notice the -s on speaks)" },
      { sentence: "Water boils at one hundred degrees Celsius.", note: "Universal scientific fact" },
    ],
    commonMistakes: [
      {
        incorrect: "He go to the gym every morning.",
        correct: "He goes to the gym every morning.",
        explanation: "Third-person singular subjects (he/she/it) require the verb ending -s or -es.",
      },
      {
        incorrect: "She don't like spicy food.",
        correct: "She doesn't like spicy food.",
        explanation: "In negative statements with he/she/it, use 'does not' (doesn't), not 'don't'.",
      },
    ],
    practiceQuestions: [
      {
        id: "q-ps-1",
        type: "multiple_choice",
        prompt: "Choose the correct verb form: My brother _______ in London.",
        options: ["lives", "live", "living", "is live"],
        correctAnswer: "lives",
        explanation: "'My brother' is third-person singular (he), requiring the verb ending '-s'.",
      },
      {
        id: "q-ps-2",
        type: "fill_blank",
        prompt: "Fill in the blank with the correct negative form of 'do': She _______ not eat meat.",
        acceptedAnswers: ["does", "doesn't", "does not"],
        explanation: "Third-person singular requires 'does' (or 'does not' / 'doesn't').",
      },
      {
        id: "q-ps-3",
        type: "choose_correct",
        prompt: "Which sentence is grammatically correct?",
        options: [
          "They travels to Spain every summer.",
          "They travel to Spain every summer.",
          "They are travel to Spain every summer.",
        ],
        correctAnswer: "They travel to Spain every summer.",
        explanation: "'They' is plural and takes the base verb form 'travel' without an '-s'.",
      },
    ],
  },
  {
    id: "gram-b-articles",
    title: "Articles: A, An, and The",
    difficulty: "beginner",
    category: "Nouns & Modifiers",
    learningObjective: "Distinguish between indefinite articles (a/an) and the definite article (the).",
    shortExplanation: "Use 'a/an' when introducing non-specific singular countable nouns; use 'the' when referring to a specific item known to speaker and listener.",
    grammarRule: "'A' before consonant sounds; 'An' before vowel sounds; 'The' for specific or unique entities.",
    examples: [
      { sentence: "I saw an interesting film yesterday.", note: "'Interesting' starts with vowel sound /ɪ/ -> 'an'" },
      { sentence: "Could you close the window?", note: "Both parties know which specific window is meant -> 'the'" },
      { sentence: "She is a university professor.", note: "'University' begins with a consonant glide sound /j/ -> 'a'" },
    ],
    commonMistakes: [
      {
        incorrect: "He wants to buy an car.",
        correct: "He wants to buy a car.",
        explanation: "'Car' begins with a consonant sound /k/, so it takes 'a', not 'an'.",
      },
      {
        incorrect: "She goes to the work at 8 AM.",
        correct: "She goes to work at 8 AM.",
        explanation: "Institutional places like 'work', 'school', and 'church' omit articles in habitual phrases.",
      },
    ],
    practiceQuestions: [
      {
        id: "q-art-1",
        type: "multiple_choice",
        prompt: "Choose the correct article: It took _______ hour to reach the airport.",
        options: ["an", "a", "the", "no article"],
        correctAnswer: "an",
        explanation: "Although 'hour' begins with 'h', the 'h' is silent and the word starts with a vowel sound /aʊər/.",
      },
      {
        id: "q-art-2",
        type: "fill_blank",
        prompt: "Type the appropriate article: Look at _______ moon tonight; it's completely full.",
        acceptedAnswers: ["the", "The"],
        explanation: "There is only one Earth moon in our context, so the definite article 'the' is required.",
      },
      {
        id: "q-art-3",
        type: "choose_correct",
        prompt: "Which sentence uses articles correctly?",
        options: [
          "She bought an European car.",
          "She bought a European car.",
          "She bought the European car without any context.",
        ],
        correctAnswer: "She bought a European car.",
        explanation: "'European' starts with a /j/ consonant glide sound ('yu-ro-pe-an'), requiring 'a'.",
      },
    ],
  },
  {
    id: "gram-b-past-simple",
    title: "Past Simple",
    difficulty: "beginner",
    category: "Verbs & Tenses",
    learningObjective: "Form and use regular and irregular past simple verbs to talk about completed past events.",
    shortExplanation: "Use the past simple for finished actions that happened at a specific time in the past.",
    grammarRule: "Regular: base verb + -ed (worked, played); Irregular: unique forms (went, bought, saw)",
    examples: [
      { sentence: "We visited our grandparents last weekend.", note: "Regular verb: visit + ed" },
      { sentence: "She bought a new laptop yesterday.", note: "Irregular verb: buy -> bought" },
      { sentence: "Did you watch the match last night?", note: "Question form: Did + subject + base verb" },
    ],
    commonMistakes: [
      {
        incorrect: "Did you saw the news?",
        correct: "Did you see the news?",
        explanation: "After auxiliary 'did/didn't', the main verb must remain in its base form.",
      },
    ],
    practiceQuestions: [
      {
        id: "q-pst-1",
        type: "multiple_choice",
        prompt: "What is the correct past form of 'go'?: We _______ to the beach yesterday.",
        options: ["went", "goed", "gone", "was go"],
        correctAnswer: "went",
        explanation: "'Go' is an irregular verb whose past simple form is 'went'.",
      },
      {
        id: "q-pst-2",
        type: "fill_blank",
        prompt: "Complete the sentence with the past form of 'see': I _______ him at the conference yesterday.",
        acceptedAnswers: ["saw", "Saw"],
        explanation: "The past simple form of 'see' is 'saw'.",
      },
    ],
  },

  // --- INTERMEDIATE ---
  {
    id: "gram-i-pres-perfect",
    title: "Present Perfect vs. Past Simple",
    difficulty: "intermediate",
    category: "Verbs & Tenses",
    learningObjective: "Distinguish between actions with present relevance (present perfect) and finished past time (past simple).",
    shortExplanation: "Use present perfect (have/has + past participle) for life experiences and actions connected to now. Use past simple when a specific past time is stated.",
    grammarRule: "Present Perfect: have/has + past participle (V3); Past Simple: past form (V2) with finished time adverbials.",
    examples: [
      { sentence: "I have lived in Berlin for five years.", note: "Started in the past and still living there now" },
      { sentence: "I lived in Berlin in 2018.", note: "Finished time period in the past" },
      { sentence: "Have you ever traveled to Japan?", note: "Life experience up to the present moment" },
    ],
    commonMistakes: [
      {
        incorrect: "I have seen that movie yesterday.",
        correct: "I saw that movie yesterday.",
        explanation: "Do not use present perfect with specific past time markers like 'yesterday' or 'in 2020'.",
      },
    ],
    practiceQuestions: [
      {
        id: "q-pp-1",
        type: "multiple_choice",
        prompt: "Choose the correct tense: She _______ three cups of coffee this morning (and the morning is not over).",
        options: ["has drunk", "drank", "is drinking", "drinks"],
        correctAnswer: "has drunk",
        explanation: "Because the time period 'this morning' is ongoing, present perfect 'has drunk' is appropriate.",
      },
      {
        id: "q-pp-2",
        type: "fill_blank",
        prompt: "Complete with the correct auxiliary verb: They _______ already finished their project.",
        acceptedAnswers: ["have", "'ve"],
        explanation: "'They' pairs with the auxiliary 'have' in the present perfect.",
      },
    ],
  },
  {
    id: "gram-i-conditionals",
    title: "First & Second Conditionals",
    difficulty: "intermediate",
    category: "Sentence Structure",
    learningObjective: "Construct real possibilities (first conditional) and hypothetical situations (second conditional).",
    shortExplanation: "First conditional describes real or likely future possibilities. Second conditional explores hypothetical, unlikely, or imaginary scenarios.",
    grammarRule: "1st: If + present simple, will + base verb; 2nd: If + past simple, would + base verb",
    examples: [
      { sentence: "If it rains tomorrow, we will stay indoors.", note: "1st conditional: realistic future scenario" },
      { sentence: "If I won the lottery, I would travel the world.", note: "2nd conditional: hypothetical/imaginary scenario" },
    ],
    commonMistakes: [
      {
        incorrect: "If I will have time, I will call you.",
        correct: "If I have time, I will call you.",
        explanation: "Never use 'will' in the if-clause of a first conditional; use the present simple.",
      },
    ],
    practiceQuestions: [
      {
        id: "q-cond-1",
        type: "multiple_choice",
        prompt: "Choose the correct form: If she _______ harder, she would pass the exam.",
        options: ["studied", "studies", "will study", "would study"],
        correctAnswer: "studied",
        explanation: "This is a second conditional ('would pass' in main clause), requiring past simple 'studied' in the if-clause.",
      },
      {
        id: "q-cond-2",
        type: "fill_blank",
        prompt: "Type the correct modal verb: If we leave now, we _______ arrive before sunset.",
        acceptedAnswers: ["will", "can", "'ll"],
        explanation: "In a first conditional, the result clause takes 'will' or 'can'.",
      },
    ],
  },

  // --- ADVANCED ---
  {
    id: "gram-a-reported-speech",
    title: "Reported Speech & Backshifting",
    difficulty: "advanced",
    category: "Discourse & Register",
    learningObjective: "Accurately shift tenses, pronouns, and time expressions when reporting statements.",
    shortExplanation: "When reporting what someone said in the past, verbs usually shift one step back in time (e.g. present simple -> past simple; will -> would).",
    grammarRule: "Direct: 'I am tired' -> Reported: He said (that) he was tired.",
    examples: [
      { sentence: "Direct: 'I will help you.' -> Reported: She promised that she would help me.", note: "will -> would" },
      { sentence: "Direct: 'We saw the film.' -> Reported: They explained that they had seen the film.", note: "past simple -> past perfect" },
    ],
    commonMistakes: [
      {
        incorrect: "He said me that he was busy.",
        correct: "He told me that he was busy. / He said that he was busy.",
        explanation: "'Say' does not take an indirect personal object without 'to'; use 'told me' instead.",
      },
    ],
    practiceQuestions: [
      {
        id: "q-rs-1",
        type: "multiple_choice",
        prompt: "Convert to reported speech: 'I can speak Spanish.' -> Maria said that she _______ speak Spanish.",
        options: ["could", "can", "would", "is able to"],
        correctAnswer: "could",
        explanation: "'Can' backshifts to 'could' in reported speech.",
      },
      {
        id: "q-rs-2",
        type: "choose_correct",
        prompt: "Which reported sentence correctly avoids the common object error?",
        options: [
          "She said to me that she was leaving.",
          "She said me that she was leaving.",
          "She told to me that she was leaving.",
        ],
        correctAnswer: "She said to me that she was leaving.",
        explanation: "'Say to [someone]' or 'tell [someone]' is correct, never 'said me' or 'told to me'.",
      },
    ],
  },
  {
    id: "gram-a-relative-clauses",
    title: "Defining vs. Non-Defining Relative Clauses",
    difficulty: "advanced",
    category: "Sentence Structure",
    learningObjective: "Employ relative pronouns with appropriate punctuation to add essential vs. supplementary detail.",
    shortExplanation: "Defining relative clauses specify which item is meant (no commas). Non-defining clauses add extra, non-essential information (set off with commas; never use 'that').",
    grammarRule: "Defining: The laptop that I bought broke. Non-defining: My laptop, which I bought in Tokyo, broke.",
    examples: [
      { sentence: "The candidate who scored highest received the fellowship.", note: "Defining: specifies the exact candidate" },
      { sentence: "Professor Evans, who joined our faculty last year, published a monograph.", note: "Non-defining: surrounded by commas" },
    ],
    commonMistakes: [
      {
        incorrect: "My car, that I bought last year, is reliable.",
        correct: "My car, which I bought last year, is reliable.",
        explanation: "Never use 'that' in non-defining relative clauses with commas; use 'which' or 'who'.",
      },
    ],
    practiceQuestions: [
      {
        id: "q-rc-1",
        type: "multiple_choice",
        prompt: "Choose the correct pronoun: London, _______ is the capital of the UK, attracts millions of visitors.",
        options: ["which", "that", "where", "who"],
        correctAnswer: "which",
        explanation: "In non-defining clauses with commas referring to a thing or place as subject, 'which' is required; 'that' is incorrect.",
      },
    ],
  },
];
