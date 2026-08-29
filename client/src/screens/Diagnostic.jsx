import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChildScreen, BigButton } from "../components/ui.jsx";
import { QuestionRunner } from "../components/QuestionRunner.jsx";
import { CameraConsentNotice } from "../components/CameraConsentNotice.jsx";
import { useApp } from "../context/AppContext.jsx";
import { getQuestionsForSkill } from "../lib/questionBank.js";
import { skillsForSubject, hasRepeatedErrors, applyAttemptsToProfile, pickWeakestSkill, masteryTier } from "../lib/adaptiveEngine.js";
import { recordDiagnostic, recordTermination, trySync } from "../lib/api.js";
import { addLocalSession, enqueueSyncEvent } from "../lib/offlineStore.js";
import { useTestMonitor } from "../lib/useTestMonitor.js";
import { useLockdownTest } from "../lib/useLockdownTest.js";

function pickQuestion(subject, skill, targetDifficulty, excludeIds) {
  const pool = getQuestionsForSkill(subject, skill).filter((q) => !excludeIds.includes(q.id));
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty))[0];
}

function buildSession(subject, skills) {
  const firstQuestion = pickQuestion(subject, skills[0], 2, []);
  return { skillIndex: 0, askedIds: [firstQuestion.id], attempts: [], question: firstQuestion, sessionId: crypto.randomUUID() };
}

const SUBJECT_TITLE = { literacy: "Reading Quick Check", numeracy: "Math Quick Check" };

const TERMINATION_MESSAGE = {
  fullscreen_exit: "That attempt ended because you left fullscreen.",
  timeout: "That attempt ended because time ran out on a question.",
};

export default function Diagnostic() {
  const { subject } = useParams();
  const navigate = useNavigate();
  const { student, studentToken, skillProfile, updateSkillProfile } = useApp();
  const skills = skillsForSubject(subject);

  const [session, setSession] = useState(() => buildSession(subject, skills));
  const [phase, setPhase] = useState("idle"); // "idle" | "active"
  const [terminationReason, setTerminationReason] = useState(null);
  const [startError, setStartError] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const { warning } = useTestMonitor({
    isActive: phase === "active",
    studentId: student?.studentId,
    studentToken,
    sessionId: session.sessionId,
  });

  function handleTerminate(reason) {
    if (student?.studentId && studentToken) {
      recordTermination(student.studentId, studentToken, {
        type: "diagnostic",
        subject,
        skill: null,
        sessionId: session.sessionId,
        reason,
      });
      enqueueSyncEvent({
        type: "proctoring",
        payload: { studentId: student.studentId, sessionId: session.sessionId, eventType: reason, createdAt: new Date().toISOString() },
      });
      trySync(student.studentId, studentToken);
    }
    setTerminationReason(reason);
    setPhase("idle");
  }

  const { secondsLeft, enterFullscreenLockdown } = useLockdownTest({
    isActive: phase === "active",
    hasAnsweredCurrent: hasAnswered,
    questionKey: session.question?.id,
    onTerminate: handleTerminate,
  });

  async function handleStart() {
    setStartError(null);
    const ok = await enterFullscreenLockdown();
    if (!ok) {
      setStartError("Fullscreen is required to start this test — please allow it and try again.");
      return;
    }
    setSession(buildSession(subject, skills));
    setHasAnswered(false);
    setPhase("active");
  }

  function finish(attempts) {
    const updatedProfile = applyAttemptsToProfile(skillProfile, attempts);
    updateSkillProfile(updatedProfile);
    const weakestSkill = pickWeakestSkill(updatedProfile, subject);
    const weakestScore = updatedProfile[subject][weakestSkill];

    if (student?.studentId && studentToken) {
      recordDiagnostic(student.studentId, studentToken, {
        subject,
        sessionId: session.sessionId,
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

  function handleAnswered() {
    setHasAnswered(true);
  }

  function handleNext(attempt) {
    setHasAnswered(false);
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
    setSession({ ...session, skillIndex: nextSkillIndex, attempts, askedIds: [...session.askedIds, q1.id], question: q1 });
  }

  if (phase === "idle") {
    return (
      <ChildScreen className="items-center justify-center text-center">
        <CameraConsentNotice />
        <h1 className="text-xl font-extrabold text-ink/70 mb-2">{SUBJECT_TITLE[subject]}</h1>
        <p className="text-sm text-ink/60 font-semibold mb-4 max-w-xs mx-auto">
          This test locks to fullscreen and gives 20 seconds per question. Leaving fullscreen or running out of time ends the attempt.
        </p>
        {terminationReason && <p className="text-coral-dark text-sm font-semibold mb-4">{TERMINATION_MESSAGE[terminationReason]}</p>}
        {startError && <p className="text-coral-dark text-sm font-semibold mb-4">{startError}</p>}
        <BigButton onClick={handleStart}>Start Test</BigButton>
      </ChildScreen>
    );
  }

  return (
    <ChildScreen>
      {warning && (
        <div className="bg-marigold/10 border border-marigold/30 rounded-xl2 p-3 mb-4 text-center text-sm font-semibold text-marigold-dark">
          Stay visible and on this tab.
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold text-ink/70">{SUBJECT_TITLE[subject]}</h1>
        <span className="text-sm font-extrabold text-ink/50 tabular-nums">{secondsLeft}s</span>
      </div>
      <QuestionRunner
        question={session.question}
        progressCurrent={session.attempts.length}
        progressTotal={skills.length * 2}
        onNext={handleNext}
        onAnswered={handleAnswered}
      />
    </ChildScreen>
  );
}
