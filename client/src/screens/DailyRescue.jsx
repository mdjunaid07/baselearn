import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChildScreen } from "../components/ui.jsx";
import { QuestionRunner } from "../components/QuestionRunner.jsx";
import { useApp } from "../context/AppContext.jsx";
import { getQuestionsForSkill, SKILL_LABELS } from "../lib/questionBank.js";
import { pickWeakestSkill, startingDifficulty, nextDifficulty, applyAttemptsToProfile, masteryTier } from "../lib/adaptiveEngine.js";
import { recordRescue } from "../lib/api.js";
import { addLocalSession } from "../lib/offlineStore.js";

const SESSION_LENGTH = 5;
const TIER_ORDER = ["seed", "sprout", "sapling", "bloom"];

function pickQuestion(subject, skill, targetDifficulty, excludeIds) {
  const pool = getQuestionsForSkill(subject, skill).filter((q) => !excludeIds.includes(q.id));
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty))[0];
}

export default function DailyRescue() {
  const { subject } = useParams();
  const navigate = useNavigate();
  const { student, skillProfile, updateSkillProfile } = useApp();

  const [session, setSession] = useState(() => {
    const skill = pickWeakestSkill(skillProfile, subject);
    const difficulty = startingDifficulty(skillProfile[subject][skill]);
    const question = pickQuestion(subject, skill, difficulty, []);
    return { skill, difficulty, askedIds: [question.id], attempts: [], question };
  });

  function finish(attempts) {
    const before = skillProfile[subject][session.skill];
    const updatedProfile = applyAttemptsToProfile(skillProfile, attempts);
    updateSkillProfile(updatedProfile);
    const after = updatedProfile[subject][session.skill];
    const correctCount = attempts.filter((a) => a.correct).length;

    if (student?.studentId) {
      recordRescue(student.studentId, {
        subject,
        skill: session.skill,
        attempts: attempts.map(({ questionId, answer, responseTimeMs }) => ({ questionId, answer, responseTimeMs })),
      });
    }

    const tierBefore = masteryTier(before).tier;
    const tierAfterInfo = masteryTier(after);
    const badge = TIER_ORDER.indexOf(tierAfterInfo.tier) > TIER_ORDER.indexOf(tierBefore) ? `${SKILL_LABELS[session.skill]} ${tierAfterInfo.label}` : null;

    addLocalSession({
      type: "rescue",
      subject,
      skill: session.skill,
      completedAt: new Date().toISOString(),
      questionCount: attempts.length,
      correctCount,
      starsEarned: correctCount,
      skillScoreBefore: before,
      skillScoreAfter: after,
    });

    navigate("/session-complete", {
      state: { subject, skill: session.skill, before, after, correctCount, total: attempts.length, badge },
    });
  }

  function handleNext(attempt) {
    const attempts = [...session.attempts, attempt];
    if (attempts.length >= SESSION_LENGTH) {
      finish(attempts);
      return;
    }
    const difficulty = nextDifficulty(session.difficulty, attempts.map((a) => a.correct));
    const question = pickQuestion(subject, session.skill, difficulty, session.askedIds);
    setSession({ ...session, attempts, difficulty, askedIds: [...session.askedIds, question.id], question });
  }

  return (
    <ChildScreen>
      <h1 className="text-xl font-extrabold text-center text-ink/70 mb-4">Today's Rescue: {SKILL_LABELS[session.skill]}</h1>
      <QuestionRunner
        question={session.question}
        progressCurrent={session.attempts.length}
        progressTotal={SESSION_LENGTH}
        onNext={handleNext}
      />
    </ChildScreen>
  );
}
