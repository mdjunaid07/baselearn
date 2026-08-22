// Lightweight correctness check for the Level 2 test submission flow, no test
// framework needed, no Mongo required (routes through inMemoryStore.js).
// Run with: npm run selfcheck:level2
import assert from "node:assert/strict";
import { reset } from "./inMemoryStore.js";
import * as repo from "./repository.js";
import { processRescueSubmit, processLevel2Submit } from "./sessionProcessor.js";
import { getLevel2QuestionsForSkill } from "../data/level2QuestionBank.js";

const STUDENT = "selfcheck-level2-student";

reset();

// Get the student into a weak-subtraction, roadmap-eligible-for-level2 state via the
// real rescue submission path (exercises the real weak-skill trigger from Phase 1).
await processRescueSubmit(STUDENT, {
  subject: "numeracy",
  skill: "subtraction",
  attempts: [
    { questionId: "num-subtraction-h1", answer: 35 }, // wrong -> borrowing-error
    { questionId: "num-subtraction-h2", answer: 33 }, // wrong -> borrowing-error
    { questionId: "num-subtraction-m2", answer: 27 }, // wrong -> borrowing-error
    { questionId: "num-subtraction-e1", answer: 5 },  // correct
    { questionId: "num-subtraction-e2", answer: 5 },  // correct
  ],
});

let roadmap = await repo.getStudentRoadmap(STUDENT, "numeracy", "subtraction");
assert.ok(roadmap, "roadmap was auto-assigned by the weak-skill trigger");
for (const topicId of roadmap.topicOrder) {
  await import("./roadmapService.js").then((m) => m.setTopicStatus(STUDENT, "numeracy", "subtraction", topicId, true));
}
roadmap = await repo.getStudentRoadmap(STUDENT, "numeracy", "subtraction");
assert.equal(roadmap.completedTopics.length, roadmap.topicOrder.length, "all topics completed -> eligible for Level 2");

// --- Level 2 questions exist and are tagged with real roadmap topic IDs ---
const level2Questions = getLevel2QuestionsForSkill("numeracy", "subtraction");
assert.ok(level2Questions.length >= 2, "at least 2 Level 2 questions exist for subtraction");
for (const q of level2Questions) {
  assert.ok(q.topicIds.length > 0, `${q.id} is tagged with at least one topicId`);
  assert.ok(q.topicIds.every((id) => roadmap.topicOrder.includes(id)), `${q.id}'s topicIds are real roadmap topics`);
}

// --- Answering everything correctly: passes, no topics missed, roadmap levels up ---
const allCorrect = level2Questions.map((q) => ({
  questionId: q.id,
  answer: q.type === "numeric" ? q.correctAnswer : q.options.find((o) => o.correct).id,
}));
let result = await processLevel2Submit(STUDENT, "numeracy", "subtraction", { attempts: allCorrect });
assert.equal(result.passed, true);
assert.deepEqual(result.missedTopicIds, []);
assert.equal(result.roadmap.level, 2);
assert.equal(result.correctCount, level2Questions.length);

// A Session record was created for this test, distinguishable from diagnostic/rescue.
const sessions = await repo.getSessions(STUDENT, { subject: "numeracy" });
const level2Session = sessions.find((s) => s.sessionId === result.sessionId);
assert.ok(level2Session, "a Session was recorded for the Level 2 test");
assert.equal(level2Session.type, "level2");

// --- A wrong answer on a tagged question is auto-derived into missedTopicIds, and the
//     roadmap correctly reopens only that topic (fail path) ---
reset(); // fresh student so this Level 2 test is graded from a clean, all-topics-complete state
await processRescueSubmit(STUDENT, {
  subject: "numeracy",
  skill: "subtraction",
  attempts: [{ questionId: "num-subtraction-h1", answer: 35 }, { questionId: "num-subtraction-h2", answer: 33 }],
});
const roadmapModule = await import("./roadmapService.js");
let fresh = await repo.getStudentRoadmap(STUDENT, "numeracy", "subtraction");
for (const topicId of fresh.topicOrder) {
  await roadmapModule.setTopicStatus(STUDENT, "numeracy", "subtraction", topicId, true);
}

const wrongOnFirst = level2Questions.map((q, i) => ({
  questionId: q.id,
  // Wrong on purpose only for the first question; the rest answered correctly.
  answer: i === 0 ? "definitely-wrong" : q.type === "numeric" ? q.correctAnswer : q.options.find((o) => o.correct).id,
}));
result = await processLevel2Submit(STUDENT, "numeracy", "subtraction", { attempts: wrongOnFirst });
assert.equal(result.passed, false);
assert.deepEqual(result.missedTopicIds.sort(), [...level2Questions[0].topicIds].sort(),
  "missedTopicIds derived automatically from exactly the wrongly-answered question's tags");
assert.equal(result.roadmap.level, 1, "a fail does not level up");
for (const topicId of level2Questions[0].topicIds) {
  const topic = result.roadmap.topics.find((t) => t.id === topicId);
  assert.equal(topic.complete, false, `${topicId} was reopened`);
}
// Topics NOT tied to the missed question stay complete (fail reopens only what was missed).
for (const topic of result.roadmap.topics) {
  if (!level2Questions[0].topicIds.includes(topic.id)) assert.equal(topic.complete, true, `${topic.id} stayed complete`);
}

// --- Server-side eligibility enforcement (not just a hidden button): a rejected
//     attempt must also leave zero side effects — no session logged. ---
const sessionsBeforeReject = (await repo.getSessions(STUDENT, { subject: "numeracy" })).length;
await assert.rejects(
  () => processLevel2Submit(STUDENT, "numeracy", "multiplication", { attempts: [{ questionId: "num-multiplication-lvl2-a", answer: 1 }] }),
  (err) => err.status === 404,
  "no roadmap at all yet for this skill -> 404, not a crash"
);
const sessionsAfterReject = (await repo.getSessions(STUDENT, { subject: "numeracy" })).length;
assert.equal(sessionsAfterReject, sessionsBeforeReject, "a rejected submission logs no session");

await assert.rejects(
  () => processLevel2Submit(STUDENT, "numeracy", "subtraction", { attempts: allCorrect }),
  (err) => err.status === 403,
  "a topic still reopened from the earlier fail -> not eligible -> 403"
);

// Re-complete the reopened topic — the realistic path back to eligibility — so the
// remaining checks (which need an eligible roadmap) aren't confounded by this one.
const reopenedTopicId = level2Questions[0].topicIds[0];
await roadmapModule.setTopicStatus(STUDENT, "numeracy", "subtraction", reopenedTopicId, true);

// --- A question from a different skill's Level 2 bank is rejected ---
await assert.rejects(
  () => processLevel2Submit(STUDENT, "numeracy", "subtraction", { attempts: [{ questionId: "num-addition-lvl2-a", answer: 1 }] }),
  (err) => err.status === 400,
  "a question from a different skill's Level 2 test is rejected"
);

// --- Answering only part of the question set is rejected, not silently graded as a
//     pass — otherwise a student could cherry-pick one easy question to "pass" ---
await assert.rejects(
  () => processLevel2Submit(STUDENT, "numeracy", "subtraction", { attempts: [allCorrect[0]] }),
  (err) => err.status === 400,
  "an incomplete question set is rejected"
);

// --- Answering the same question twice (instead of the full set) is rejected ---
await assert.rejects(
  () => processLevel2Submit(STUDENT, "numeracy", "subtraction", { attempts: [allCorrect[0], allCorrect[0]] }),
  (err) => err.status === 400,
  "a duplicated question is rejected"
);

// --- Passing for real now that subtraction is genuinely eligible again ---
result = await processLevel2Submit(STUDENT, "numeracy", "subtraction", { attempts: allCorrect });
assert.equal(result.passed, true);
assert.equal(result.roadmap.level, 2);

// --- Already at Level 2: attempting again is rejected, not silently re-recorded ---
await assert.rejects(
  () => processLevel2Submit(STUDENT, "numeracy", "subtraction", { attempts: allCorrect }),
  (err) => err.status === 409,
  "already Level 2 -> 409"
);

console.log("✅ level2 self-check passed");
