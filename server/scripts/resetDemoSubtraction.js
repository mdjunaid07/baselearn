// One-off cleanup — NOT a permanent route, run manually and then this script's job is
// done. Undoes exactly the test data written to demo-child-0001 while verifying the
// Study Roadmap feature (see roadmapService.js):
//   - one rescue Session + its 5 Attempts (subtraction, borrowing-error practice)
//   - two StudentRoadmap docs (subtraction was tested directly; multiplication was
//     also weak in the *original* seed data, so the weak-skill loop created a roadmap
//     for it too as a side effect of the same test run)
//   - numeracy.subtraction on SkillProfile, reset from 43 back to the seeded 50
// Everything else on the account — literacy scores, the 6 originally-seeded
// subtraction sessions/attempts, numberRecognition/counting/addition — is untouched.
//
// Run once with: node scripts/resetDemoSubtraction.js
import "dotenv/config";
import mongoose from "mongoose";
import SkillProfileModel from "../src/models/SkillProfile.js";
import SessionModel from "../src/models/Session.js";
import AttemptModel from "../src/models/Attempt.js";
import StudentRoadmapModel from "../src/models/StudentRoadmap.js";

const STUDENT_ID = "demo-child-0001";
const TEST_SESSION_ID = "1d48e963-133c-4074-b5a7-744146fd75c5"; // the one session created while testing the roadmap trigger

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("No MONGODB_URI set — nothing to reset (in-memory data doesn't survive a restart anyway).");
    return;
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected.");

  const scoreResult = await SkillProfileModel.updateOne({ studentId: STUDENT_ID }, { $set: { "numeracy.subtraction": 50 } });
  console.log(`Skill score reset (numeracy.subtraction -> 50): matched ${scoreResult.matchedCount}, modified ${scoreResult.modifiedCount}`);

  const sessionResult = await SessionModel.deleteOne({ studentId: STUDENT_ID, sessionId: TEST_SESSION_ID });
  console.log(`Test session removed: ${sessionResult.deletedCount}`);

  const attemptResult = await AttemptModel.deleteMany({ studentId: STUDENT_ID, sessionId: TEST_SESSION_ID });
  console.log(`Test attempts removed: ${attemptResult.deletedCount}`);

  const roadmapResult = await StudentRoadmapModel.deleteMany({ studentId: STUDENT_ID });
  console.log(`Roadmap docs removed: ${roadmapResult.deletedCount}`);

  await mongoose.disconnect();
  console.log("Done — demo-child-0001 restored to its pre-testing seeded state.");
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
