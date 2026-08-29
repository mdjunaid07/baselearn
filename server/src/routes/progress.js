import { Router } from "express";
import * as repo from "../services/repository.js";
import { requireStudentOrTeacher } from "../services/auth.service.js";

const router = Router();

function dateKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function computeStreak(sessions) {
  const dates = new Set(sessions.map((s) => dateKey(s.completedAt)));
  let streak = 0;
  const cursor = new Date();
  if (!dates.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1); // today not done yet is OK
  while (dates.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function historyBySkill(sessions) {
  const history = { literacy: {}, numeracy: {} };
  for (const s of sessions) {
    if (s.type !== "rescue" || !s.skill) continue;
    const bucket = (history[s.subject][s.skill] ??= []);
    bucket.push({ date: s.completedAt, score: s.skillScoreAfter });
  }
  return history;
}

router.get("/:studentId", requireStudentOrTeacher, async (req, res, next) => {
  try {
    const sessions = await repo.getSessions(req.params.studentId);
    const flagCounts = await repo.getProctoringEventCountsBySession(req.params.studentId);
    const sessionsWithFlags = sessions.map((s) => ({ ...s, flaggedEventCount: flagCounts[s.sessionId] || 0 }));
    res.json({
      sessions: sessionsWithFlags,
      totalSessions: sessions.length,
      totalStars: sessions.reduce((sum, s) => sum + (s.starsEarned || 0), 0),
      streakDays: computeStreak(sessions),
      history: historyBySkill(sessions),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
