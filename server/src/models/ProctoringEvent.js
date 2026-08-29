import mongoose from "mongoose";

// Warn-and-log only — nothing here ever terminates a test. One doc per flagged
// moment during a test attempt, tied back to that attempt via sessionId.
const proctoringEventSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  eventType: {
    type: String,
    enum: ["multiple_faces", "no_face", "head_movement", "tab_switch", "fullscreen_exit", "timeout"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("ProctoringEvent", proctoringEventSchema);
