import { Router } from "express";
import { processDiagnosticSubmit } from "../services/sessionProcessor.js";
import { requireStudentOrTeacher } from "../services/auth.service.js";

const router = Router();

router.post("/:studentId/submit", requireStudentOrTeacher, async (req, res, next) => {
  try {
    const { subject, sessionId, startedAt, attempts } = req.body ?? {};
    if (!["literacy", "numeracy"].includes(subject)) return res.status(400).json({ error: "subject must be 'literacy' or 'numeracy'" });
    if (!Array.isArray(attempts) || attempts.length === 0) return res.status(400).json({ error: "attempts must be a non-empty array" });

    const result = await processDiagnosticSubmit(req.params.studentId, { subject, sessionId, startedAt, attempts });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
