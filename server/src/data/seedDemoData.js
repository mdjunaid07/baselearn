// Seeds exactly one demo student, so the Progress screen and Parent Dashboard have
// something real to show the moment the app is opened — without needing "many real
// users" per the brief. This is illustrative history only: the live diagnostic and
// Daily Rescue flows a judge actually clicks through are computed for real by the
// adaptive engine, not faked. Keep those two ideas separate — see DESIGN.md §1.
import { randomUUID } from "node:crypto";
import * as repo from "../services/repository.js";
import { getQuestionsForSkill } from "./questionBank.js";

export const DEMO_STUDENT_ID = "demo-child-0001";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function seedDemoData() {
  const existing = await repo.getStudent(DEMO_STUDENT_ID);
  if (existing) return; // already seeded (e.g. real Mongo persisted from a previous run)

  await repo.upsertStudentRecord({
    studentId: DEMO_STUDENT_ID,
    nickname: "riya",
    avatarId: "owl",
    createdAt: daysAgo(14).toISOString(),
  });

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
