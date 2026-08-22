import mongoose from "mongoose";

const literacySchema = new mongoose.Schema(
  {
    letterRecognition: { type: Number, default: 50 },
    letterSounds: { type: Number, default: 50 },
    wordReading: { type: Number, default: 50 },
    sentenceReading: { type: Number, default: 50 },
    comprehension: { type: Number, default: 50 },
  },
  { _id: false }
);

const numeracySchema = new mongoose.Schema(
  {
    numberRecognition: { type: Number, default: 50 },
    counting: { type: Number, default: 50 },
    addition: { type: Number, default: 50 },
    subtraction: { type: Number, default: 50 },
    multiplication: { type: Number, default: 50 },
  },
  { _id: false }
);

const skillProfileSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, index: true },
  literacy: { type: literacySchema, default: () => ({}) },
  numeracy: { type: numeracySchema, default: () => ({}) },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("SkillProfile", skillProfileSchema);
