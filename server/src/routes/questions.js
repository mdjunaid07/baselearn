import { Router } from "express";
import { QUESTION_BANK } from "../data/questionBank.js";

const router = Router();

router.get("/:subject", (req, res) => {
  const { subject } = req.params;
  if (!QUESTION_BANK[subject]) return res.status(400).json({ error: "subject must be 'literacy' or 'numeracy'" });
  res.json(QUESTION_BANK[subject]);
});

export default router;
