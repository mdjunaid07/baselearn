// Full question bank for both subjects. This file is intentionally framework-free
// (plain data + one repeat() call) so it can be imported unchanged by the client too —
// see client/src/lib/questionBank.js, which mirrors this file for offline bundling.
//
// difficulty: 1 = easy, 2 = medium, 3 = hard
// type: 'choice' (tap an option) | 'numeric' (type a number on the keypad)
// `confusion` on a choice option marks a *specific* commonly-confused distractor,
// so picking it logs a named error pattern instead of generic "incorrect".

const apples = (n) => "🍎".repeat(n);
const stars = (n) => "⭐".repeat(n);

export const QUESTION_BANK = {
  literacy: [
    // --- letterRecognition ---
    { id: "lit-letterRecognition-e1", subject: "literacy", skill: "letterRecognition", difficulty: 1, type: "choice",
      prompt: "Tap the letter S", audioText: "Can you find the letter S?",
      options: [{ id: "a", label: "S", correct: true }, { id: "b", label: "Z" }, { id: "c", label: "E" }, { id: "d", label: "T" }] },
    { id: "lit-letterRecognition-e2", subject: "literacy", skill: "letterRecognition", difficulty: 1, type: "choice",
      prompt: "Tap the letter A", audioText: "Can you find the letter A?",
      options: [{ id: "a", label: "A", correct: true }, { id: "b", label: "V" }, { id: "c", label: "H" }, { id: "d", label: "K" }] },
    { id: "lit-letterRecognition-m1", subject: "literacy", skill: "letterRecognition", difficulty: 2, type: "choice",
      prompt: "Tap the letter M", audioText: "Can you find the letter M?",
      options: [{ id: "a", label: "M", correct: true }, { id: "b", label: "N", confusion: "m-n-confusion" }, { id: "c", label: "W" }, { id: "d", label: "E" }] },
    { id: "lit-letterRecognition-m2", subject: "literacy", skill: "letterRecognition", difficulty: 2, type: "choice",
      prompt: "Tap the letter C", audioText: "Can you find the letter C?",
      options: [{ id: "a", label: "C", correct: true }, { id: "b", label: "G" }, { id: "c", label: "O" }, { id: "d", label: "Q" }] },
    { id: "lit-letterRecognition-h1", subject: "literacy", skill: "letterRecognition", difficulty: 3, type: "choice",
      prompt: "Tap the letter b", audioText: "Can you find the lowercase letter b?",
      options: [{ id: "a", label: "d", confusion: "b-d-reversal" }, { id: "b", label: "b", correct: true }, { id: "c", label: "p", confusion: "b-p-reversal" }, { id: "d", label: "q" }] },
    { id: "lit-letterRecognition-h2", subject: "literacy", skill: "letterRecognition", difficulty: 3, type: "choice",
      prompt: "Tap the letter p", audioText: "Can you find the lowercase letter p?",
      options: [{ id: "a", label: "p", correct: true }, { id: "b", label: "q", confusion: "p-q-reversal" }, { id: "c", label: "b", confusion: "b-p-reversal" }, { id: "d", label: "d" }] },

    // --- letterSounds ---
    { id: "lit-letterSounds-e1", subject: "literacy", skill: "letterSounds", difficulty: 1, type: "choice",
      prompt: "Which letter makes this sound?", audioText: "Which letter makes the sound mmm, like in moon?",
      options: [{ id: "a", label: "M", correct: true }, { id: "b", label: "N" }, { id: "c", label: "W" }, { id: "d", label: "H" }] },
    { id: "lit-letterSounds-e2", subject: "literacy", skill: "letterSounds", difficulty: 1, type: "choice",
      prompt: "Which letter makes this sound?", audioText: "Which letter makes the sound sss, like in sun?",
      options: [{ id: "a", label: "S", correct: true }, { id: "b", label: "Z" }, { id: "c", label: "C" }, { id: "d", label: "X" }] },
    { id: "lit-letterSounds-m1", subject: "literacy", skill: "letterSounds", difficulty: 2, type: "choice",
      prompt: "Which letter makes this sound?", audioText: "Which letter makes the sound buh, like in ball?",
      options: [{ id: "a", label: "B", correct: true }, { id: "b", label: "D", confusion: "b-d-sound-confusion" }, { id: "c", label: "P" }, { id: "d", label: "T" }] },
    { id: "lit-letterSounds-m2", subject: "literacy", skill: "letterSounds", difficulty: 2, type: "choice",
      prompt: "Which letter makes this sound?", audioText: "Which letter makes the sound tuh, like in top?",
      options: [{ id: "a", label: "T", correct: true }, { id: "b", label: "D", confusion: "t-d-sound-confusion" }, { id: "c", label: "P" }, { id: "d", label: "K" }] },
    { id: "lit-letterSounds-h1", subject: "literacy", skill: "letterSounds", difficulty: 3, type: "choice",
      prompt: "Which letters make this sound?", audioText: "Which letters make the sound th, like in thumb?",
      options: [{ id: "a", label: "th", correct: true }, { id: "b", label: "f" }, { id: "c", label: "s" }, { id: "d", label: "sh" }] },
    { id: "lit-letterSounds-h2", subject: "literacy", skill: "letterSounds", difficulty: 3, type: "choice",
      prompt: "Which letters make this sound?", audioText: "Which letters make the sound sh, like in ship?",
      options: [{ id: "a", label: "sh", correct: true }, { id: "b", label: "ch", confusion: "sh-ch-confusion" }, { id: "c", label: "s" }, { id: "d", label: "th" }] },

    // --- wordReading ---
    { id: "lit-wordReading-e1", subject: "literacy", skill: "wordReading", difficulty: 1, type: "choice",
      prompt: "Tap the word that says CAT", audioText: "Find the word cat",
      options: [{ id: "a", label: "cat", correct: true }, { id: "b", label: "can" }, { id: "c", label: "cot" }, { id: "d", label: "hat" }] },
    { id: "lit-wordReading-e2", subject: "literacy", skill: "wordReading", difficulty: 1, type: "choice",
      prompt: "Tap the word that says SUN", audioText: "Find the word sun",
      options: [{ id: "a", label: "sun", correct: true }, { id: "b", label: "fun" }, { id: "c", label: "sum" }, { id: "d", label: "bun" }] },
    { id: "lit-wordReading-m1", subject: "literacy", skill: "wordReading", difficulty: 2, type: "choice",
      prompt: "Tap the word that says SHIP", audioText: "Find the word ship",
      options: [{ id: "a", label: "ship", correct: true }, { id: "b", label: "chip" }, { id: "c", label: "shop" }, { id: "d", label: "slip" }] },
    { id: "lit-wordReading-m2", subject: "literacy", skill: "wordReading", difficulty: 2, type: "choice",
      prompt: "Tap the word that says PLAY", audioText: "Find the word play",
      options: [{ id: "a", label: "play", correct: true }, { id: "b", label: "pray" }, { id: "c", label: "clay" }, { id: "d", label: "tray" }] },
    { id: "lit-wordReading-h1", subject: "literacy", skill: "wordReading", difficulty: 3, type: "choice",
      prompt: "Tap the word that says THOUGHT", audioText: "Find the word thought",
      options: [{ id: "a", label: "thought", correct: true }, { id: "b", label: "through" }, { id: "c", label: "though" }, { id: "d", label: "taught" }] },
    { id: "lit-wordReading-h2", subject: "literacy", skill: "wordReading", difficulty: 3, type: "choice",
      prompt: "Tap the word that says FRIEND", audioText: "Find the word friend",
      options: [{ id: "a", label: "friend", correct: true }, { id: "b", label: "fiend" }, { id: "c", label: "fried" }, { id: "d", label: "fend" }] },

    // --- sentenceReading (decoding fluency: pick the sentence that was actually read) ---
    { id: "lit-sentenceReading-e1", subject: "literacy", skill: "sentenceReading", difficulty: 1, type: "choice",
      prompt: "Which sentence is this?", audioText: "I see a cat.",
      options: [{ id: "a", label: "I see a cat.", correct: true }, { id: "b", label: "I see a can." }, { id: "c", label: "I saw a cat." }, { id: "d", label: "I see a bat." }] },
    { id: "lit-sentenceReading-e2", subject: "literacy", skill: "sentenceReading", difficulty: 1, type: "choice",
      prompt: "Which sentence is this?", audioText: "The sun is hot.",
      options: [{ id: "a", label: "The sun is hot.", correct: true }, { id: "b", label: "The sun is not." }, { id: "c", label: "The fun is hot." }, { id: "d", label: "The sun is hop." }] },
    { id: "lit-sentenceReading-m1", subject: "literacy", skill: "sentenceReading", difficulty: 2, type: "choice",
      prompt: "Which sentence is this?", audioText: "She runs to the park.",
      options: [{ id: "a", label: "She runs to the park.", correct: true }, { id: "b", label: "She runs to the part." }, { id: "c", label: "She ran to the park." }, { id: "d", label: "He runs to the park." }] },
    { id: "lit-sentenceReading-m2", subject: "literacy", skill: "sentenceReading", difficulty: 2, type: "choice",
      prompt: "Which sentence is this?", audioText: "We play in the rain.",
      options: [{ id: "a", label: "We play in the rain.", correct: true }, { id: "b", label: "We pray in the rain." }, { id: "c", label: "We play in the train." }, { id: "d", label: "We stay in the rain." }] },
    { id: "lit-sentenceReading-h1", subject: "literacy", skill: "sentenceReading", difficulty: 3, type: "choice",
      prompt: "Which sentence is this?", audioText: "The brown fox jumps quickly.",
      options: [{ id: "a", label: "The brown fox jumps quickly.", correct: true }, { id: "b", label: "The brown fox jumps quietly." }, { id: "c", label: "The brown box jumps quickly." }, { id: "d", label: "The brown fox jumped quickly." }] },
    { id: "lit-sentenceReading-h2", subject: "literacy", skill: "sentenceReading", difficulty: 3, type: "choice",
      prompt: "Which sentence is this?", audioText: "Practice makes learning easier.",
      options: [{ id: "a", label: "Practice makes learning easier.", correct: true }, { id: "b", label: "Practice makes reading easier." }, { id: "c", label: "Practice makes learning easiest." }, { id: "d", label: "Practice makes running easier." }] },

    // --- comprehension (understand meaning, not just decode) ---
    { id: "lit-comprehension-e1", subject: "literacy", skill: "comprehension", difficulty: 1, type: "choice",
      prompt: "What color is the ball?", audioText: "Max has a red ball. He kicks the ball. What color is the ball?",
      options: [{ id: "a", label: "Red", correct: true }, { id: "b", label: "Blue" }, { id: "c", label: "Green" }, { id: "d", label: "Yellow" }] },
    { id: "lit-comprehension-e2", subject: "literacy", skill: "comprehension", difficulty: 1, type: "choice",
      prompt: "What does the cat like?", audioText: "Mia has a pet cat. The cat likes milk. What does the cat like?",
      options: [{ id: "a", label: "Milk", correct: true }, { id: "b", label: "Juice" }, { id: "c", label: "Water" }, { id: "d", label: "Tea" }] },
    { id: "lit-comprehension-m1", subject: "literacy", skill: "comprehension", difficulty: 2, type: "choice",
      prompt: "Why did Sam eat an apple?", audioText: "Sam was hungry. He ate an apple and felt better. Why did Sam eat an apple?",
      options: [{ id: "a", label: "He was hungry", correct: true }, { id: "b", label: "He was tired" }, { id: "c", label: "He was cold" }, { id: "d", label: "He was bored" }] },
    { id: "lit-comprehension-m2", subject: "literacy", skill: "comprehension", difficulty: 2, type: "choice",
      prompt: "Why did Ben grab an umbrella?", audioText: "It started to rain, so Ben grabbed his umbrella before leaving. Why did Ben grab an umbrella?",
      options: [{ id: "a", label: "Because it was raining", correct: true }, { id: "b", label: "Because it was sunny" }, { id: "c", label: "Because he was cold" }, { id: "d", label: "Because he lost it" }] },
    { id: "lit-comprehension-h1", subject: "literacy", skill: "comprehension", difficulty: 3, type: "choice",
      prompt: "Why could Zara play the song well?", audioText: "Zara practiced piano every day. After a month, she could play her favorite song perfectly. Why could Zara play the song well?",
      options: [{ id: "a", label: "She practiced every day", correct: true }, { id: "b", label: "She got a new piano" }, { id: "c", label: "Her teacher played it for her" }, { id: "d", label: "It was an easy song" }] },
    { id: "lit-comprehension-h2", subject: "literacy", skill: "comprehension", difficulty: 3, type: "choice",
      prompt: "What helped the plants?", audioText: "The garden was dry, so the plants started to wilt until Noah watered them each morning. What helped the plants?",
      options: [{ id: "a", label: "Noah watering them", correct: true }, { id: "b", label: "More sunlight" }, { id: "c", label: "New soil" }, { id: "d", label: "Cutting the leaves" }] },
  ],

  numeracy: [
    // --- numberRecognition ---
    { id: "num-numberRecognition-e1", subject: "numeracy", skill: "numberRecognition", difficulty: 1, type: "choice",
      prompt: "Tap the number 5", audioText: "Can you find the number 5?",
      options: [{ id: "a", label: "5", correct: true }, { id: "b", label: "2" }, { id: "c", label: "8" }, { id: "d", label: "3" }] },
    { id: "num-numberRecognition-e2", subject: "numeracy", skill: "numberRecognition", difficulty: 1, type: "choice",
      prompt: "Tap the number 9", audioText: "Can you find the number 9?",
      options: [{ id: "a", label: "9", correct: true }, { id: "b", label: "6", confusion: "6-9-reversal" }, { id: "c", label: "3" }, { id: "d", label: "1" }] },
    { id: "num-numberRecognition-m1", subject: "numeracy", skill: "numberRecognition", difficulty: 2, type: "choice",
      prompt: "Tap the number 12", audioText: "Can you find the number 12?",
      options: [{ id: "a", label: "12", correct: true }, { id: "b", label: "21", confusion: "digit-reversal" }, { id: "c", label: "13" }, { id: "d", label: "10" }] },
    { id: "num-numberRecognition-m2", subject: "numeracy", skill: "numberRecognition", difficulty: 2, type: "choice",
      prompt: "Tap the number 47", audioText: "Can you find the number 47?",
      options: [{ id: "a", label: "47", correct: true }, { id: "b", label: "74", confusion: "digit-reversal" }, { id: "c", label: "48" }, { id: "d", label: "37" }] },
    { id: "num-numberRecognition-h1", subject: "numeracy", skill: "numberRecognition", difficulty: 3, type: "choice",
      prompt: "Tap the number 108", audioText: "Can you find the number one hundred eight?",
      options: [{ id: "a", label: "108", correct: true }, { id: "b", label: "180", confusion: "digit-order" }, { id: "c", label: "118" }, { id: "d", label: "100" }] },
    { id: "num-numberRecognition-h2", subject: "numeracy", skill: "numberRecognition", difficulty: 3, type: "choice",
      prompt: "Tap the number 356", audioText: "Can you find the number three hundred fifty-six?",
      options: [{ id: "a", label: "356", correct: true }, { id: "b", label: "365", confusion: "digit-order" }, { id: "c", label: "346" }, { id: "d", label: "456" }] },

    // --- counting ---
    { id: "num-counting-e1", subject: "numeracy", skill: "counting", difficulty: 1, type: "numeric",
      prompt: `${apples(3)}  How many apples?`, audioText: "How many apples do you see?", correctAnswer: 3 },
    { id: "num-counting-e2", subject: "numeracy", skill: "counting", difficulty: 1, type: "numeric",
      prompt: `${stars(5)}  How many stars?`, audioText: "How many stars do you see?", correctAnswer: 5 },
    { id: "num-counting-m1", subject: "numeracy", skill: "counting", difficulty: 2, type: "numeric",
      prompt: `${apples(7)}  How many apples?`, audioText: "How many apples do you see?", correctAnswer: 7 },
    { id: "num-counting-m2", subject: "numeracy", skill: "counting", difficulty: 2, type: "numeric",
      prompt: `${stars(9)}  How many stars?`, audioText: "How many stars do you see?", correctAnswer: 9 },
    { id: "num-counting-h1", subject: "numeracy", skill: "counting", difficulty: 3, type: "numeric",
      prompt: `${apples(14)}  How many apples?`, audioText: "How many apples do you see?", correctAnswer: 14 },
    { id: "num-counting-h2", subject: "numeracy", skill: "counting", difficulty: 3, type: "numeric",
      prompt: `${stars(17)}  How many stars?`, audioText: "How many stars do you see?", correctAnswer: 17 },

    // --- addition ---
    { id: "num-addition-e1", subject: "numeracy", skill: "addition", difficulty: 1, type: "numeric",
      prompt: "3 + 4 = ?", audioText: "What is 3 plus 4?", operator: "+", operands: [3, 4], correctAnswer: 7, requiresCarry: false },
    { id: "num-addition-e2", subject: "numeracy", skill: "addition", difficulty: 1, type: "numeric",
      prompt: "2 + 6 = ?", audioText: "What is 2 plus 6?", operator: "+", operands: [2, 6], correctAnswer: 8, requiresCarry: false },
    { id: "num-addition-m1", subject: "numeracy", skill: "addition", difficulty: 2, type: "numeric",
      prompt: "23 + 15 = ?", audioText: "What is 23 plus 15?", operator: "+", operands: [23, 15], correctAnswer: 38, requiresCarry: false },
    { id: "num-addition-m2", subject: "numeracy", skill: "addition", difficulty: 2, type: "numeric",
      prompt: "8 + 7 = ?", audioText: "What is 8 plus 7?", operator: "+", operands: [8, 7], correctAnswer: 15, requiresCarry: true },
    { id: "num-addition-h1", subject: "numeracy", skill: "addition", difficulty: 3, type: "numeric",
      prompt: "47 + 38 = ?", audioText: "What is 47 plus 38?", operator: "+", operands: [47, 38], correctAnswer: 85, requiresCarry: true },
    { id: "num-addition-h2", subject: "numeracy", skill: "addition", difficulty: 3, type: "numeric",
      prompt: "56 + 29 = ?", audioText: "What is 56 plus 29?", operator: "+", operands: [56, 29], correctAnswer: 85, requiresCarry: true },

    // --- subtraction ---
    { id: "num-subtraction-e1", subject: "numeracy", skill: "subtraction", difficulty: 1, type: "numeric",
      prompt: "8 − 3 = ?", audioText: "What is 8 minus 3?", operator: "-", operands: [8, 3], correctAnswer: 5, requiresBorrow: false },
    { id: "num-subtraction-e2", subject: "numeracy", skill: "subtraction", difficulty: 1, type: "numeric",
      prompt: "7 − 2 = ?", audioText: "What is 7 minus 2?", operator: "-", operands: [7, 2], correctAnswer: 5, requiresBorrow: false },
    { id: "num-subtraction-m1", subject: "numeracy", skill: "subtraction", difficulty: 2, type: "numeric",
      prompt: "24 − 13 = ?", audioText: "What is 24 minus 13?", operator: "-", operands: [24, 13], correctAnswer: 11, requiresBorrow: false },
    { id: "num-subtraction-m2", subject: "numeracy", skill: "subtraction", difficulty: 2, type: "numeric",
      prompt: "32 − 15 = ?", audioText: "What is 32 minus 15?", operator: "-", operands: [32, 15], correctAnswer: 17, requiresBorrow: true },
    { id: "num-subtraction-h1", subject: "numeracy", skill: "subtraction", difficulty: 3, type: "numeric",
      prompt: "42 − 17 = ?", audioText: "What is 42 minus 17?", operator: "-", operands: [42, 17], correctAnswer: 25, requiresBorrow: true },
    { id: "num-subtraction-h2", subject: "numeracy", skill: "subtraction", difficulty: 3, type: "numeric",
      prompt: "61 − 38 = ?", audioText: "What is 61 minus 38?", operator: "-", operands: [61, 38], correctAnswer: 23, requiresBorrow: true },

    // --- multiplication ---
    { id: "num-multiplication-e1", subject: "numeracy", skill: "multiplication", difficulty: 1, type: "numeric",
      prompt: "2 × 3 = ?", audioText: "What is 2 times 3?", operator: "×", operands: [2, 3], correctAnswer: 6 },
    { id: "num-multiplication-e2", subject: "numeracy", skill: "multiplication", difficulty: 1, type: "numeric",
      prompt: "5 × 2 = ?", audioText: "What is 5 times 2?", operator: "×", operands: [5, 2], correctAnswer: 10 },
    { id: "num-multiplication-m1", subject: "numeracy", skill: "multiplication", difficulty: 2, type: "numeric",
      prompt: "4 × 6 = ?", audioText: "What is 4 times 6?", operator: "×", operands: [4, 6], correctAnswer: 24 },
    { id: "num-multiplication-m2", subject: "numeracy", skill: "multiplication", difficulty: 2, type: "numeric",
      prompt: "7 × 3 = ?", audioText: "What is 7 times 3?", operator: "×", operands: [7, 3], correctAnswer: 21 },
    { id: "num-multiplication-h1", subject: "numeracy", skill: "multiplication", difficulty: 3, type: "numeric",
      prompt: "8 × 7 = ?", audioText: "What is 8 times 7?", operator: "×", operands: [8, 7], correctAnswer: 56 },
    { id: "num-multiplication-h2", subject: "numeracy", skill: "multiplication", difficulty: 3, type: "numeric",
      prompt: "9 × 6 = ?", audioText: "What is 9 times 6?", operator: "×", operands: [9, 6], correctAnswer: 54 },
  ],
};

export const LITERACY_SKILLS = ["letterRecognition", "letterSounds", "wordReading", "sentenceReading", "comprehension"];
export const NUMERACY_SKILLS = ["numberRecognition", "counting", "addition", "subtraction", "multiplication"];

// Shared display names, so every screen and the parent dashboard describe skills the same way.
export const SKILL_LABELS = {
  letterRecognition: "Letter Recognition",
  letterSounds: "Letter Sounds",
  wordReading: "Word Reading",
  sentenceReading: "Sentence Reading",
  comprehension: "Comprehension",
  numberRecognition: "Number Recognition",
  counting: "Counting",
  addition: "Addition",
  subtraction: "Subtraction",
  multiplication: "Multiplication",
};

export const ERROR_PATTERN_LABELS = {
  "borrowing-error": "Mixing up borrowing when subtracting",
  "carrying-error": "Missing the carry when adding",
  "skip-counting-error": "Off by one group when multiplying",
  "counting-slip": "Off by one while counting",
  "b-d-reversal": "Mixing up b and d",
  "p-q-reversal": "Mixing up p and q",
  "b-p-reversal": "Mixing up b and p",
  "m-n-confusion": "Mixing up m and n",
  "6-9-reversal": "Mixing up 6 and 9",
  "digit-reversal": "Reversing the digit order",
  "digit-order": "Mixing up digit order in bigger numbers",
  "b-d-sound-confusion": "Mixing up the b and d sounds",
  "t-d-sound-confusion": "Mixing up the t and d sounds",
  "sh-ch-confusion": "Mixing up the sh and ch sounds",
  "unknown-error": "Still practicing this one",
};

export function getQuestionsForSkill(subject, skill) {
  return QUESTION_BANK[subject].filter((q) => q.skill === skill);
}

export function getQuestionById(id) {
  return QUESTION_BANK.literacy.find((q) => q.id === id) || QUESTION_BANK.numeracy.find((q) => q.id === id);
}
