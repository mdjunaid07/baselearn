// One-off cleanup — NOT a permanent route. Separate from resetDemoSubtraction.js:
// this fixes a *pre-existing* issue unrelated to roadmap testing — two overlapping
// server restarts raced seedDemoData()'s "already seeded?" check (visible as
// EADDRINUSE in earlier server logs) and both ran the full seed, leaving every one
// of the 6 original subtraction sessions duplicated (12 sessions instead of 6, same
// skill/before/after pairs, timestamps a few hundred ms apart).
//
// For each duplicate pair (same skill + skillScoreBefore + skillScoreAfter), this
// keeps the earliest sessionId and deletes the other, plus that session's attempts.
// Run once with: node scripts/dedupeDemoSessions.js
import "dotenv/config";
import mongoose from "mongoose";
import SessionModel from "../src/models/Session.js";
import AttemptModel from "../src/models/Attempt.js";

const STUDENT_ID = "demo-child-0001";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("No MONGODB_URI set — nothing to dedupe (in-memory data doesn't survive a restart anyway).");
    return;
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected.");

  const sessions = await SessionModel.find({ studentId: STUDENT_ID }).sort({ completedAt: 1 }).lean();
  const seen = new Set();
  const duplicateSessionIds = [];

  for (const s of sessions) {
    const key = `${s.skill}:${s.skillScoreBefore}->${s.skillScoreAfter}`;
    if (seen.has(key)) {
      duplicateSessionIds.push(s.sessionId);
    } else {
      seen.add(key);
    }
  }

  console.log(`Found ${sessions.length} total sessions, ${duplicateSessionIds.length} duplicates to remove.`);

  if (duplicateSessionIds.length > 0) {
    const sessionResult = await SessionModel.deleteMany({ studentId: STUDENT_ID, sessionId: { $in: duplicateSessionIds } });
    console.log(`Duplicate sessions removed: ${sessionResult.deletedCount}`);

    const attemptResult = await AttemptModel.deleteMany({ studentId: STUDENT_ID, sessionId: { $in: duplicateSessionIds } });
    console.log(`Duplicate attempts removed: ${attemptResult.deletedCount}`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Dedupe failed:", err);
  process.exit(1);
});
