// Seeds exactly one demo student, so the Progress screen and Parent Dashboard have
// something real to show the moment the app is opened — without needing "many real
// users" per the brief. This is illustrative history only: the live diagnostic and
// Daily Rescue flows a judge actually clicks through are computed for real by the
// adaptive engine, not faked. Keep those two ideas separate — see DESIGN.md §1.
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import * as repo from "../services/repository.js";
import * as authService from "../services/auth.service.js";
import { getQuestionsForSkill } from "./questionBank.js";

export const DEMO_STUDENT_ID = "demo-child-0001";
// Publicly documented on purpose — this is the "Judges & teachers: view sample
// dashboard" login, a real (if trivial) PIN login rather than a client-side bypass.
export const DEMO_STUDENT_PIN = "0000";

export const DEMO_TEACHER_EMAIL = "teacher@demo.com";
export const DEMO_TEACHER_PASSWORD = "teacher123";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function seedDemoData() {
  // getStudentAuth (not getStudent) so this can see pinHash and detect a student that
  // was persisted (e.g. in Atlas) before login credentials existed for this profile.
  const existing = await repo.getStudentAuth(DEMO_STUDENT_ID);
  if (existing?.pinHash) return; // already fully seeded, including login credentials

  await repo.upsertStudentRecord({
    studentId: DEMO_STUDENT_ID,
    nickname: existing?.nickname || "riya",
    avatarId: existing?.avatarId || "owl",
    createdAt: existing?.createdAt || daysAgo(14).toISOString(),
    pinHash: await bcrypt.hash(DEMO_STUDENT_PIN, 10),
  });
  if (existing) return; // profile already existed (e.g. persisted in Atlas) — just added
  // the missing PIN, so skip re-seeding session history to avoid duplicating it

  // Matches the brief's own skill-map example exactly.
  await repo.saveSkillProfile(DEMO_STUDENT_ID, {
    literacy: { letterRecognition: 90, letterSounds: 80, wordReading: 65, sentenceReading: 40, comprehension: 30 },
    numeracy: { numberRecognition: 100, counting: 90, addition: 85, subtraction: 50, multiplication: 30 },
  });

  // Six Daily Rescue sessions on Subtraction, trending 25 -> 50, so the dashboard
  // trend line and "most common mistake" panel have real history to summarize.
  const subtractionQuestions = getQuestionsForSkill("numeracy", "subtraction");
  const trajectory = [
    { day: 12, before: 25, after: 31, correct: 1, difficulty: 1 },
    { day: 10, before: 31, after: 35, correct: 2, difficulty: 1 },
    { day: 8, before: 35, after: 29, correct: 2, difficulty: 2 },
    { day: 6, before: 29, after: 36, correct: 3, difficulty: 2 },
    { day: 3, before: 36, after: 43, correct: 4, difficulty: 2 },
    { day: 1, before: 43, after: 50, correct: 4, difficulty: 3 },
  ];

  for (const point of trajectory) {
    const sessionId = randomUUID();
    const completedAt = daysAgo(point.day);
    const startedAt = new Date(completedAt.getTime() - 4 * 60 * 1000);

    await repo.createSession({
      studentId: DEMO_STUDENT_ID,
      sessionId,
      type: "rescue",
      subject: "numeracy",
      skill: "subtraction",
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      questionCount: 5,
      correctCount: point.correct,
      starsEarned: point.correct,
      skillScoreBefore: point.before,
      skillScoreAfter: point.after,
    });

    const attemptDocs = [];
    for (let i = 0; i < 5; i++) {
      const q = subtractionQuestions[i % subtractionQuestions.length];
      const isCorrect = i < point.correct;
      attemptDocs.push({
        studentId: DEMO_STUDENT_ID,
        sessionId,
        subject: "numeracy",
        skill: "subtraction",
        questionId: q.id,
        difficulty: point.difficulty,
        answer: isCorrect ? q.correctAnswer : q.correctAnswer + 10, // a plausible borrow-style miss
        correct: isCorrect,
        responseTimeMs: 4000 + i * 500,
        errorPattern: isCorrect ? null : "borrowing-error",
        createdAt: completedAt.toISOString(),
      });
    }
    await repo.logAttempts(attemptDocs);
  }

  console.log(`Seeded demo student ${DEMO_STUDENT_ID} ("Riya") with 6 historical sessions.`);
}

/** Reuses the real registerTeacher path (bcrypt hash, Mongo/in-memory branching, the
 *  409-on-duplicate-email check) rather than writing credentials directly — this way
 *  the seeded demo teacher is created through exactly the same, already-tested code
 *  a real signup would run. */
export async function seedDemoTeacher() {
  try {
    await authService.registerTeacher({ name: "Demo Teacher", email: DEMO_TEACHER_EMAIL, password: DEMO_TEACHER_PASSWORD });
    console.log(`Seeded demo teacher (${DEMO_TEACHER_EMAIL}).`);
  } catch (err) {
    if (err.status === 409) return; // already seeded, e.g. persisted in Atlas from a previous run
    throw err;
  }
}
