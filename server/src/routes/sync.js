import { Router } from "express";
import { processDiagnosticSubmit, processRescueSubmit } from "../services/sessionProcessor.js";
import { requireStudentOrTeacher } from "../services/auth.service.js";

const router = Router();

// Body: { events: [{ type: 'diagnostic' | 'rescue', payload: {...} }] }
// Each event is replayed through the exact same logic a live submit would use,
// in order, so a batch of offline sessions reconciles identically to how it
// would have if the device had been online the whole time.
router.post("/:studentId", requireStudentOrTeacher, async (req, res, next) => {
  try {
    const { events } = req.body ?? {};
    if (!Array.isArray(events)) return res.status(400).json({ error: "events must be an array" });

    const results = [];
    for (const event of events) {
      if (event.type === "diagnostic") {
        results.push({ type: "diagnostic", result: await processDiagnosticSubmit(req.params.studentId, event.payload) });
      } else if (event.type === "rescue") {
        results.push({ type: "rescue", result: await processRescueSubmit(req.params.studentId, event.payload) });
      } else {
        results.push({ type: event.type, error: "unknown event type" });
      }
    }
    res.status(201).json({ synced: results.length, results });
  } catch (err) {
    next(err);
  }
});

export default router;
