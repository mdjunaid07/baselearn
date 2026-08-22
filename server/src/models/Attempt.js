import mongoose from "mongoose";

// The raw event log everything else (skill scores, error patterns, progress charts)
// is derived from. Kept even after scores are recomputed, so history is replayable.
const attemptSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  subject: { type: String, enum: ["literacy", "numeracy"], required: true },
  skill: { type: String, required: true },
  questionId: { type: String, required: true },
  difficulty: { type: Number, required: true },
  answer: { type: mongoose.Schema.Types.Mixed },
  correct: { type: Boolean, required: true },
  responseTimeMs: { type: Number, default: null },
  errorPattern: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Attempt", attemptSchema);
