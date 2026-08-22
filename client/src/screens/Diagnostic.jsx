import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChildScreen } from "../components/ui.jsx";
import { QuestionRunner } from "../components/QuestionRunner.jsx";
import { useApp } from "../context/AppContext.jsx";
import { getQuestionsForSkill } from "../lib/questionBank.js";
import { skillsForSubject, hasRepeatedErrors, applyAttemptsToProfile, pickWeakestSkill, masteryTier } from "../lib/adaptiveEngine.js";
import { recordDiagnostic } from "../lib/api.js";
import { addLocalSession } from "../lib/offlineStore.js";

function pickQuestion(subject, skill, targetDifficulty, excludeIds) {
  const pool = getQuestionsForSkill(subject, skill).filter((q) => !excludeIds.includes(q.id));
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty))[0];
}

const SUBJECT_TITLE = { literacy: "Reading Quick Check", numeracy: "Math Quick Check" };

export default function Diagnostic() {
  const { subject } = useParams();
  const navigate = useNavigate();
  const { student, skillProfile, updateSkillProfile } = useApp();
  const skills = skillsForSubject(subject);

  const [session, setSession] = useState(() => {
    const firstQuestion = pickQuestion(subject, skills[0], 2, []);
    return { skillIndex: 0, askedIds: [firstQuestion.id], attempts: [], question: firstQuestion };
  });

  function finish(attempts) {
    const updatedProfile = applyAttemptsToProfile(skillProfile, attempts);
    updateSkillProfile(updatedProfile);
    const weakestSkill = pickWeakestSkill(updatedProfile, subject);
    const weakestScore = updatedProfile[subject][weakestSkill];

    if (student?.studentId) {
      recordDiagnostic(student.studentId, {
        subject,
        attempts: attempts.map(({ questionId, answer, responseTimeMs }) => ({ questionId, answer, responseTimeMs })),
      });
    }

    addLocalSession({
      type: "diagnostic",
      subject,
      skill: null,
      completedAt: new Date().toISOString(),
      questionCount: attempts.length,
      correctCount: attempts.filter((a) => a.correct).length,
      starsEarned: attempts.filter((a) => a.correct).length,
      skillScoreBefore: null,
      skillScoreAfter: null,
    });

    navigate("/diagnostic-result", {
      state: { subject, weakestSkill, weakestScore, tier: masteryTier(weakestScore), stoppedEarly: attempts.length < skills.length * 2 },
    });
  }

  function handleNext(attempt) {
    const attempts = [...session.attempts, attempt];

    if (hasRepeatedErrors(attempts.map((a) => a.correct))) {
      finish(attempts);
      return;
    }

    const currentSkill = skills[session.skillIndex];
    const askedForCurrentSkill = attempts.filter((a) => a.skill === currentSkill).length;

    if (askedForCurrentSkill === 1) {
      const nextDifficulty = attempt.correct ? Math.min(3, attempt.difficulty + 1) : Math.max(1, attempt.difficulty - 1);
      const q2 = pickQuestion(subject, currentSkill, nextDifficulty, session.askedIds);
      setSession({ ...session, attempts, askedIds: [...session.askedIds, q2.id], question: q2 });
      return;
    }

    const nextSkillIndex = session.skillIndex + 1;
    if (nextSkillIndex >= skills.length) {
      finish(attempts);
      return;
    }
    const nextSkill = skills[nextSkillIndex];
    const q1 = pickQuestion(subject, nextSkill, 2, session.askedIds);
    setSession({ skillIndex: nextSkillIndex, attempts, askedIds: [...session.askedIds, q1.id], question: q1 });
  }

  return (
    <ChildScreen>
      <h1 className="text-xl font-extrabold text-center text-ink/70 mb-4">{SUBJECT_TITLE[subject]}</h1>
      <QuestionRunner
        question={session.question}
        progressCurrent={session.attempts.length}
        progressTotal={skills.length * 2}
        onNext={handleNext}
      />
    </ChildScreen>
  );
}
