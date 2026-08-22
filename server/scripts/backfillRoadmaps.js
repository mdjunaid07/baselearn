// Migration/backfill — NOT a permanent route, run manually once after deploying the
// Study Roadmap feature. Students who existed before this feature (or who simply
// haven't submitted a test since it shipped) have zero StudentRoadmap docs; every
// roadmap route and the teacher dashboard already handle that gracefully (empty
// array / "no roadmap yet", never a crash — see hydrateRoadmap's null-safe defaults
// and teacher.js's getStudentRoadmapsForStudent usage). This script exists to give
// those students a REAL, useful roadmap right away for any skill that's already
// weak, rather than making them wait for their next test result to trigger one.
//
// Safe to re-run: assignOrUpdateRoadmap is idempotent per student+subject+skill —
// it preserves existing completedTopics, skips skills already at Level 2, and
// skips skills that aren't currently weak. No topic-specific error-pattern data
// exists retroactively (there's no fresh batch of attempts to analyze), so newly
// backfilled roadmaps fall back to plain difficulty ordering — exactly the same
// fallback assignOrUpdateRoadmap already uses when a skill has no matching
// error-pattern data in a live submission either.
//
// Run once with: node scripts/backfillRoadmaps.js
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../src/config/db.js";
import * as repo from "../src/services/repository.js";
import { assignRoadmapsForWeakSkills } from "../src/services/roadmapService.js";
import { emptySkillProfile } from "../src/services/adaptiveEngine.js";

async function main() {
  // connectDatabase() (not a raw mongoose.connect()) — every repo.* function branches
  // on config/db.js's isMongoConnected() flag, which only that function sets. A raw
  // mongoose.connect() here would leave isMongoConnected() false and silently route
  // every repo call to the (empty, this-process-only) in-memory store instead.
  const connected = await connectDatabase();
  if (!connected) {
    console.log("No MONGODB_URI set (or connection failed) — nothing to backfill.");
    return;
  }
  console.log("Connected.");

  const students = await repo.getAllStudents();
  console.log(`Found ${students.length} student(s).`);

  let roadmapsTouched = 0;
  let studentsWithNoWeakSkills = 0;

  for (const student of students) {
    const skillProfile = (await repo.getSkillProfile(student.studentId)) ?? emptySkillProfile();
    const before = (await repo.getStudentRoadmapsForStudent(student.studentId)).length;

    await assignRoadmapsForWeakSkills(student.studentId, "literacy", skillProfile, []);
    await assignRoadmapsForWeakSkills(student.studentId, "numeracy", skillProfile, []);

    const after = (await repo.getStudentRoadmapsForStudent(student.studentId)).length;
    if (after === before && before === 0) {
      studentsWithNoWeakSkills++;
    } else {
      roadmapsTouched += Math.max(0, after - before);
    }
    console.log(`  ${student.studentId}: ${before} -> ${after} roadmap doc(s)`);
  }

  console.log(`\nDone. ${roadmapsTouched} new roadmap doc(s) created across ${students.length} student(s); ${studentsWithNoWeakSkills} had no weak skills to backfill.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
