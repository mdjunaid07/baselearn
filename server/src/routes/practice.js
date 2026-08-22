import { Router } from "express";
import * as repo from "../services/repository.js";
import { SKILL_LABELS } from "../data/questionBank.js";
import { pickWeakestSkill, startingDifficulty, selectPracticeQuestions, emptySkillProfile } from "../services/adaptiveEngine.js";
import { processRescueSubmit } from "../services/sessionProcessor.js";

const router = Router();

router.get("/next/:studentId", async (req, res, next) => {
  try {
    const { subject } = req.query;
    if (!["literacy", "numeracy"].includes(subject)) return res.status(400).json({ error: "subject query param must be 'literacy' or 'numeracy'" });

    const profile = (await repo.getSkillProfile(req.params.studentId)) ?? { ...emptySkillProfile() };
    const skill = pickWeakestSkill(profile, subject);
    const skillScore = profile[subject][skill];
    const difficulty = startingDifficulty(skillScore);
    const questions = selectPracticeQuestions(subject, skill, difficulty, 5);

    res.json({
      sessionId: repo.newSessionId(),
      subject,
      skill,
      skillLabel: SKILL_LABELS[skill] ?? skill,
      skillScore,
      startDifficulty: difficulty,
      questions,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:studentId/submit", async (req, res, next) => {
  try {
    const { subject, skill, sessionId, startedAt, attempts } = req.body ?? {};
    if (!["literacy", "numeracy"].includes(subject)) return res.status(400).json({ error: "subject must be 'literacy' or 'numeracy'" });
    if (!skill) return res.status(400).json({ error: "skill is required" });
    if (!Array.isArray(attempts) || attempts.length === 0) return res.status(400).json({ error: "attempts must be a non-empty array" });

    const result = await processRescueSubmit(req.params.studentId, { subject, skill, sessionId, startedAt, attempts });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
