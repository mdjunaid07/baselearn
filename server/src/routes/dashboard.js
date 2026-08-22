import { Router } from "express";
import * as repo from "../services/repository.js";
import { LITERACY_SKILLS, NUMERACY_SKILLS, SKILL_LABELS } from "../data/questionBank.js";
import { pickWeakestSkill, masteryTier, emptySkillProfile } from "../services/adaptiveEngine.js";
import { buildParentInsight } from "../services/insights.js";

const router = Router();

function tiersFor(skillScores, skills) {
  return Object.fromEntries(skills.map((s) => [s, { score: skillScores[s], ...masteryTier(skillScores[s]) }]));
}

router.get("/:studentId", async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await repo.getStudent(studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const profile = (await repo.getSkillProfile(studentId)) ?? { ...emptySkillProfile() };
    const sessions = await repo.getSessions(studentId);
    const attempts = await repo.getAttempts(studentId);

    const insight = buildParentInsight({ nickname: student.nickname, skillProfile: profile, sessions, attempts });

    res.json({
      // Only nickname/avatar — never a real name, photo, or location.
      student: { nickname: student.nickname, avatarId: student.avatarId },
      skillProfile: profile,
      tiers: {
        literacy: tiersFor(profile.literacy, LITERACY_SKILLS),
        numeracy: tiersFor(profile.numeracy, NUMERACY_SKILLS),
      },
      skillLabels: SKILL_LABELS,
      weakestSkills: {
        literacy: pickWeakestSkill(profile, "literacy"),
        numeracy: pickWeakestSkill(profile, "numeracy"),
      },
      sessionCount: sessions.length,
      lastSessionAt: sessions.length ? sessions[sessions.length - 1].completedAt : null,
      insight,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
