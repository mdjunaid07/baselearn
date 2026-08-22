// Curriculum content for the Study Roadmap feature — authored, code-reviewed topic
// lists per skill, in the same "static config, not a DB collection" spirit as
// questionBank.js and SKILL_LABELS/ERROR_PATTERN_LABELS. Per-student *progress*
// through these topics lives in Mongo (see models/StudentRoadmap.js); the topics
// themselves are versioned code, not user data.
//
// Each topic: { id, label, difficulty (1-3, fallback ordering when no error-pattern
// signal exists yet), errorPatterns: [] } — errorPatterns references keys from
// ERROR_PATTERN_LABELS in data/questionBank.js, so a topic can be tied to the exact
// mistake pattern real attempts are already tagged with.
export const ROADMAP_TOPICS = {
  numeracy: {
    numberRecognition: [
      { id: "num-recognize-single", label: "Recognizing single-digit numbers", difficulty: 1, errorPatterns: [] },
      { id: "num-recognize-teens", label: "Two-digit numbers and digit order", difficulty: 2, errorPatterns: ["digit-reversal", "6-9-reversal"] },
      { id: "num-recognize-large", label: "Three-digit numbers and digit order", difficulty: 3, errorPatterns: ["digit-order"] },
    ],
    counting: [
      { id: "count-to-10", label: "Counting to 10", difficulty: 1, errorPatterns: ["counting-slip"] },
      { id: "count-to-20", label: "Counting to 20 and beyond", difficulty: 2, errorPatterns: ["counting-slip"] },
    ],
    addition: [
      { id: "add-single-digit", label: "Single-digit addition (no carrying)", difficulty: 1, errorPatterns: [] },
      { id: "add-carrying", label: "Carrying when adding two-digit numbers", difficulty: 2, errorPatterns: ["carrying-error"] },
      { id: "add-multi-digit", label: "Adding larger numbers", difficulty: 3, errorPatterns: ["carrying-error"] },
    ],
    subtraction: [
      { id: "sub-single-digit", label: "Single-digit subtraction (no borrowing)", difficulty: 1, errorPatterns: [] },
      { id: "sub-borrowing", label: "Borrowing when subtracting two-digit numbers", difficulty: 2, errorPatterns: ["borrowing-error"] },
      { id: "sub-multi-digit", label: "Subtracting larger numbers", difficulty: 3, errorPatterns: ["borrowing-error"] },
    ],
    multiplication: [
      { id: "mult-times-tables-low", label: "Times tables (2-5)", difficulty: 1, errorPatterns: [] },
      { id: "mult-skip-counting", label: "Skip-counting accuracy", difficulty: 2, errorPatterns: ["skip-counting-error"] },
      { id: "mult-times-tables-high", label: "Times tables (6-9)", difficulty: 3, errorPatterns: ["skip-counting-error"] },
    ],
  },
  literacy: {
    letterRecognition: [
      { id: "letter-uppercase", label: "Uppercase letter recognition", difficulty: 1, errorPatterns: ["m-n-confusion"] },
      { id: "letter-lowercase-reversals", label: "Lowercase letters that look similar (b/d/p/q)", difficulty: 2, errorPatterns: ["b-d-reversal", "p-q-reversal", "b-p-reversal"] },
    ],
    letterSounds: [
      { id: "sound-single-letters", label: "Single letter sounds", difficulty: 1, errorPatterns: ["b-d-sound-confusion", "t-d-sound-confusion"] },
      { id: "sound-digraphs", label: "Two-letter sounds (th, sh, ch)", difficulty: 2, errorPatterns: ["sh-ch-confusion"] },
    ],
    wordReading: [
      { id: "word-simple", label: "Short, simple words", difficulty: 1, errorPatterns: [] },
      { id: "word-blends", label: "Words with letter blends", difficulty: 2, errorPatterns: [] },
      { id: "word-complex", label: "Longer, less common words", difficulty: 3, errorPatterns: [] },
    ],
    sentenceReading: [
      { id: "sentence-short", label: "Short, simple sentences", difficulty: 1, errorPatterns: [] },
      { id: "sentence-detail", label: "Sentences with small word differences", difficulty: 2, errorPatterns: [] },
    ],
    comprehension: [
      { id: "comp-literal", label: "Answering directly-stated facts", difficulty: 1, errorPatterns: [] },
      { id: "comp-why", label: "Understanding reasons and cause/effect", difficulty: 2, errorPatterns: [] },
    ],
  },
};

export function getRoadmapTopics(subject, skill) {
  return ROADMAP_TOPICS[subject]?.[skill] ?? [];
}

export function getRoadmapTopic(subject, skill, topicId) {
  return getRoadmapTopics(subject, skill).find((t) => t.id === topicId) ?? null;
}
