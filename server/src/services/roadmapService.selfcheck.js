// Lightweight correctness check for the Study Roadmap feature, no test framework
// needed, no Mongo required (isMongoConnected() is false with no connectDatabase()
// call, so repository.js routes everything through inMemoryStore.js).
// Run with: npm run selfcheck:roadmap
import assert from "node:assert/strict";
import * as repo from "./repository.js";
import { reset } from "./inMemoryStore.js";
import {
  assignOrUpdateRoadmap,
  assignRoadmapsForWeakSkills,
  setTopicStatus,
  recordLevel2Result,
  eligibleForLevel2,
  needsAttention,
  hydrateRoadmap,
} from "./roadmapService.js";

const STUDENT = "selfcheck-student";

function makeAttempt(skill, errorPattern) {
  return { studentId: STUDENT, subject: "numeracy", skill, correct: false, errorPattern };
}

reset();

// --- Assignment prioritizes topics tied to the error pattern actually detected ---
const borrowingAttempts = [
  makeAttempt("subtraction", "borrowing-error"),
  makeAttempt("subtraction", "borrowing-error"),
  makeAttempt("subtraction", "unknown-error"), // must not be treated as a real pattern
];
let roadmap = await assignOrUpdateRoadmap(STUDENT, "numeracy", "subtraction", borrowingAttempts);
assert.deepEqual(roadmap.topicOrder, ["sub-borrowing", "sub-multi-digit", "sub-single-digit"],
  "borrowing-tagged topics rank first (tiebreak: easier first); no-pattern topic ranks last");
assert.deepEqual(roadmap.completedTopics, []);
assert.equal(roadmap.level, 1);

// --- assignRoadmapsForWeakSkills only touches skills actually below the weak threshold ---
const profile = {
  literacy: {},
  numeracy: { numberRecognition: 50, counting: 50, addition: 80, subtraction: 40, multiplication: 50 },
};
await assignRoadmapsForWeakSkills(STUDENT, "numeracy", profile, borrowingAttempts);
assert.equal(await repo.getStudentRoadmap(STUDENT, "numeracy", "addition"), null, "addition (score 80) is not weak — no roadmap created");
assert.notEqual(await repo.getStudentRoadmap(STUDENT, "numeracy", "subtraction"), null, "subtraction (score 40, actually tested) — roadmap exists");
// numberRecognition/counting/multiplication are all sitting at the untested default
// (50), which is < the weak threshold (60) too — but nothing has confirmed a real
// weakness there (no attempts this batch, no attempt history at all for a fresh
// student), so they must NOT get a roadmap just for being untouched.
assert.equal(await repo.getStudentRoadmap(STUDENT, "numeracy", "numberRecognition"), null, "untested default score is not treated as a real weakness");
assert.equal(await repo.getStudentRoadmap(STUDENT, "numeracy", "counting"), null, "untested default score is not treated as a real weakness");
assert.equal(await repo.getStudentRoadmap(STUDENT, "numeracy", "multiplication"), null, "untested default score is not treated as a real weakness");

// A weak skill with genuine PRIOR attempt history (not in the current submission
// batch at all) must still get a roadmap — "tested" means real history exists,
// not just "was part of today's submission."
await repo.logAttempts([{ studentId: STUDENT, sessionId: "prior-session", subject: "numeracy", skill: "counting", questionId: "num-counting-e1", difficulty: 1, answer: 2, correct: false, errorPattern: "counting-slip", createdAt: new Date().toISOString() }]);
await assignRoadmapsForWeakSkills(STUDENT, "numeracy", profile, borrowingAttempts); // counting still isn't in this batch
assert.notEqual(await repo.getStudentRoadmap(STUDENT, "numeracy", "counting"), null, "prior attempt history (even outside this batch) counts as tested");

// --- Marking topics complete recalculates Level 2 eligibility ---
let result = await setTopicStatus(STUDENT, "numeracy", "subtraction", "sub-borrowing", true);
assert.equal(result.eligibleForLevel2, false, "1 of 3 topics done — not yet eligible");

result = await setTopicStatus(STUDENT, "numeracy", "subtraction", "sub-multi-digit", true);
assert.equal(result.eligibleForLevel2, false, "2 of 3 topics done — still not eligible");

result = await setTopicStatus(STUDENT, "numeracy", "subtraction", "sub-single-digit", true);
assert.equal(result.eligibleForLevel2, true, "all 3 topics done — now eligible");
assert.equal(eligibleForLevel2(result.roadmap), true, "eligibleForLevel2() agrees with the endpoint result");

// --- Marking a topic not in the roadmap is rejected ---
await assert.rejects(
  () => setTopicStatus(STUDENT, "numeracy", "subtraction", "not-a-real-topic", true),
  (err) => err.status === 400,
  "unknown topicId is a 400, not a silent no-op"
);

// --- Level 2 fail reopens only the missed topics, not the whole roadmap ---
roadmap = await recordLevel2Result(STUDENT, "numeracy", "subtraction", false, ["sub-borrowing"]);
assert.deepEqual(roadmap.completedTopics.sort(), ["sub-multi-digit", "sub-single-digit"],
  "only the missed topic was reopened");
assert.equal(roadmap.level, 1, "a fail does not level up");
assert.equal(roadmap.level2Attempts.length, 1);
assert.equal(roadmap.level2Attempts[0].passed, false);
assert.equal(eligibleForLevel2(roadmap), false, "reopening a topic drops eligibility again");

// --- Server-side enforcement: can't attempt Level 2 again while a topic is still
//     reopened, even though nothing client-side is being trusted to hide the button ---
await assert.rejects(
  () => recordLevel2Result(STUDENT, "numeracy", "subtraction", true),
  (err) => err.status === 403,
  "not eligible (a reopened topic is still incomplete) -> 403, not a silent pass"
);

// Re-complete the reopened topic — the realistic path back to eligibility.
await setTopicStatus(STUDENT, "numeracy", "subtraction", "sub-borrowing", true);

// --- Level 2 pass levels the skill up ---
roadmap = await recordLevel2Result(STUDENT, "numeracy", "subtraction", true);
assert.equal(roadmap.level, 2);
assert.equal(roadmap.level2Attempts.length, 2);
assert.equal(roadmap.level2Attempts[1].passed, true);

// --- A leveled-up (level 2) skill is terminal: further weak-skill reassignment is a no-op ---
const unchanged = await assignOrUpdateRoadmap(STUDENT, "numeracy", "subtraction", borrowingAttempts);
assert.equal(unchanged.level, 2);
assert.deepEqual(unchanged.completedTopics.sort(), ["sub-borrowing", "sub-multi-digit", "sub-single-digit"], "not reprocessed once leveled up");

// --- Server-side enforcement: can't attempt Level 2 again once already at Level 2 ---
await assert.rejects(
  () => recordLevel2Result(STUDENT, "numeracy", "subtraction", true),
  (err) => err.status === 409,
  "already level 2 -> 409, not re-recorded"
);

// --- Acting on a skill with no roadmap yet fails clearly rather than silently ---
// (literacy/comprehension was never touched by any assignment call above.)
await assert.rejects(
  () => setTopicStatus(STUDENT, "literacy", "comprehension", "comp-literal", true),
  (err) => err.status === 404
);
await assert.rejects(
  () => recordLevel2Result(STUDENT, "literacy", "comprehension", true),
  (err) => err.status === 404
);

// --- API-shape check: hydrateRoadmap joins stored progress with catalog content ---
const hydrated = hydrateRoadmap(roadmap, "numeracy", "subtraction");
assert.equal(hydrated.topics.length, 3);
const borrowTopic = hydrated.topics.find((t) => t.id === "sub-borrowing");
assert.equal(borrowTopic.label, "Borrowing when subtracting two-digit numbers");
assert.equal(borrowTopic.complete, true, "re-completed before the successful Level 2 pass");
assert.equal(hydrated.level, 2);

// --- needsAttention: flags a student who's failed Level 2 more than once ---
const flaky = { level: 1, topicOrder: ["a"], completedTopics: ["a"], level2Attempts: [{ passed: false, date: "2020-01-01" }, { passed: false, date: "2020-01-02" }], updatedAt: "2020-01-02" };
assert.equal(needsAttention(flaky).flagged, true, "2+ Level 2 fails is flagged regardless of dates");

// --- needsAttention: flags a student sitting on eligibility without attempting it ---
const stale = { level: 1, topicOrder: ["a"], completedTopics: ["a"], level2Attempts: [], updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() };
assert.equal(needsAttention(stale).flagged, true, "eligible + 10 days idle is flagged");

// --- needsAttention: a student mid-topics or freshly eligible is NOT flagged ---
const midway = { level: 1, topicOrder: ["a", "b"], completedTopics: ["a"], level2Attempts: [], updatedAt: new Date().toISOString() };
assert.equal(needsAttention(midway).flagged, false, "not eligible yet — nothing to flag");
const freshlyEligible = { level: 1, topicOrder: ["a"], completedTopics: ["a"], level2Attempts: [], updatedAt: new Date().toISOString() };
assert.equal(needsAttention(freshlyEligible).flagged, false, "eligible as of moments ago — not stale yet");
assert.equal(needsAttention(null).flagged, false, "no roadmap at all -> nothing to flag, no crash");

console.log("✅ roadmapService self-check passed (37 assertions)");
