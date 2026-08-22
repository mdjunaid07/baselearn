// Level 2 test question bank — deliberately separate from questionBank.js's
// QUESTION_BANK so these harder, topic-tagged questions can never accidentally leak
// into ordinary diagnostic/practice question selection (getQuestionsForSkill /
// selectPracticeQuestions only ever read from QUESTION_BANK).
//
// Same object shape as QUESTION_BANK (so gradeAttempt() in adaptiveEngine.js needs
// zero changes to grade these), plus one new field: topicIds — the roadmap topic
// IDs (from data/roadmapTopics.js) this question checks. A wrong answer on a
// question automatically marks every one of its topicIds as "missed" — see
// sessionProcessor.js's processLevel2Submit.

const stars = (n) => "⭐".repeat(n);

export const LEVEL2_QUESTION_BANK = {
  numeracy: [
    // --- numberRecognition ---
    { id: "num-numberRecognition-lvl2-a", subject: "numeracy", skill: "numberRecognition", topicIds: ["num-recognize-teens"], difficulty: 3, type: "choice",
      prompt: "Tap the number 91", audioText: "Can you find the number 91?",
      options: [{ id: "a", label: "91", correct: true }, { id: "b", label: "19", confusion: "digit-reversal" }, { id: "c", label: "81" }, { id: "d", label: "9" }] },
    { id: "num-numberRecognition-lvl2-b", subject: "numeracy", skill: "numberRecognition", topicIds: ["num-recognize-large"], difficulty: 3, type: "choice",
      prompt: "Tap the number 604", audioText: "Can you find the number six hundred four?",
      options: [{ id: "a", label: "604", correct: true }, { id: "b", label: "640", confusion: "digit-order" }, { id: "c", label: "614" }, { id: "d", label: "406" }] },

    // --- counting ---
    { id: "num-counting-lvl2-a", subject: "numeracy", skill: "counting", topicIds: ["count-to-20"], difficulty: 3, type: "numeric",
      prompt: `${stars(18)}  How many stars?`, audioText: "How many stars do you see?", correctAnswer: 18 },
    { id: "num-counting-lvl2-b", subject: "numeracy", skill: "counting", topicIds: ["count-to-20"], difficulty: 3, type: "numeric",
      prompt: `${stars(23)}  How many stars?`, audioText: "How many stars do you see?", correctAnswer: 23 },

    // --- addition ---
    { id: "num-addition-lvl2-a", subject: "numeracy", skill: "addition", topicIds: ["add-carrying"], difficulty: 3, type: "numeric",
      prompt: "68 + 25 = ?", audioText: "What is 68 plus 25?", operator: "+", operands: [68, 25], correctAnswer: 93, requiresCarry: true },
    { id: "num-addition-lvl2-b", subject: "numeracy", skill: "addition", topicIds: ["add-multi-digit"], difficulty: 3, type: "numeric",
      prompt: "247 + 386 = ?", audioText: "What is two hundred forty-seven plus three hundred eighty-six?", operator: "+", operands: [247, 386], correctAnswer: 633, requiresCarry: true },

    // --- subtraction ---
    { id: "num-subtraction-lvl2-a", subject: "numeracy", skill: "subtraction", topicIds: ["sub-borrowing"], difficulty: 3, type: "numeric",
      prompt: "82 − 47 = ?", audioText: "What is 82 minus 47?", operator: "-", operands: [82, 47], correctAnswer: 35, requiresBorrow: true },
    { id: "num-subtraction-lvl2-b", subject: "numeracy", skill: "subtraction", topicIds: ["sub-multi-digit", "sub-borrowing"], difficulty: 3, type: "numeric",
      prompt: "213 − 158 = ?", audioText: "What is two hundred thirteen minus one hundred fifty-eight?", operator: "-", operands: [213, 158], correctAnswer: 55, requiresBorrow: true },

    // --- multiplication ---
    { id: "num-multiplication-lvl2-a", subject: "numeracy", skill: "multiplication", topicIds: ["mult-times-tables-high"], difficulty: 3, type: "numeric",
      prompt: "8 × 9 = ?", audioText: "What is 8 times 9?", operator: "×", operands: [8, 9], correctAnswer: 72 },
    { id: "num-multiplication-lvl2-b", subject: "numeracy", skill: "multiplication", topicIds: ["mult-skip-counting"], difficulty: 3, type: "numeric",
      prompt: "6 × 7 = ?", audioText: "What is 6 times 7?", operator: "×", operands: [6, 7], correctAnswer: 42 },
  ],

  literacy: [
    // --- letterRecognition ---
    { id: "lit-letterRecognition-lvl2-a", subject: "literacy", skill: "letterRecognition", topicIds: ["letter-lowercase-reversals"], difficulty: 3, type: "choice",
      prompt: "Tap the letter q", audioText: "Can you find the lowercase letter q?",
      options: [{ id: "a", label: "p", confusion: "b-p-reversal" }, { id: "b", label: "b", confusion: "b-d-reversal" }, { id: "c", label: "q", correct: true }, { id: "d", label: "d" }] },
    { id: "lit-letterRecognition-lvl2-b", subject: "literacy", skill: "letterRecognition", topicIds: ["letter-lowercase-reversals"], difficulty: 3, type: "choice",
      prompt: "Tap the letter d", audioText: "Can you find the lowercase letter d?",
      options: [{ id: "a", label: "b", confusion: "b-d-reversal" }, { id: "b", label: "d", correct: true }, { id: "c", label: "p" }, { id: "d", label: "q" }] },

    // --- letterSounds ---
    { id: "lit-letterSounds-lvl2-a", subject: "literacy", skill: "letterSounds", topicIds: ["sound-digraphs"], difficulty: 3, type: "choice",
      prompt: "Which letters make this sound?", audioText: "Which letters make the sound ch, like in chip?",
      options: [{ id: "a", label: "ch", correct: true }, { id: "b", label: "sh", confusion: "sh-ch-confusion" }, { id: "c", label: "th" }, { id: "d", label: "wh" }] },
    { id: "lit-letterSounds-lvl2-b", subject: "literacy", skill: "letterSounds", topicIds: ["sound-single-letters"], difficulty: 3, type: "choice",
      prompt: "Which letter makes this sound?", audioText: "Which letter makes the sound duh, like in dog?",
      options: [{ id: "a", label: "D", correct: true }, { id: "b", label: "B", confusion: "b-d-sound-confusion" }, { id: "c", label: "T", confusion: "t-d-sound-confusion" }, { id: "d", label: "P" }] },

    // --- wordReading ---
    { id: "lit-wordReading-lvl2-a", subject: "literacy", skill: "wordReading", topicIds: ["word-complex"], difficulty: 3, type: "choice",
      prompt: "Tap the word that says KNOWLEDGE", audioText: "Find the word knowledge",
      options: [{ id: "a", label: "knowledge", correct: true }, { id: "b", label: "knowledgeable" }, { id: "c", label: "acknowledge" }, { id: "d", label: "known" }] },
    { id: "lit-wordReading-lvl2-b", subject: "literacy", skill: "wordReading", topicIds: ["word-blends"], difficulty: 3, type: "choice",
      prompt: "Tap the word that says STRENGTH", audioText: "Find the word strength",
      options: [{ id: "a", label: "strength", correct: true }, { id: "b", label: "straight" }, { id: "c", label: "stretch" }, { id: "d", label: "streak" }] },

    // --- sentenceReading ---
    { id: "lit-sentenceReading-lvl2-a", subject: "literacy", skill: "sentenceReading", topicIds: ["sentence-detail"], difficulty: 3, type: "choice",
      prompt: "Which sentence is this?", audioText: "The curious explorer carefully mapped the cave.",
      options: [{ id: "a", label: "The curious explorer carefully mapped the cave.", correct: true }, { id: "b", label: "The curious explorer carefully mapped the cove." }, { id: "c", label: "The curious explorer carelessly mapped the cave." }, { id: "d", label: "The curious explorer carefully mapped the cage." }] },
    { id: "lit-sentenceReading-lvl2-b", subject: "literacy", skill: "sentenceReading", topicIds: ["sentence-detail"], difficulty: 3, type: "choice",
      prompt: "Which sentence is this?", audioText: "Scientists discovered a surprising pattern in the data.",
      options: [{ id: "a", label: "Scientists discovered a surprising pattern in the data.", correct: true }, { id: "b", label: "Scientists discovered a surprising pattern in the date." }, { id: "c", label: "Scientists recovered a surprising pattern in the data." }, { id: "d", label: "Scientists discovered a surprising pattern in the plan." }] },

    // --- comprehension ---
    { id: "lit-comprehension-lvl2-a", subject: "literacy", skill: "comprehension", topicIds: ["comp-why"], difficulty: 3, type: "choice",
      prompt: "Why did the crops fail that year?", audioText: "The farmers hadn't rotated their crops in years, so the soil lost its nutrients and the harvest failed. Why did the crops fail that year?",
      options: [{ id: "a", label: "The soil lost its nutrients", correct: true }, { id: "b", label: "There wasn't enough rain" }, { id: "c", label: "The farmers planted too late" }, { id: "d", label: "Pests ate the crops" }] },
    { id: "lit-comprehension-lvl2-b", subject: "literacy", skill: "comprehension", topicIds: ["comp-why"], difficulty: 3, type: "choice",
      prompt: "Why was the bridge closed?", audioText: "Engineers found cracks in the bridge's supports during a routine inspection, so the city closed it until repairs were finished. Why was the bridge closed?",
      options: [{ id: "a", label: "Cracks were found in the supports", correct: true }, { id: "b", label: "There was too much traffic" }, { id: "c", label: "A storm was coming" }, { id: "d", label: "It was being repainted" }] },
  ],
};

export function getLevel2QuestionsForSkill(subject, skill) {
  return LEVEL2_QUESTION_BANK[subject].filter((q) => q.skill === skill);
}

export function getLevel2QuestionById(id) {
  return LEVEL2_QUESTION_BANK.literacy.find((q) => q.id === id) || LEVEL2_QUESTION_BANK.numeracy.find((q) => q.id === id);
}
