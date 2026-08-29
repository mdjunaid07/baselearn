import { Router } from "express";
import * as repo from "../services/repository.js";
import { requireTeacherAuth } from "../services/auth.service.js";
import { emptySkillProfile, pickWeakestSkill } from "../services/adaptiveEngine.js";
import { hydrateRoadmap } from "../services/roadmapService.js";

const router = Router();

// Single-roster model: a teacher sees every student in the system, not a per-teacher
// class list (there's no teacher/student link in the schema yet — see Student.js).
// Same requireTeacherAuth guard as before — unmodified, only the response is richer.
router.get("/students", requireTeacherAuth, async (req, res, next) => {
  try {
    const students = await repo.getAllStudents();
    const roster = await Promise.all(
      students.map(async (student) => {
        const skillProfile = (await repo.getSkillProfile(student.studentId)) ?? emptySkillProfile();
        const sessions = await repo.getSessions(student.studentId);

        // Students who existed before the roadmap feature (or who've simply never
        // had a weak skill) have no StudentRoadmap docs at all — getStudentRoadmapsForStudent
        // returns [] for them, so `roadmaps` below is just an empty array. Nothing here
        // (or on the client) assumes at least one roadmap exists.
        const roadmapDocs = await repo.getStudentRoadmapsForStudent(student.studentId);
        const roadmaps = roadmapDocs.map((r) => hydrateRoadmap(r, r.subject, r.skill));
        const needsAttention = roadmaps.some((r) => r.flagged);

        // Warn-and-log camera/tab events from useTestMonitor.js — a count only, no
        // per-event detail, kept neutral (not framed as "cheating") on the client.
        const flagCounts = await repo.getProctoringEventCountsBySession(student.studentId);
        const flaggedSessionCount = sessions.filter((s) => flagCounts[s.sessionId] > 0).length;

        return {
          studentId: student.studentId,
          nickname: student.nickname,
          avatarId: student.avatarId,
          skillProfile,
          sessionCount: sessions.length,
          lastSessionAt: sessions.length ? sessions[sessions.length - 1].completedAt : null,
          weakestSkills: {
            literacy: pickWeakestSkill(skillProfile, "literacy"),
            numeracy: pickWeakestSkill(skillProfile, "numeracy"),
          },
          roadmaps,
          needsAttention,
          flaggedSessionCount,
        };
      })
    );
    res.json({ students: roster });
  } catch (err) {
    next(err);
  }
});

export default router;
