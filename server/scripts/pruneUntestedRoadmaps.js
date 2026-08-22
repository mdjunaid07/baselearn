// One-off cleanup — NOT a permanent route. An earlier version of
// assignRoadmapsForWeakSkills (used by both the live trigger and
// backfillRoadmaps.js) flagged any skill scoring below 60 as "weak," including a
// skill still sitting at the untested default (50) that no attempt has ever
// confirmed a real weakness in. That's now fixed (see roadmapService.js and its
// selfcheck), but the fix doesn't retroactively remove roadmap docs the buggy
// version already created. This deletes exactly those: any StudentRoadmap doc for
// a (student, subject, skill) with zero real Attempt history. Roadmaps backed by
// genuine attempt history (e.g. from real practice) are left untouched.
//
// Run once with: node scripts/pruneUntestedRoadmaps.js
import "dotenv/config";
import { connectDatabase } from "../src/config/db.js";
import mongoose from "mongoose";
import AttemptModel from "../src/models/Attempt.js";
import StudentRoadmapModel from "../src/models/StudentRoadmap.js";

async function main() {
  const connected = await connectDatabase();
  if (!connected) {
    console.log("No MONGODB_URI set (or connection failed) — nothing to prune.");
    return;
  }
  console.log("Connected.");

  const roadmaps = await StudentRoadmapModel.find().lean();
  console.log(`Found ${roadmaps.length} roadmap doc(s) total.`);

  let removed = 0;
  for (const r of roadmaps) {
    const hasAttempts = await AttemptModel.exists({ studentId: r.studentId, subject: r.subject, skill: r.skill });
    if (!hasAttempts) {
      await StudentRoadmapModel.deleteOne({ _id: r._id });
      console.log(`  removed ${r.studentId} / ${r.subject}/${r.skill} (no real attempt history)`);
      removed++;
    }
  }

  console.log(`\nRemoved ${removed} of ${roadmaps.length} roadmap doc(s) with no real attempt history.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Prune failed:", err);
  process.exit(1);
});
