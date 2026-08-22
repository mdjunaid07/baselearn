// Parent-facing summaries, built from templates over real numbers — not a model call.
// This is the one place in the brief that could plausibly be "an LLM writes a nice
// sentence", and it's deliberately not, so the parent dashboard works fully offline
// and never depends on an API key being configured at demo time. See DESIGN.md for
// the reasoning and where a real LLM call would slot in later if wanted.
import { SKILL_LABELS, ERROR_PATTERN_LABELS, LITERACY_SKILLS, NUMERACY_SKILLS } from "../data/questionBank.js";
import { masteryTier } from "./adaptiveEngine.js";

function trendFromSessions(rescueSessions, skill) {
  const forSkill = rescueSessions.filter((s) => s.skill === skill);
  if (forSkill.length < 2) return "new";
  const first = forSkill[0].skillScoreAfter;
  const last = forSkill[forSkill.length - 1].skillScoreAfter;
  if (last - first >= 8) return "improving";
  if (last - first <= -8) return "slipping";
  return "steady";
}

function mostCommonErrorPattern(attempts, skill) {
  const counts = {};
  for (const a of attempts) {
    if (a.skill !== skill || a.correct || !a.errorPattern || a.errorPattern === "unknown-error") continue;
    counts[a.errorPattern] = (counts[a.errorPattern] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : null;
}

function testedSkillSet(attempts) {
  return new Set(attempts.map((a) => `${a.subject}:${a.skill}`));
}

/** Weakest skill *among skills actually attempted at least once* — an untested skill
 *  defaults to the same neutral 50 as everything else, so it must never outrank a skill
 *  a diagnostic has genuinely confirmed is shaky. Returns null if nothing in this
 *  subject has been tried yet. */
function weakestTestedSkill(skillProfile, subject, tested) {
  const skills = subject === "literacy" ? LITERACY_SKILLS : NUMERACY_SKILLS;
  const bucket = subject === "literacy" ? skillProfile.literacy : skillProfile.numeracy;
  const candidates = skills.filter((s) => tested.has(`${subject}:${s}`));
  if (candidates.length === 0) return null;
  return candidates.reduce((weakest, s) => (bucket[s] < bucket[weakest] ? s : weakest), candidates[0]);
}

/**
 * Builds the parent dashboard's plain-language summary from a skill profile,
 * recent sessions, and the raw attempt log. Every sentence is templated over
 * real values — nothing here is generated free-form.
 */
export function buildParentInsight({ nickname, skillProfile, sessions, attempts }) {
  const tested = testedSkillSet(attempts);
  const literacyWeak = weakestTestedSkill(skillProfile, "literacy", tested);
  const numeracyWeak = weakestTestedSkill(skillProfile, "numeracy", tested);

  if (!literacyWeak && !numeracyWeak) {
    return {
      focusSubject: null,
      focusSkill: null,
      focusScore: null,
      tier: null,
      headline: `${nickname} hasn't done a diagnostic yet.`,
      detail: "Run a quick 2-4 minute diagnostic to see a personalized skill map.",
      recommendation: "Start with either Literacy or Numeracy — whichever sounds more fun today.",
    };
  }

  let focusSubject;
  if (literacyWeak && numeracyWeak) {
    focusSubject = skillProfile.literacy[literacyWeak] <= skillProfile.numeracy[numeracyWeak] ? "literacy" : "numeracy";
  } else {
    focusSubject = literacyWeak ? "literacy" : "numeracy";
  }
  const focusSkill = focusSubject === "literacy" ? literacyWeak : numeracyWeak;
  const focusScore = skillProfile[focusSubject][focusSkill];

  const rescueSessions = sessions.filter((s) => s.type === "rescue");
  const trend = trendFromSessions(rescueSessions, focusSkill);
  const commonError = mostCommonErrorPattern(attempts, focusSkill);
  const tier = masteryTier(focusScore);
  const skillLabel = SKILL_LABELS[focusSkill] ?? focusSkill;

  const trendSentence = {
    improving: `${nickname} has been improving here — practice is paying off.`,
    steady: `${nickname} is holding steady here — a few more short sessions should move the needle.`,
    slipping: `${nickname}'s score dipped a little on the last few tries — worth a slower, easier warm-up next time.`,
    new: `${nickname} hasn't practiced this one yet — a good place to start today.`,
  }[trend];

  const errorSentence = commonError
    ? `The most common pattern lately: ${ERROR_PATTERN_LABELS[commonError] ?? commonError}.`
    : null;

  const recommendation = `Try a 3-5 minute Daily Rescue on ${skillLabel} — short, low-pressure, and targeted right at this gap.`;

  return {
    focusSubject,
    focusSkill,
    focusScore,
    tier,
    headline: `${nickname}'s biggest opportunity right now: ${skillLabel} (${tier.label.toLowerCase()} stage).`,
    detail: [trendSentence, errorSentence].filter(Boolean).join(" "),
    recommendation,
  };
}
