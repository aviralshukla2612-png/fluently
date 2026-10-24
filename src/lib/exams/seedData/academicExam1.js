/**
 * Shadowly IELTS Academic Mock Exam 1
 * Complete, original, 4-skill full-length mock examination.
 * Conforms to standard IELTS Academic timing, structure, and assessment formats.
 */

export const ACADEMIC_EXAM_1 = {
  id: "exam_academic_01",
  title: "IELTS Academic Practice Exam 1",
  slug: "ielts-academic-mock-1",
  examType: "ACADEMIC",
  version: "1.0.0",
  status: "PUBLISHED",
  description:
    "Complete full-length IELTS Academic simulation with all 4 components: Listening (40 questions), Reading (40 questions), Writing (Task 1 & Task 2), and Speaking (3 Parts). Evaluated with official criteria and estimated band calculations.",
  durationMinutes: 165,
  pricePaise: 19900, // ₹199.00
  currency: "INR",
  isDiagnostic: false,
  sections: [
    // -------------------------------------------------------------
    // SECTION 1: LISTENING (40 Questions, 30 mins audio + 5 transfer)
    // -------------------------------------------------------------
    {
      id: "sec_acad1_listening",
      sectionType: "LISTENING",
      title: "Listening Section",
      orderIndex: 0,
      durationMinutes: 35,
      instructions:
        "The Listening test consists of 4 parts with 10 questions each (total 40 questions). Listen carefully and record your answers as you go. You will have time to review your answers at the end of the section.",
      config: {
        totalParts: 4,
        audioTracks: [
          {
            part: 1,
            title: "Part 1: Student Accommodation Booking",
            audioUrl: "/audio/exam1/listening_part1.mp3",
            transcript:
              "Good morning, Student Housing Central, Maria speaking. Hello, I am calling to inquire about postgraduate flats near North Campus. Certainly. We currently have openings at the Meadowview Complex on Kingfisher Road. The standard studio is available for six hundred and eighty pounds per calendar month, which includes water and broadband, though electricity is billed separately. A refundable security deposit of four hundred and fifty pounds is required upon lease signing. Moving in is scheduled for September fifteenth.",
          },
          {
            part: 2,
            title: "Part 2: Riverfront Park Redevelopment",
            audioUrl: "/audio/exam1/listening_part2.mp3",
            transcript:
              "Welcome, residents, to the municipal briefing on the Riverfront Park project. Phase One commences in October and focuses on ecological restoration. The former industrial dock will be converted into an educational wetland sanctuary. Walking paths will feature recycled solar-illuminated pavers, operating between dusk and midnight. Cycling is strictly restricted to designated outer loops to protect local nesting waterfowl.",
          },
          {
            part: 3,
            title: "Part 3: Marine Biology Fieldwork Presentation",
            audioUrl: "/audio/exam1/listening_part3.mp3",
            transcript:
              "Professor Hughes, we have compiled our preliminary findings on coral polyps along the southern reef. Fascinating, Liam. What did the water temperature loggers reveal? We observed an average fluctuation of two point four degrees over three weeks. Crucially, the western quadrant with higher tidal circulation displayed significantly lower mortality rates, suggesting that mechanical currents facilitate nutrient distribution even during warm temperature spikes.",
          },
          {
            part: 4,
            title: "Part 4: Historical Urban Architecture and Sanitation",
            audioUrl: "/audio/exam1/listening_part4.mp3",
            transcript:
              "Today's lecture examines the nineteenth-century urban transformation of European capitals, driven primarily by sanitary engineering. Prior to the Great Stink of 1858 in London, sewage systems discharged directly into the Thames. Chief Engineer Joseph Bazalgette designed an underground network encompassing eighty-two miles of enclosed brick intercepting sewers. This engineering triumph eradicated cholera epidemics and established modern civil infrastructure standards.",
          },
        ],
      },
      questions: [
        // Part 1: Q1-Q10
        { id: "a1_l01", questionNumber: 1, questionType: "COMPLETION", prompt: "Complex name: _______ Complex", correctAnswerKey: ["meadowview", "meadow view"], wordLimit: 2 },
        { id: "a1_l02", questionNumber: 2, questionType: "COMPLETION", prompt: "Street address: _______ Road", correctAnswerKey: ["kingfisher"], wordLimit: 1 },
        { id: "a1_l03", questionNumber: 3, questionType: "SHORT_ANSWER", prompt: "Monthly rental cost: £_______", correctAnswerKey: ["680", "six hundred and eighty", "six hundred eighty"], wordLimit: 2 },
        { id: "a1_l04", questionNumber: 4, questionType: "MULTIPLE_CHOICE", prompt: "Which utility is billed separately from the base rent?", options: ["Water", "Broadband", "Electricity", "Council tax"], correctAnswerKey: "Electricity" },
        { id: "a1_l05", questionNumber: 5, questionType: "SHORT_ANSWER", prompt: "Amount of security deposit: £_______", correctAnswerKey: ["450", "four hundred and fifty"], wordLimit: 2 },
        { id: "a1_l06", questionNumber: 6, questionType: "COMPLETION", prompt: "Move-in date: September _______", correctAnswerKey: ["15", "15th", "fifteenth"], wordLimit: 1 },
        { id: "a1_l07", questionNumber: 7, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "The flats are exclusively reserved for undergraduate students.", correctAnswerKey: "FALSE" },
        { id: "a1_l08", questionNumber: 8, questionType: "COMPLETION", prompt: "The housing advisor's name is _______.", correctAnswerKey: ["maria"], wordLimit: 1 },
        { id: "a1_l09", questionNumber: 9, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Private parking is included in the base rent.", correctAnswerKey: "NOT GIVEN" },
        { id: "a1_l10", questionNumber: 10, questionType: "COMPLETION", prompt: "The flats are situated near the _______ Campus.", correctAnswerKey: ["north"], wordLimit: 1 },

        // Part 2: Q11-Q20
        { id: "a1_l11", questionNumber: 11, questionType: "COMPLETION", prompt: "Phase One of the redevelopment begins in _______.", correctAnswerKey: ["october"], wordLimit: 1 },
        { id: "a1_l12", questionNumber: 12, questionType: "COMPLETION", prompt: "The industrial dock will be transformed into an educational _______ sanctuary.", correctAnswerKey: ["wetland", "wetlands"], wordLimit: 1 },
        { id: "a1_l13", questionNumber: 13, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Walking path pavers are made of recycled materials.", correctAnswerKey: "TRUE" },
        { id: "a1_l14", questionNumber: 14, questionType: "SHORT_ANSWER", prompt: "Path illumination operates between dusk and _______.", correctAnswerKey: ["midnight", "12 am", "12:00 am"], wordLimit: 1 },
        { id: "a1_l15", questionNumber: 15, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Bicycles are permitted along all park pathways without restriction.", correctAnswerKey: "FALSE" },
        { id: "a1_l16", questionNumber: 16, questionType: "COMPLETION", prompt: "Cycling restrictions aim to protect local nesting _______.", correctAnswerKey: ["waterfowl", "birds"], wordLimit: 1 },
        { id: "a1_l17", questionNumber: 17, questionType: "MULTIPLE_CHOICE", prompt: "The meeting was held primarily for:", options: ["Elected city officials", "Local commercial vendors", "Neighborhood residents", "Construction contractors"], correctAnswerKey: "Neighborhood residents" },
        { id: "a1_l18", questionNumber: 18, questionType: "COMPLETION", prompt: "The project location is situated along the _______.", correctAnswerKey: ["riverfront", "river"], wordLimit: 1 },
        { id: "a1_l19", questionNumber: 19, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Phase Two will introduce a commercial marina.", correctAnswerKey: "NOT GIVEN" },
        { id: "a1_l20", questionNumber: 20, questionType: "COMPLETION", prompt: "Paver illumination is powered by _______ energy.", correctAnswerKey: ["solar"], wordLimit: 1 },

        // Part 3: Q21-Q30
        { id: "a1_l21", questionNumber: 21, questionType: "SHORT_ANSWER", prompt: "Average temperature fluctuation recorded: _______ degrees", correctAnswerKey: ["2.4", "two point four"], wordLimit: 2 },
        { id: "a1_l22", questionNumber: 22, questionType: "COMPLETION", prompt: "Data logging took place over a period of _______ weeks.", correctAnswerKey: ["3", "three"], wordLimit: 1 },
        { id: "a1_l23", questionNumber: 23, questionType: "COMPLETION", prompt: "Coral survival was markedly higher in the _______ quadrant.", correctAnswerKey: ["western", "west"], wordLimit: 1 },
        { id: "a1_l24", questionNumber: 24, questionType: "COMPLETION", prompt: "Higher tidal circulation aided _______ distribution.", correctAnswerKey: ["nutrient", "nutrients"], wordLimit: 1 },
        { id: "a1_l25", questionNumber: 25, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Warmer temperatures caused universal coral mortality across the entire reef.", correctAnswerKey: "FALSE" },
        { id: "a1_l26", questionNumber: 26, questionType: "MULTIPLE_CHOICE", prompt: "The student conducting the research presentation is:", options: ["Liam", "Hughes", "Joseph", "Maria"], correctAnswerKey: "Liam" },
        { id: "a1_l27", questionNumber: 27, questionType: "COMPLETION", prompt: "The organism under investigation was coral _______.", correctAnswerKey: ["polyps", "polyp"], wordLimit: 1 },
        { id: "a1_l28", questionNumber: 28, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "The research received financial sponsorship from a private diving club.", correctAnswerKey: "NOT GIVEN" },
        { id: "a1_l29", questionNumber: 29, questionType: "COMPLETION", prompt: "Water temperature was measured using electronic _______.", correctAnswerKey: ["loggers", "logger"], wordLimit: 1 },
        { id: "a1_l30", questionNumber: 30, questionType: "COMPLETION", prompt: "The research reef is located in the _______ region.", correctAnswerKey: ["southern", "south"], wordLimit: 1 },

        // Part 4: Q31-Q40
        { id: "a1_l31", questionNumber: 31, questionType: "SHORT_ANSWER", prompt: "Year of the Great Stink: _______", correctAnswerKey: ["1858"], wordLimit: 1 },
        { id: "a1_l32", questionNumber: 32, questionType: "COMPLETION", prompt: "Prior to the reform, waste was discharged directly into the River _______.", correctAnswerKey: ["thames"], wordLimit: 1 },
        { id: "a1_l33", questionNumber: 33, questionType: "COMPLETION", prompt: "The chief engineer who designed the new network was Joseph _______.", correctAnswerKey: ["bazalgette"], wordLimit: 1 },
        { id: "a1_l34", questionNumber: 34, questionType: "SHORT_ANSWER", prompt: "Total length of intercepting sewers built: _______ miles", correctAnswerKey: ["82", "eighty-two", "eighty two"], wordLimit: 2 },
        { id: "a1_l35", questionNumber: 35, questionType: "COMPLETION", prompt: "The intercepting sewer tunnels were constructed out of enclosed _______.", correctAnswerKey: ["brick", "bricks"], wordLimit: 1 },
        { id: "a1_l36", questionNumber: 36, questionType: "COMPLETION", prompt: "The new sanitation infrastructure eliminated recurring epidemics of _______.", correctAnswerKey: ["cholera"], wordLimit: 1 },
        { id: "a1_l37", questionNumber: 37, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Bazalgette's sewer system remains in partial use today.", correctAnswerKey: "NOT GIVEN" },
        { id: "a1_l38", questionNumber: 38, questionType: "MULTIPLE_CHOICE", prompt: "What drove nineteenth-century urban transformation in European capitals?", options: ["Industrial steam locomotives", "Sanitary civil engineering", "Aesthetic park design", "Private toll bridges"], correctAnswerKey: "Sanitary civil engineering" },
        { id: "a1_l39", questionNumber: 39, questionType: "COMPLETION", prompt: "The engineering feat set modern standards for _______ infrastructure.", correctAnswerKey: ["civil"], wordLimit: 1 },
        { id: "a1_l40", questionNumber: 40, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "The Great Stink occurred in Paris.", correctAnswerKey: "FALSE" },
      ],
    },

    // -------------------------------------------------------------
    // SECTION 2: READING (40 Questions, 60 minutes)
    // -------------------------------------------------------------
    {
      id: "sec_acad1_reading",
      sectionType: "READING",
      title: "Reading Section",
      orderIndex: 1,
      durationMinutes: 60,
      instructions:
        "The Reading test contains 3 academic passages with 40 questions total. Read each passage carefully and answer the questions. You must complete the section within 60 minutes.",
      config: {
        totalPassages: 3,
        passages: [
          {
            passageNumber: 1,
            title: "Passage 1: Hydraulic Engineering of Roman Aqueducts",
            text:
              "The monumental aqueducts of the Roman Empire represent one of antiquity's most enduring civil engineering achievements. Spanning across Europe, North Africa, and the Near East, these conduits channeled millions of gallons of potable water daily to urban centers, supplying public baths, communal fountains, and imperial estates.\n\nContrary to popular perception, the vast majority of aqueduct channels were subterranean. Approximately eighty percent of the overall distance traversed by aqueduct networks ran through underground masonry tunnels and cut-and-cover trenches. Subterranean channels protected the water supply from atmospheric contamination, reduced evaporative losses during arid Mediterranean summers, and minimized structural vulnerability to seismic tremors and military sabotage. Arched bridge spans were erected only when valleys, gorges, or severe depressions necessitated maintaining a continuous gravitational gradient.\n\nMaintaining the gravitational gradient required extraordinary geodetic precision. Roman surveyors, known as libratores, utilized specialized instruments including the groma for right-angle alignments, the dioptra for leveling, and the chorobates—a twenty-foot wooden timber incorporating plumb lines and water troughs. Hydraulic gradients were rigorously engineered, commonly sustaining an inclination of merely one meter per kilometer (a 1:1000 slope). Such minute inclines prevented excessive velocity that could erode mortar linings while ensuring continuous flow to prevent stagnation.",
          },
          {
            passageNumber: 2,
            title: "Passage 2: The Chemosynthetic Ecology of Hydrothermal Vents",
            text:
              "In 1977, marine geologists exploring the Galápagos Rift aboard the research submersible Alvin made an astonishing discovery: clustered around volcanic fissures on the abyssal ocean floor, over 2,500 meters beneath the surface, were dense, flourishing biological communities. In an environment devoid of sunlight, under crushing hydrostatic pressures exceeding 250 atmospheres, scientists had presumed the ocean floor to be an oceanic desert.\n\nSubsequent investigations revealed that these hydrothermal vent ecosystems operate entirely independent of solar photosynthesis. Instead, the biological trophic foundation relies upon chemosynthesis performed by specialized autotrophic bacteria. As superheated mineral-rich seawater discharges from basalt chimneys ('black smokers') at temperatures exceeding 400 degrees Celsius, it precipitates dissolved metal sulfides into the ambient near-freezing seawater. Chemosynthetic bacteria oxidize hydrogen sulfide, harvesting chemical bond energy to synthesize organic carbon from dissolved carbon dioxide.\n\nThis biochemical energy transfer supports extraordinary endemic faunal adaptations. Giant hydrothermal tube worms, Riftia pachyptila, which reach lengths of two meters, lack a digestive tract, mouth, or anus entirely. Instead, they harbor billions of symbiotic sulfur-oxidizing bacteria in a specialized vascularized organ called the trophosome. The worms' bright red plumes contain specialized hemoglobins capable of binding both oxygen and toxic sulfide simultaneously, transporting these metabolic reactants directly to their internal bacterial symbionts.",
          },
          {
            passageNumber: 3,
            title: "Passage 3: Creolization and the Evolution of Human Language",
            text:
              "How human grammatical complexity originally emerged represents one of linguistics' most contested questions. In recent decades, generative linguists and cognitive anthropologists have examined contact languages—specifically pidgins and creoles—to gain empirical insights into innate language acquisition mechanisms.\n\nA pidgin arises when human communities lacking a mutually intelligible tongue must establish rudimentary communication for commercial trade or forced plantation labor. Structurally, pidgins exhibit fragmented syntax, absence of inflectional morphology, variable word order, and restricted lexical repertoires. Crucially, a pidgin possesses no native speakers; it serves strictly as an auxiliary communicative medium.\n\nThe transformative process occurs across a single generational shift known as creolization. When children are born into a speech community where a pidgin is spoken, their innate cognitive Language Acquisition Device (LAD) imposes systematic syntactic architecture upon the impoverished linguistic input. Within a generation, the children construct a full-fledged creole featuring stable word order, rigorous tense-aspect-mood markers, and embedded clause structures. The rapid stabilization of creole grammars without explicit adult instruction provides persuasive evidence that grammatical recursion is biologically hardwired into human neurocognitive architecture.",
          },
        ],
      },
      questions: [
        // Passage 1: Q1-Q13
        { id: "a1_r01", questionNumber: 1, questionType: "SHORT_ANSWER", prompt: "What percentage of Roman aqueducts ran underground?", correctAnswerKey: ["80%", "eighty percent", "80 percent"], wordLimit: 2 },
        { id: "a1_r02", questionNumber: 2, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Arched aqueduct bridges were the most common structural component across the entire network.", correctAnswerKey: "FALSE" },
        { id: "a1_r03", questionNumber: 3, questionType: "COMPLETION", prompt: "Roman surveyors were known as _______.", correctAnswerKey: ["libratores", "libratore"], wordLimit: 1 },
        { id: "a1_r04", questionNumber: 4, questionType: "COMPLETION", prompt: "The instrument used for right-angle alignment was the _______.", correctAnswerKey: ["groma"], wordLimit: 1 },
        { id: "a1_r05", questionNumber: 5, questionType: "COMPLETION", prompt: "The twenty-foot timber instrument with plumb lines was the _______.", correctAnswerKey: ["chorobates"], wordLimit: 1 },
        { id: "a1_r06", questionNumber: 6, questionType: "SHORT_ANSWER", prompt: "Standard engineered slope was one meter per _______.", correctAnswerKey: ["kilometer", "km", "kilometre"], wordLimit: 1 },
        { id: "a1_r07", questionNumber: 7, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Underground channels protected water from Mediterranean summer evaporation.", correctAnswerKey: "TRUE" },
        { id: "a1_r08", questionNumber: 8, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Every Roman citizen had running water piped directly into private bedrooms.", correctAnswerKey: "NOT GIVEN" },
        { id: "a1_r09", questionNumber: 9, questionType: "COMPLETION", prompt: "Minute inclines prevented water velocity from eroding _______ linings.", correctAnswerKey: ["mortar"], wordLimit: 1 },
        { id: "a1_r10", questionNumber: 10, questionType: "MULTIPLE_CHOICE", prompt: "Arched bridge spans were built primarily to cross:", options: ["Valleys and gorges", "Agricultural farmland", "Military fortifications", "Coastal beaches"], correctAnswerKey: "Valleys and gorges" },
        { id: "a1_r11", questionNumber: 11, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Aqueduct masonry was vulnerable to atmospheric contamination if exposed.", correctAnswerKey: "TRUE" },
        { id: "a1_r12", questionNumber: 12, questionType: "COMPLETION", prompt: "The leveling instrument mentioned in the passage was the _______.", correctAnswerKey: ["dioptra"], wordLimit: 1 },
        { id: "a1_r13", questionNumber: 13, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Roman aqueduct water was exclusively used for military fortifications.", correctAnswerKey: "FALSE" },

        // Passage 2: Q14-Q26
        { id: "a1_r14", questionNumber: 14, questionType: "SHORT_ANSWER", prompt: "In what year were hydrothermal vents discovered?", correctAnswerKey: ["1977"], wordLimit: 1 },
        { id: "a1_r15", questionNumber: 15, questionType: "COMPLETION", prompt: "The research submersible used for the discovery was named _______.", correctAnswerKey: ["alvin"], wordLimit: 1 },
        { id: "a1_r16", questionNumber: 16, questionType: "SHORT_ANSWER", prompt: "At what ocean depth in meters were the vents located?", correctAnswerKey: ["2500", "2,500", "over 2500"], wordLimit: 2 },
        { id: "a1_r17", questionNumber: 17, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Hydrothermal vent biological communities depend directly on sunlight for photosynthesis.", correctAnswerKey: "FALSE" },
        { id: "a1_r18", questionNumber: 18, questionType: "COMPLETION", prompt: "The primary biological energy foundation in vents is _______.", correctAnswerKey: ["chemosynthesis"], wordLimit: 1 },
        { id: "a1_r19", questionNumber: 19, questionType: "SHORT_ANSWER", prompt: "Superheated water exits chimneys at temperatures exceeding _______ degrees Celsius.", correctAnswerKey: ["400", "400 degrees"], wordLimit: 2 },
        { id: "a1_r20", questionNumber: 20, questionType: "COMPLETION", prompt: "Chemosynthetic bacteria oxidize hydrogen _______.", correctAnswerKey: ["sulfide", "sulphide"], wordLimit: 1 },
        { id: "a1_r21", questionNumber: 21, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Giant tube worms have a complex multi-chambered stomach.", correctAnswerKey: "FALSE" },
        { id: "a1_r22", questionNumber: 22, questionType: "COMPLETION", prompt: "The specialized bacterial organ inside tube worms is the _______.", correctAnswerKey: ["trophosome"], wordLimit: 1 },
        { id: "a1_r23", questionNumber: 23, questionType: "SHORT_ANSWER", prompt: "Maximum length of Riftia pachyptila in meters: _______", correctAnswerKey: ["2", "two", "2 meters"], wordLimit: 2 },
        { id: "a1_r24", questionNumber: 24, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Hydrostatic pressure at the vents exceeds 250 atmospheres.", correctAnswerKey: "TRUE" },
        { id: "a1_r25", questionNumber: 25, questionType: "MULTIPLE_CHOICE", prompt: "What compound precipitates when superheated water meets cold ocean water?", options: ["Dissolved metal sulfides", "Pure calcium carbonate", "Liquid petroleum", "Nitrogen crystals"], correctAnswerKey: "Dissolved metal sulfides" },
        { id: "a1_r26", questionNumber: 26, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Commercial mining of deep sea vents began in 1980.", correctAnswerKey: "NOT GIVEN" },

        // Passage 3: Q27-Q40
        { id: "a1_r27", questionNumber: 27, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "A pidgin has a well-established community of native speakers.", correctAnswerKey: "FALSE" },
        { id: "a1_r28", questionNumber: 28, questionType: "COMPLETION", prompt: "The transformation from pidgin to creole is called _______.", correctAnswerKey: ["creolization", "creolisation"], wordLimit: 1 },
        { id: "a1_r29", questionNumber: 29, questionType: "COMPLETION", prompt: "The innate cognitive mechanism proposed by linguists is the Language Acquisition _______.", correctAnswerKey: ["device"], wordLimit: 1 },
        { id: "a1_r30", questionNumber: 30, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Creolization typically requires several centuries to establish grammatical rules.", correctAnswerKey: "FALSE" },
        { id: "a1_r31", questionNumber: 31, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Creoles possess stable word order and tense-aspect markers.", correctAnswerKey: "TRUE" },
        { id: "a1_r32", questionNumber: 32, questionType: "MULTIPLE_CHOICE", prompt: "Pidgins originally formed primarily as an auxiliary medium for:", options: ["Academic poetry", "Commercial trade and labor", "Religious liturgy", "Diplomatic treaties"], correctAnswerKey: "Commercial trade and labor" },
        { id: "a1_r33", questionNumber: 33, questionType: "COMPLETION", prompt: "Pidgins exhibit fragmented _______ and variable word order.", correctAnswerKey: ["syntax"], wordLimit: 1 },
        { id: "a1_r34", questionNumber: 34, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Children require explicit formal classroom instruction to create creoles.", correctAnswerKey: "FALSE" },
        { id: "a1_r35", questionNumber: 35, questionType: "COMPLETION", prompt: "Creole evolution suggests that grammatical recursion is biologically _______.", correctAnswerKey: ["hardwired"], wordLimit: 1 },
        { id: "a1_r36", questionNumber: 36, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Pidgins contain advanced inflectional morphology.", correctAnswerKey: "FALSE" },
        { id: "a1_r37", questionNumber: 37, questionType: "COMPLETION", prompt: "Creolization occurs across a single _______ shift.", correctAnswerKey: ["generational"], wordLimit: 1 },
        { id: "a1_r38", questionNumber: 38, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "All modern world languages originated directly from plantation pidgins.", correctAnswerKey: "NOT GIVEN" },
        { id: "a1_r39", questionNumber: 39, questionType: "COMPLETION", prompt: "The acronym for Language Acquisition Device is _______.", correctAnswerKey: ["lad"], wordLimit: 1 },
        { id: "a1_r40", questionNumber: 40, questionType: "TRUE_FALSE_NOT_GIVEN", prompt: "Creoles feature embedded clause structures.", correctAnswerKey: "TRUE" },
      ],
    },

    // -------------------------------------------------------------
    // SECTION 3: WRITING (2 Tasks, 60 minutes)
    // -------------------------------------------------------------
    {
      id: "sec_acad1_writing",
      sectionType: "WRITING",
      title: "Writing Section",
      orderIndex: 2,
      durationMinutes: 60,
      instructions:
        "The Writing test consists of two tasks: Task 1 (minimum 150 words, recommended 20 minutes) and Task 2 (minimum 250 words, recommended 40 minutes). You must complete both tasks within the 60-minute limit.",
      config: {
        totalTasks: 2,
      },
      questions: [
        {
          id: "a1_w01",
          questionNumber: 1,
          questionType: "WRITING_TASK1",
          prompt:
            "The bar chart below illustrates the proportion of electricity generated by four energy sources (Solar, Wind, Natural Gas, and Coal) in a European nation between 2010 and 2025.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.\n\n[Data Table Overview]\n- Solar: 2010 (5%), 2015 (12%), 2020 (22%), 2025 (35%)\n- Wind: 2010 (10%), 2015 (18%), 2020 (28%), 2025 (38%)\n- Natural Gas: 2010 (35%), 2015 (32%), 2020 (25%), 2025 (18%)\n- Coal: 2010 (50%), 2015 (38%), 2020 (25%), 2025 (9%)",
          scoringRubric: {
            criteria: [
              "Task Achievement",
              "Coherence and Cohesion",
              "Lexical Resource",
              "Grammatical Range and Accuracy",
            ],
            minWords: 150,
          },
          wordLimit: null,
        },
        {
          id: "a1_w02",
          questionNumber: 2,
          questionType: "WRITING_TASK2",
          prompt:
            "Some educational researchers argue that artificial intelligence tools should be completely banned in schools and universities to prevent academic dishonesty. Others believe that educational institutions should teach students how to use AI responsibly as a collaborative learning partner.\n\nDiscuss both views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
          scoringRubric: {
            criteria: [
              "Task Response",
              "Coherence and Cohesion",
              "Lexical Resource",
              "Grammatical Range and Accuracy",
            ],
            minWords: 250,
          },
          wordLimit: null,
        },
      ],
    },

    // -------------------------------------------------------------
    // SECTION 4: SPEAKING (3 Parts, 11-14 minutes)
    // -------------------------------------------------------------
    {
      id: "sec_acad1_speaking",
      sectionType: "SPEAKING",
      title: "Speaking Section",
      orderIndex: 3,
      durationMinutes: 15,
      instructions:
        "The Speaking interview consists of three parts. In Part 1, you will answer introductory questions. In Part 2, you will receive a topic card with 1 minute preparation and 1-2 minutes speaking. In Part 3, you will discuss broader abstract questions related to Part 2.",
      config: {
        totalParts: 3,
      },
      questions: [
        {
          id: "a1_s01",
          questionNumber: 1,
          questionType: "SPEAKING_PART1",
          prompt: "Part 1 (Introduction): Let's talk about your hometown. What is the most interesting aspect of your hometown, and how has it changed in recent years?",
          scoringRubric: { targetDurationSeconds: 45 },
        },
        {
          id: "a1_s02",
          questionNumber: 2,
          questionType: "SPEAKING_PART1",
          prompt: "Part 1 (Follow-up): Do you prefer spending your free time indoors or outdoors? Why?",
          scoringRubric: { targetDurationSeconds: 45 },
        },
        {
          id: "a1_s03",
          questionNumber: 3,
          questionType: "SPEAKING_PART2",
          prompt:
            "Part 2 (Long Turn): Describe an important decision you made that significantly influenced your life.\n\nYou should say:\n- What the decision was\n- When and why you made it\n- What challenges or considerations were involved\n- And explain how you felt after making this decision.",
          scoringRubric: { prepTimeSeconds: 60, targetDurationSeconds: 120 },
        },
        {
          id: "a1_s04",
          questionNumber: 4,
          questionType: "SPEAKING_PART3",
          prompt: "Part 3 (Two-way Discussion): In modern society, do young people face more difficult career decisions than previous generations did? Why or why not?",
          scoringRubric: { targetDurationSeconds: 60 },
        },
        {
          id: "a1_s05",
          questionNumber: 5,
          questionType: "SPEAKING_PART3",
          prompt: "Part 3 (Two-way Discussion): How do digital algorithms and social media influence the choices that individuals make in their daily lives?",
          scoringRubric: { targetDurationSeconds: 60 },
        },
      ],
    },
  ],
};
