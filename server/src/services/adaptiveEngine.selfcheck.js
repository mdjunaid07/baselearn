// Lightweight correctness check for the adaptive engine, no test framework needed.
// Run with: npm run selfcheck
import assert from "node:assert/strict";
import {
  updateSkillScore,
  nextDifficulty,
  startingDifficulty,
  hasRepeatedErrors,
  pickWeakestSkill,
  detectMathErrorPattern,
  detectChoiceErrorPattern,
  gradeAttempt,
} from "./adaptiveEngine.js";
import { getQuestionById } from "../data/questionBank.js";

// Scoring moves in the right direction and by the right amount.
assert.equal(updateSkillScore(50, 1, true), 56);
assert.equal(updateSkillScore(50, 3, true), 65);
assert.equal(updateSkillScore(50, 1, false), 36);
assert.equal(updateSkillScore(50, 3, false), 45);
assert.equal(updateSkillScore(95, 3, true), 100, "clamps at 100");
assert.equal(updateSkillScore(5, 1, false), 0, "clamps at 0");

// Difficulty staircase.
assert.equal(nextDifficulty(2, [true, true]), 3, "two correct steps up");
assert.equal(nextDifficulty(2, [true, false]), 1, "a miss steps down");
assert.equal(nextDifficulty(2, [false, false]), 1, "two misses in a row reset to easy");
assert.equal(startingDifficulty(80), 3);
assert.equal(startingDifficulty(55), 2);
assert.equal(startingDifficulty(20), 1);

// Repeated-error trigger (the diagnostic's "stop and diagnose" signal).
assert.equal(hasRepeatedErrors([true, false, false]), true);
assert.equal(hasRepeatedErrors([false, true]), false);

// Weakest-skill selection.
const profile = {
  literacy: { letterRecognition: 90, letterSounds: 80, wordReading: 65, sentenceReading: 40, comprehension: 30 },
  numeracy: { numberRecognition: 100, counting: 90, addition: 85, subtraction: 50, multiplication: 30 },
};
assert.equal(pickWeakestSkill(profile, "literacy"), "comprehension");
assert.equal(pickWeakestSkill(profile, "numeracy"), "multiplication");

// Borrowing error: 42 - 17, naive column subtraction ("smaller from larger" per column,
// ignoring the borrow) gives tens |4-1|=3, ones |2-7|=5 -> 35, instead of the correct 25.
assert.equal(detectMathErrorPattern(getQuestionById("num-subtraction-h1"), 35), "borrowing-error");
// Carrying error: 47 + 38, naive column addition dropping the carry gives (7+8)%10=5, (4+3)%10=7 -> 75.
assert.equal(detectMathErrorPattern(getQuestionById("num-addition-h1"), 75), "carrying-error");
// A correct answer is never flagged.
assert.equal(detectMathErrorPattern(getQuestionById("num-addition-h1"), 85), null);

// Choice confusion tags.
assert.equal(detectChoiceErrorPattern(getQuestionById("lit-letterRecognition-h1"), "a"), "b-d-reversal");
assert.equal(detectChoiceErrorPattern(getQuestionById("lit-letterRecognition-h1"), "b"), null);

// End-to-end grading.
const g1 = gradeAttempt(getQuestionById("num-subtraction-h1"), "35");
assert.equal(g1.correct, false);
assert.equal(g1.errorPattern, "borrowing-error");
const g2 = gradeAttempt(getQuestionById("num-subtraction-h1"), 25);
assert.equal(g2.correct, true);
assert.equal(g2.errorPattern, null);

console.log("✅ adaptiveEngine self-check passed (18 assertions)");
