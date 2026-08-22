// Shared by routes/diagnostic.js, routes/practice.js, and routes/sync.js so offline
// syncing replays through exactly the same logic as a live submit — no special-casing.
import * as repo from "./repository.js";
import { getQuestionById } from "../data/questionBank.js";
import { getLevel2QuestionById, getLevel2QuestionsForSkill } from "../data/level2QuestionBank.js";
import { gradeAttempt, applyAttemptsToProfile, pickWeakestSkill, startingDifficulty, masteryTier } from "./adaptiveEngine.js";
import { assignRoadmapsForWeakSkills, recordLevel2Result, hydrateRoadmap, assertEligibleForLevel2 } from "./roadmapService.js";

async function currentOrDefaultProfile(studentId) {
  const profile = await repo.getSkillProfile(studentId);
  if (profile) return profile;
  const { emptySkillProfile } = await import("./adaptiveEngine.js");
  return { studentId, ...emptySkillProfile() };
}

/** Grades raw {questionId, answer, responseTimeMs} entries into full attempt docs. The
 *  server never trusts a client-submitted `correct` flag — it always regrades from the
 *  question bank, so a tampered client can't inflate a skill score. */
function gradeRawAttempts(studentId, sessionId, subject, rawAttempts) {
  return rawAttempts.map((raw) => {
    const question = getQuestionById(raw.questionId);
    if (!question) throw Object.assign(new Error(`Unknown questionId: ${raw.questionId}`), { status: 400 });
    const { correct, errorPattern } = gradeAttempt(question, raw.answer);
    return {
      studentId,
      sessionId,
      subject,
      skill: question.skill,
      questionId: question.id,
      difficulty: question.difficulty,
      answer: raw.answer,
      correct,
      responseTimeMs: raw.responseTimeMs ?? null,
      errorPattern,
    };
  });
}

export async function processDiagnosticSubmit(studentId, { subject, sessionId, startedAt, attempts: rawAttempts }) {
  const sid = sessionId || repo.newSessionId();
  const graded = gradeRawAttempts(studentId, sid, subject, rawAttempts);

  const beforeProfile = await currentOrDefaultProfile(studentId);
  const afterProfile = applyAttemptsToProfile(beforeProfile, graded);
  await repo.saveSkillProfile(studentId, afterProfile);
  await repo.logAttempts(graded);
  await assignRoadmapsForWeakSkills(studentId, subject, afterProfile, graded);

  const correctCount = graded.filter((a) => a.correct).length;
  await repo.createSession({
    studentId,
    sessionId: sid,
    type: "diagnostic",
    subject,
    skill: null,
    startedAt: startedAt || new Date().toISOString(),
    completedAt: new Date().toISOString(),
    questionCount: graded.length,
    correctCount,
    starsEarned: correctCount,
    skillScoreBefore: null,
    skillScoreAfter: null,
  });

  const weakestSkill = pickWeakestSkill(afterProfile, subject);
  const weakestScore = afterProfile[subject][weakestSkill];
  return {
    sessionId: sid,
    skillProfile: afterProfile,
    weakestSkill,
    weakestScore,
    tier: masteryTier(weakestScore),
    recommendedDifficulty: startingDifficulty(weakestScore),
  };
}

export async function processRescueSubmit(studentId, { subject, skill, sessionId, startedAt, attempts: rawAttempts }) {
  const sid = sessionId || repo.newSessionId();
  const graded = gradeRawAttempts(studentId, sid, subject, rawAttempts);

  const beforeProfile = await currentOrDefaultProfile(studentId);
  const skillScoreBefore = beforeProfile[subject][skill];
  const afterProfile = applyAttemptsToProfile(beforeProfile, graded);
  const skillScoreAfter = afterProfile[subject][skill];
  await repo.saveSkillProfile(studentId, afterProfile);
  await repo.logAttempts(graded);
  await assignRoadmapsForWeakSkills(studentId, subject, afterProfile, graded);

  const correctCount = graded.filter((a) => a.correct).length;
  await repo.createSession({
    studentId,
    sessionId: sid,
    type: "rescue",
    subject,
    skill,
    startedAt: startedAt || new Date().toISOString(),
    completedAt: new Date().toISOString(),
    questionCount: graded.length,
    correctCount,
    starsEarned: correctCount,
    skillScoreBefore,
    skillScoreAfter,
  });

  const tierBefore = masteryTier(skillScoreBefore).tier;
  const tierAfter = masteryTier(skillScoreAfter).tier;
  const tierOrder = ["seed", "sprout", "sapling", "bloom"];
  const newlyUnlockedBadges = tierOrder.indexOf(tierAfter) > tierOrder.indexOf(tierBefore) ? [`${skill}-${tierAfter}`] : [];

  return {
    sessionId: sid,
    skillProfile: afterProfile,
    skillScoreBefore,
    skillScoreAfter,
    correctCount,
    starsEarned: correctCount,
    newlyUnlockedBadges,
  };
}

/**
 * Grades a Level 2 test against level2QuestionBank.js (same gradeAttempt() as every
 * other submit path — the question shape is identical plus one extra `topicIds`
 * field) and derives which roadmap topics were missed automatically: any question
 * answered wrong marks every topic it's tagged with as missed. Passing requires
 * missing zero topics. Delegates the actual pass/fail state change to the
 * already-tested recordLevel2Result — this function's only new responsibility is
 * turning raw answers into a passed/missedTopicIds verdict.
 */
export async function processLevel2Submit(studentId, subject, skill, { sessionId, startedAt, attempts: rawAttempts }) {
  // Checked BEFORE any grading or persistence — a rejected attempt (not eligible,
  // already leveled up, wrong/incomplete question set) must leave zero side effects:
  // no skill score change, no logged attempts, no session record. Client-side button
  // hiding is not the enforcement; this is.
  const existingRoadmap = await repo.getStudentRoadmap(studentId, subject, skill);
  assertEligibleForLevel2(existingRoadmap);

  const expectedIds = new Set(getLevel2QuestionsForSkill(subject, skill).map((q) => q.id));
  const submittedIds = rawAttempts.map((a) => a.questionId);
  const submittedIdSet = new Set(submittedIds);
  const isCompleteSet = submittedIds.length === expectedIds.size && [...expectedIds].every((id) => submittedIdSet.has(id));
  const hasDuplicates = submittedIds.length !== submittedIdSet.size;
  if (!isCompleteSet || hasDuplicates) {
    throw Object.assign(
      new Error("A Level 2 submission must answer every question for this skill's test exactly once"),
      { status: 400 }
    );
  }

  const sid = sessionId || repo.newSessionId();
  const graded = rawAttempts.map((raw) => {
    const question = getLevel2QuestionById(raw.questionId);
    if (!question) throw Object.assign(new Error(`Unknown Level 2 questionId: ${raw.questionId}`), { status: 400 });
    if (question.subject !== subject || question.skill !== skill) {
      throw Object.assign(new Error("That question isn't part of this skill's Level 2 test"), { status: 400 });
    }
    const { correct, errorPattern } = gradeAttempt(question, raw.answer);
    return {
      studentId,
      sessionId: sid,
      subject,
      skill,
      questionId: question.id,
      difficulty: question.difficulty,
      answer: raw.answer,
      correct,
      responseTimeMs: raw.responseTimeMs ?? null,
      errorPattern,
      topicIds: question.topicIds,
    };
  });

  const beforeProfile = await currentOrDefaultProfile(studentId);
  const skillScoreBefore = beforeProfile[subject][skill];
  const afterProfile = applyAttemptsToProfile(beforeProfile, graded);
  const skillScoreAfter = afterProfile[subject][skill];
  await repo.saveSkillProfile(studentId, afterProfile);
  await repo.logAttempts(graded);

  const correctCount = graded.filter((a) => a.correct).length;
  await repo.createSession({
    studentId,
    sessionId: sid,
    type: "level2",
    subject,
    skill,
    startedAt: startedAt || new Date().toISOString(),
    completedAt: new Date().toISOString(),
    questionCount: graded.length,
    correctCount,
    starsEarned: correctCount,
    skillScoreBefore,
    skillScoreAfter,
  });

  const missedTopicIds = [...new Set(graded.filter((a) => !a.correct).flatMap((a) => a.topicIds ?? []))];
  const passed = missedTopicIds.length === 0;
  const roadmap = await recordLevel2Result(studentId, subject, skill, passed, missedTopicIds);

  return {
    sessionId: sid,
    passed,
    missedTopicIds,
    correctCount,
    questionCount: graded.length,
    skillScoreBefore,
    skillScoreAfter,
    roadmap: hydrateRoadmap(roadmap, subject, skill),
  };
}
