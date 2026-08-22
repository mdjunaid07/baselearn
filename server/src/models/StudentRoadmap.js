import mongoose from "mongoose";

const level2AttemptSchema = new mongoose.Schema(
  {
    passed: { type: Boolean, required: true },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

// One document per (student, subject, skill) — mirrors Attempt/Session's per-event
// granularity rather than SkillProfile's single-doc-per-student shape, since a
// student's topic list, level, and Level 2 history all vary independently per skill.
const studentRoadmapSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  subject: { type: String, enum: ["literacy", "numeracy"], required: true },
  skill: { type: String, required: true },
  topicOrder: { type: [String], default: [] }, // topic IDs from data/roadmapTopics.js, priority order
  completedTopics: { type: [String], default: [] }, // subset of topicOrder marked done
  level: { type: Number, enum: [1, 2], default: 1 },
  level2Attempts: { type: [level2AttemptSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});
studentRoadmapSchema.index({ studentId: 1, subject: 1, skill: 1 }, { unique: true });

export default mongoose.model("StudentRoadmap", studentRoadmapSchema);
