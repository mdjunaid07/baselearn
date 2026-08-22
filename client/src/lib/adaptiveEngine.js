// Pure, synchronous, dependency-free adaptive logic. No network calls, no LLM calls —
// this is the part of the app that has to be trustworthy and explainable on its own.
// Mirrored (unchanged) at client/src/lib/adaptiveEngine.js so the child's device can
// score answers and pick the next question with zero connectivity.

import { LITERACY_SKILLS, NUMERACY_SKILLS, getQuestionsForSkill } from "./questionBank.js";

export const DIFFICULTY = { EASY: 1, MEDIUM: 2, HARD: 3 };
const DIFFICULTY_NAME = { 1: "easy", 2: "medium", 3: "hard" };

const STEP_UP = { 1: 6, 2: 10, 3: 15 }; // score gain on a correct answer, by difficulty
const STEP_DOWN = { 1: 14, 2: 9, 3: 5 }; // score loss on a wrong answer, by difficulty

export const DEFAULT_SKILL_SCORE = 50;

export function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function skillsForSubject(subject) {
  return subject === "literacy" ? LITERACY_SKILLS : NUMERACY_SKILLS;
}

export function emptySkillProfile() {
  const fill = (skills) => Object.fromEntries(skills.map((s) => [s, DEFAULT_SKILL_SCORE]));
  return { literacy: fill(LITERACY_SKILLS), numeracy: fill(NUMERACY_SKILLS) };
}

/** One answer's effect on that skill's mastery score. */
export function updateSkillScore(currentScore, difficulty, isCorrect) {
  const delta = isCorrect ? STEP_UP[difficulty] : -STEP_DOWN[difficulty];
  return clamp(Math.round((currentScore ?? DEFAULT_SKILL_SCORE) + delta));
}

/** Applies a whole batch of attempts to a skill profile, in order, returning the new profile. */
export function applyAttemptsToProfile(profile, attempts) {
  const next = { literacy: { ...profile.literacy }, numeracy: { ...profile.numeracy } };
  for (const a of attempts) {
    const bucket = a.subject === "literacy" ? next.literacy : next.numeracy;
    bucket[a.skill] = updateSkillScore(bucket[a.skill], a.difficulty, a.correct);
  }
  return next;
}

/** Difficulty staircase for adaptive practice: 2-in-a-row correct steps up, 1 wrong steps down. */
export function nextDifficulty(currentDifficulty, recentResults) {
  const lastTwo = recentResults.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every(Boolean)) return Math.min(3, currentDifficulty + 1);
  if (recentResults.length && recentResults[recentResults.length - 1] === false) {
    if (lastTwo.length === 2 && lastTwo.every((r) => r === false)) return 1; // repeated miss -> reset to easy
    return Math.max(1, currentDifficulty - 1);
  }
  return currentDifficulty;
}

/** Starting difficulty for a practice session, based on current mastery of that skill. */
export function startingDifficulty(skillScore) {
  if (skillScore > 70) return DIFFICULTY.HARD;
  if (skillScore >= 40) return DIFFICULTY.MEDIUM;
  return DIFFICULTY.EASY;
}

/** True once the last two attempts (regardless of skill) were both wrong — the diagnostic's "stop and diagnose" trigger. */
export function hasRepeatedErrors(correctFlags) {
  return correctFlags.length >= 2 && correctFlags.slice(-2).every((c) => c === false);
}

/** Picks the lowest-scoring skill in a subject — used to choose what the Daily Rescue targets. */
export function pickWeakestSkill(skillProfile, subject) {
  const skills = skillsForSubject(subject);
  const bucket = subject === "literacy" ? skillProfile.literacy : skillProfile.numeracy;
  return skills.reduce((weakest, s) => ((bucket[s] ?? 50) < (bucket[weakest] ?? 50) ? s : weakest), skills[0]);
}

export function difficultyName(d) {
  return DIFFICULTY_NAME[d] ?? "medium";
}

/** Picks `count` questions for a skill, closest to `targetDifficulty` first. With only
 *  ~6 items per skill in this MVP bank, this favors the right difficulty band while
 *  still filling out a full session even when few items exist at the exact tier. */
export function selectPracticeQuestions(subject, skill, targetDifficulty, count = 5) {
  const pool = getQuestionsForSkill(subject, skill);
  const sorted = [...pool].sort((a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty));
  const selected = [];
  for (let i = 0; selected.length < count && pool.length > 0; i++) {
    selected.push(sorted[i % sorted.length]);
  }
  return selected;
}

/** Maps a 0-100 mastery score onto the app's "growth garden" visual metaphor —
 *  used by both the child-facing skill map (a plant that visibly grows) and the
 *  parent dashboard (same four tiers, described in plain language). Keeping this
 *  in one place means the two screens can never disagree about what "doing fine"
 *  means for a given score. */
export function masteryTier(score) {
  if (score >= 85) return { tier: "bloom", label: "Full Bloom" };
  if (score >= 60) return { tier: "sapling", label: "Sapling" };
  if (score >= 35) return { tier: "sprout", label: "Sprout" };
  return { tier: "seed", label: "Seedling" };
}

// ---------------------------------------------------------------------------
// Error-pattern detection (numeracy). Instead of just "wrong", we check whether
// the child's answer matches the *specific* wrong answer a known misconception
// produces, so the skill map can name the pattern, not just the percentage.
// ---------------------------------------------------------------------------

function digitsOf(n) {
  return String(Math.abs(n)).split("").map(Number).reverse(); // ones-first
}

/** What a child gets if they subtract column-by-column and ignore borrowing (e.g. |4-7| instead of borrowing). */
function naiveSubtractIgnoringBorrow(a, b) {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const len = Math.max(da.length, db.length);
  let result = "";
  for (let i = len - 1; i >= 0; i--) {
    const x = da[i] ?? 0;
    const y = db[i] ?? 0;
    result += Math.abs(x - y);
  }
  return Number(result);
}

/** What a child gets if they add column-by-column and drop the carry instead of carrying it. */
function naiveAddIgnoringCarry(a, b) {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const len = Math.max(da.length, db.length);
  let result = "";
  for (let i = len - 1; i >= 0; i--) {
    const x = da[i] ?? 0;
    const y = db[i] ?? 0;
    result += (x + y) % 10;
  }
  return Number(result);
}

/**
 * Returns a named error pattern for a wrong numeric answer, or null if the answer
 * doesn't match a known pattern (still logged as incorrect, just not categorized).
 */
export function detectMathErrorPattern(question, childAnswer) {
  if (childAnswer === question.correctAnswer) return null;
  const { operator, operands, requiresBorrow, requiresCarry } = question;

  if (operator === "-" && requiresBorrow && operands) {
    if (childAnswer === naiveSubtractIgnoringBorrow(operands[0], operands[1])) return "borrowing-error";
  }
  if (operator === "+" && requiresCarry && operands) {
    if (childAnswer === naiveAddIgnoringCarry(operands[0], operands[1])) return "carrying-error";
  }
  if (operator === "×" && operands) {
    const [a, b] = operands;
    if (childAnswer === a * (b - 1) || childAnswer === (a - 1) * b || childAnswer === a * (b + 1) || childAnswer === (a + 1) * b) {
      return "skip-counting-error";
    }
  }
  if (typeof question.correctAnswer === "number" && Math.abs(childAnswer - question.correctAnswer) === 1) {
    return "counting-slip";
  }
  return "unknown-error";
}

/** For literacy multiple-choice: the tapped option may carry a named `confusion` tag. */
export function detectChoiceErrorPattern(question, chosenOptionId) {
  const option = question.options?.find((o) => o.id === chosenOptionId);
  if (!option || option.correct) return null;
  return option.confusion ?? "unknown-error";
}

/** Scores one answered attempt end-to-end: correctness + error pattern, in the shape routes/services store. */
export function gradeAttempt(question, rawAnswer) {
  let correct;
  let errorPattern = null;
  if (question.type === "numeric") {
    const numericAnswer = Number(rawAnswer);
    correct = numericAnswer === question.correctAnswer;
    if (!correct) errorPattern = detectMathErrorPattern(question, numericAnswer);
  } else {
    correct = question.options.find((o) => o.id === rawAnswer)?.correct === true;
    if (!correct) errorPattern = detectChoiceErrorPattern(question, rawAnswer);
  }
  return { correct, errorPattern };
}
