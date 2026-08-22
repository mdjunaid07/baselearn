// Study Roadmap: per-skill topic sequencing built from real error-pattern signal
// where it exists, backed by data/roadmapTopics.js (the content) and the
// StudentRoadmap collection (per-student progress). No auth logic lives here —
// routes/roadmap.js applies the existing requireStudentOrTeacher guard, unchanged.
import * as repo from "./repository.js";
import { getRoadmapTopics } from "../data/roadmapTopics.js";
import { skillsForSubject, masteryTier } from "./adaptiveEngine.js";

// Matches masteryTier's existing seed/sprout-vs-sapling/bloom cutoff — a skill counts
// as "weak" for roadmap purposes exactly when the rest of the app already renders it
// as struggling, so the two never disagree about what needs work.
const WEAK_SCORE_THRESHOLD = 60;

function isWeak(score) {
  return score < WEAK_SCORE_THRESHOLD;
}

/** How often each error pattern shows up in a batch of graded attempts, for one skill. */
function errorPatternCounts(attempts, skill) {
  const counts = {};
  for (const a of attempts) {
    if (a.skill !== skill || a.correct || !a.errorPattern || a.errorPattern === "unknown-error") continue;
    counts[a.errorPattern] = (counts[a.errorPattern] || 0) + 1;
  }
  return counts;
}

/**
 * Orders a skill's topic catalog: topics whose errorPatterns match something actually
 * detected come first (ranked by how often that pattern occurred), then everything
 * else by difficulty ascending — the "general difficulty" fallback for topics with no
 * error-pattern data yet (e.g. nothing in the catalog tags a pattern for it).
 */
function prioritizeTopics(topics, patternCounts) {
  const scoreFor = (topic) => {
    const hits = topic.errorPatterns.map((p) => patternCounts[p] || 0);
    return hits.length ? Math.max(...hits) : 0;
  };
  return [...topics].sort((a, b) => {
    const scoreDiff = scoreFor(b) - scoreFor(a); // higher error-pattern signal first
    if (scoreDiff !== 0) return scoreDiff;
    return a.difficulty - b.difficulty; // fallback: easier first
  });
}

/**
 * Builds (or rebuilds) the roadmap for one weak skill, prioritizing topics tied to
 * error patterns actually seen in `attempts`. Preserves prior completion: a topic
 * that was already marked done stays done if it's still in the new order.
 */
export async function assignOrUpdateRoadmap(studentId, subject, skill, attempts = []) {
  const existing = await repo.getStudentRoadmap(studentId, subject, skill);
  if (existing?.level === 2) return existing; // terminal for this MVP — see design notes

  const catalog = getRoadmapTopics(subject, skill);
  if (catalog.length === 0) return existing; // no curriculum content for this skill yet

  const patternCounts = errorPatternCounts(attempts, skill);
  const ordered = prioritizeTopics(catalog, patternCounts);
  const topicOrder = ordered.map((t) => t.id);
  const previouslyCompleted = new Set(existing?.completedTopics ?? []);
  const completedTopics = topicOrder.filter((id) => previouslyCompleted.has(id));

  return repo.saveStudentRoadmap(studentId, subject, skill, {
    topicOrder,
    completedTopics,
    level: existing?.level ?? 1,
    level2Attempts: existing?.level2Attempts ?? [],
  });
}

/** Called after a test result comes in: (re)assigns a roadmap for every skill in the
 *  subject that's currently weak AND has actually been tested, using the attempts
 *  from that submission for error-pattern signal. Skills that are fine are left
 *  alone — and so is a skill merely sitting at the untested default score (50,
 *  itself < the 60 weak threshold): nothing has confirmed a real weakness there
 *  yet, so it shouldn't get a roadmap just because it's never been touched. Same
 *  "only count what's genuinely been tested" rule insights.js's weakestTestedSkill
 *  already applies to the parent dashboard — see its comment for the reasoning. */
export async function assignRoadmapsForWeakSkills(studentId, subject, skillProfile, attempts = []) {
  const skills = skillsForSubject(subject);
  const bucket = subject === "literacy" ? skillProfile.literacy : skillProfile.numeracy;
  const testedInThisBatch = new Set(attempts.filter((a) => a.subject === subject).map((a) => a.skill));
  const results = [];
  for (const skill of skills) {
    if (!isWeak(bucket[skill])) continue;
    const wasTested = testedInThisBatch.has(skill) || (await repo.getAttempts(studentId, { subject, skill })).length > 0;
    if (!wasTested) continue;
    results.push(await assignOrUpdateRoadmap(studentId, subject, skill, attempts));
  }
  return results;
}

export function eligibleForLevel2(roadmap) {
  if (!roadmap || roadmap.topicOrder.length === 0) return false;
  return roadmap.completedTopics.length === roadmap.topicOrder.length;
}

// "A while" without attempting an unlocked Level 2 test, for the teacher
// "needs attention" flag below. Not a hard rule — just what counts as stale enough
// to surface to a teacher rather than silently wait.
const STALE_ELIGIBLE_DAYS = 7;

/**
 * Flags a roadmap for teacher attention: either the student has failed Level 2 more
 * than once (may need help with something a topic checklist alone didn't fix), or
 * they've been sitting on full eligibility without attempting it. Pure function over
 * already-loaded roadmap data — no I/O, so it's cheap to compute for an entire class
 * roster on every dashboard load.
 */
export function needsAttention(roadmap) {
  if (!roadmap) return { flagged: false, reason: null };

  const failedAttempts = roadmap.level2Attempts.filter((a) => !a.passed).length;
  if (failedAttempts >= 2) return { flagged: true, reason: "failed Level 2 more than once" };

  if (eligibleForLevel2(roadmap) && roadmap.level === 1) {
    const lastAttempt = roadmap.level2Attempts[roadmap.level2Attempts.length - 1];
    const since = lastAttempt ? new Date(lastAttempt.date) : new Date(roadmap.updatedAt);
    const daysSince = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= STALE_ELIGIBLE_DAYS) {
      return { flagged: true, reason: `eligible for Level 2 but hasn't attempted it in ${Math.floor(daysSince)} days` };
    }
  }

  return { flagged: false, reason: null };
}

/** Marks one topic complete/incomplete and recalculates Level 2 eligibility. */
export async function setTopicStatus(studentId, subject, skill, topicId, complete) {
  const roadmap = await repo.getStudentRoadmap(studentId, subject, skill);
  if (!roadmap) throw Object.assign(new Error("No roadmap exists for this student/skill yet"), { status: 404 });
  if (!roadmap.topicOrder.includes(topicId)) {
    throw Object.assign(new Error("That topic isn't part of this student's current roadmap"), { status: 400 });
  }

  const completedSet = new Set(roadmap.completedTopics);
  if (complete) completedSet.add(topicId);
  else completedSet.delete(topicId);
  // Keep completedTopics in topicOrder's order, not insertion order — cosmetic, but
  // makes it trivial to display "done" topics in the same sequence as the roadmap.
  const completedTopics = roadmap.topicOrder.filter((id) => completedSet.has(id));

  const updated = await repo.saveStudentRoadmap(studentId, subject, skill, {
    topicOrder: roadmap.topicOrder,
    completedTopics,
    level: roadmap.level,
    level2Attempts: roadmap.level2Attempts,
  });
  return { roadmap: updated, eligibleForLevel2: eligibleForLevel2(updated) };
}

/**
 * Records a Level 2 test outcome.
 * - Pass: skill leveled up (level = 2), terminal for this MVP.
 * - Fail: only the specifically missed topics are reopened (removed from
 *   completedTopics) — the rest of the roadmap stays complete, per the spec ("not the
 *   entire roadmap"). `missedTopicIds` is caller-supplied because no Level 2 test
 *   exists yet anywhere in the app to derive it from automatically — see design notes.
 */
/** Throws if `roadmap` isn't in a state that may attempt (or have attempted-for-it
 *  recorded) a Level 2 test — the one place this rule lives, used both by
 *  processLevel2Submit (checked BEFORE grading/persisting anything, so a rejected
 *  attempt leaves no side effects) and by recordLevel2Result itself (defense in
 *  depth for its manual-override callers). */
export function assertEligibleForLevel2(roadmap) {
  if (!roadmap) throw Object.assign(new Error("No roadmap exists for this student/skill yet"), { status: 404 });
  if (roadmap.level === 2) throw Object.assign(new Error("This skill is already at Level 2"), { status: 409 });
  if (!eligibleForLevel2(roadmap)) {
    throw Object.assign(new Error("Not eligible for the Level 2 test yet — finish every topic first"), { status: 403 });
  }
}

export async function recordLevel2Result(studentId, subject, skill, passed, missedTopicIds = []) {
  const roadmap = await repo.getStudentRoadmap(studentId, subject, skill);
  assertEligibleForLevel2(roadmap);

  const level2Attempts = [...roadmap.level2Attempts, { passed, date: new Date().toISOString() }];

  if (passed) {
    return repo.saveStudentRoadmap(studentId, subject, skill, {
      topicOrder: roadmap.topicOrder,
      completedTopics: roadmap.completedTopics,
      level: 2,
      level2Attempts,
    });
  }

  const missedSet = new Set(missedTopicIds);
  const completedTopics = roadmap.completedTopics.filter((id) => !missedSet.has(id));
  return repo.saveStudentRoadmap(studentId, subject, skill, {
    topicOrder: roadmap.topicOrder,
    completedTopics,
    level: 1,
    level2Attempts,
  });
}

/** Joins a stored roadmap with topic labels/metadata from the catalog, for API responses. */
export function hydrateRoadmap(roadmap, subject, skill) {
  const catalog = getRoadmapTopics(subject, skill);
  const byId = Object.fromEntries(catalog.map((t) => [t.id, t]));
  const completedSet = new Set(roadmap?.completedTopics ?? []);
  const topics = (roadmap?.topicOrder ?? []).map((id) => ({
    ...byId[id],
    complete: completedSet.has(id),
  }));
  return {
    studentId: roadmap?.studentId ?? null,
    subject,
    skill,
    topics,
    level: roadmap?.level ?? 1,
    level2Attempts: roadmap?.level2Attempts ?? [],
    eligibleForLevel2: eligibleForLevel2(roadmap),
    ...needsAttention(roadmap),
  };
}
