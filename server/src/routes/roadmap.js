import { Router } from "express";
import * as repo from "../services/repository.js";
import * as roadmapService from "../services/roadmapService.js";
import { processLevel2Submit } from "../services/sessionProcessor.js";
import { requireStudentOrTeacher } from "../services/auth.service.js";

const router = Router();

// All of a student's roadmaps at once — the Study Plan screen and the Progress
// section's summary both need this; one call beats up to 10 individual per-skill
// fetches. Route segment count disambiguates this from the routes below at match
// time, so declaration order here doesn't matter.
router.get("/:studentId", requireStudentOrTeacher, async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const roadmaps = await repo.getStudentRoadmapsForStudent(studentId);
    res.json({ roadmaps: roadmaps.map((r) => roadmapService.hydrateRoadmap(r, r.subject, r.skill)) });
  } catch (err) {
    next(err);
  }
});

router.get("/:studentId/:subject/:skill", requireStudentOrTeacher, async (req, res, next) => {
  try {
    const { studentId, subject, skill } = req.params;
    const roadmap = await repo.getStudentRoadmap(studentId, subject, skill);
    res.json(roadmapService.hydrateRoadmap(roadmap, subject, skill));
  } catch (err) {
    next(err);
  }
});

router.patch("/:studentId/:subject/:skill/topics/:topicId", requireStudentOrTeacher, async (req, res, next) => {
  try {
    const { studentId, subject, skill, topicId } = req.params;
    const { complete } = req.body ?? {};
    if (typeof complete !== "boolean") return res.status(400).json({ error: "complete (boolean) is required" });

    const { roadmap, eligibleForLevel2 } = await roadmapService.setTopicStatus(studentId, subject, skill, topicId, complete);
    res.json({ ...roadmapService.hydrateRoadmap(roadmap, subject, skill), eligibleForLevel2 });
  } catch (err) {
    next(err);
  }
});

router.post("/:studentId/:subject/:skill/level2-result", requireStudentOrTeacher, async (req, res, next) => {
  try {
    const { studentId, subject, skill } = req.params;
    const { passed, missedTopicIds } = req.body ?? {};
    if (typeof passed !== "boolean") return res.status(400).json({ error: "passed (boolean) is required" });

    const roadmap = await roadmapService.recordLevel2Result(studentId, subject, skill, passed, missedTopicIds ?? []);
    res.json(roadmapService.hydrateRoadmap(roadmap, subject, skill));
  } catch (err) {
    next(err);
  }
});

// Real Level 2 test submission: raw {questionId, answer, responseTimeMs} entries,
// re-graded server-side (never trust a client-submitted correct flag — same rule as
// every other submit route), missedTopicIds derived automatically from which
// tagged questions were wrong. Supersedes level2-result for the real flow; that
// route stays as a lower-level manual override.
router.post("/:studentId/:subject/:skill/level2-submit", requireStudentOrTeacher, async (req, res, next) => {
  try {
    const { studentId, subject, skill } = req.params;
    const { sessionId, startedAt, attempts } = req.body ?? {};
    if (!Array.isArray(attempts) || attempts.length === 0) return res.status(400).json({ error: "attempts must be a non-empty array" });

    const result = await processLevel2Submit(studentId, subject, skill, { sessionId, startedAt, attempts });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
