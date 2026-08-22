// Shared by routes/diagnostic.js, routes/practice.js, and routes/sync.js so offline
// syncing replays through exactly the same logic as a live submit — no special-casing.
import * as repo from "./repository.js";
import { getQuestionById } from "../data/questionBank.js";
import { gradeAttempt, applyAttemptsToProfile, pickWeakestSkill, startingDifficulty, masteryTier } from "./adaptiveEngine.js";

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
