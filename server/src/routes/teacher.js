import { Router } from "express";
import * as repo from "../services/repository.js";
import { requireTeacherAuth } from "../services/auth.service.js";
import { emptySkillProfile, pickWeakestSkill } from "../services/adaptiveEngine.js";

const router = Router();

// Single-roster model: a teacher sees every student in the system, not a per-teacher
// class list (there's no teacher/student link in the schema yet — see Student.js).
router.get("/students", requireTeacherAuth, async (req, res, next) => {
  try {
    const students = await repo.getAllStudents();
    const roster = await Promise.all(
      students.map(async (student) => {
        const skillProfile = (await repo.getSkillProfile(student.studentId)) ?? emptySkillProfile();
        const sessions = await repo.getSessions(student.studentId);
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
        };
      })
    );
    res.json({ students: roster });
  } catch (err) {
    next(err);
  }
});

export default router;
