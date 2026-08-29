import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, unique: true },
  type: { type: String, enum: ["diagnostic", "rescue", "level2"], required: true },
  subject: { type: String, enum: ["literacy", "numeracy"], required: true },
  skill: { type: String, default: null }, // set for 'rescue' sessions
  startedAt: { type: Date, required: true },
  completedAt: { type: Date, required: true },
  questionCount: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  starsEarned: { type: Number, required: true },
  skillScoreBefore: { type: Number, default: null },
  skillScoreAfter: { type: Number, default: null },
  // Lockdown termination (fullscreen exit / 20s question timeout) — answers were
  // discarded, never graded, so this always pairs with questionCount: 0.
  terminated: { type: Boolean, default: false },
  terminationReason: { type: String, enum: ["fullscreen_exit", "timeout", null], default: null },
});

export default mongoose.model("Session", sessionSchema);
