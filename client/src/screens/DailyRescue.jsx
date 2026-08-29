import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChildScreen, BigButton } from "../components/ui.jsx";
import { QuestionRunner } from "../components/QuestionRunner.jsx";
import { CameraConsentNotice } from "../components/CameraConsentNotice.jsx";
import { useApp } from "../context/AppContext.jsx";
import { getQuestionsForSkill, SKILL_LABELS } from "../lib/questionBank.js";
import { pickWeakestSkill, startingDifficulty, nextDifficulty, applyAttemptsToProfile, masteryTier } from "../lib/adaptiveEngine.js";
import { recordRescue, recordTermination, trySync } from "../lib/api.js";
import { addLocalSession, enqueueSyncEvent } from "../lib/offlineStore.js";
import { useTestMonitor } from "../lib/useTestMonitor.js";
import { useLockdownTest } from "../lib/useLockdownTest.js";

const SESSION_LENGTH = 5;
const TIER_ORDER = ["seed", "sprout", "sapling", "bloom"];

const TERMINATION_MESSAGE = {
  fullscreen_exit: "That attempt ended because you left fullscreen.",
  timeout: "That attempt ended because time ran out on a question.",
};

function pickQuestion(subject, skill, targetDifficulty, excludeIds) {
  const pool = getQuestionsForSkill(subject, skill).filter((q) => !excludeIds.includes(q.id));
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty))[0];
}

function buildSession(subject, skillProfile) {
  const skill = pickWeakestSkill(skillProfile, subject);
  const difficulty = startingDifficulty(skillProfile[subject][skill]);
  const question = pickQuestion(subject, skill, difficulty, []);
  return { skill, difficulty, askedIds: [question.id], attempts: [], question, sessionId: crypto.randomUUID() };
}

export default function DailyRescue() {
  const { subject } = useParams();
  const navigate = useNavigate();
  const { student, studentToken, skillProfile, updateSkillProfile } = useApp();

  const [session, setSession] = useState(() => buildSession(subject, skillProfile));
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
        type: "rescue",
        subject,
        skill: session.skill,
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
    setSession(buildSession(subject, skillProfile));
    setHasAnswered(false);
    setPhase("active");
  }

  function finish(attempts) {
    const before = skillProfile[subject][session.skill];
    const updatedProfile = applyAttemptsToProfile(skillProfile, attempts);
    updateSkillProfile(updatedProfile);
    const after = updatedProfile[subject][session.skill];
    const correctCount = attempts.filter((a) => a.correct).length;

    if (student?.studentId && studentToken) {
      recordRescue(student.studentId, studentToken, {
        subject,
        skill: session.skill,
        sessionId: session.sessionId,
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

  function handleAnswered() {
    setHasAnswered(true);
  }

  function handleNext(attempt) {
    setHasAnswered(false);
    const attempts = [...session.attempts, attempt];
    if (attempts.length >= SESSION_LENGTH) {
      finish(attempts);
      return;
    }
    const difficulty = nextDifficulty(session.difficulty, attempts.map((a) => a.correct));
    const question = pickQuestion(subject, session.skill, difficulty, session.askedIds);
    setSession({ ...session, attempts, difficulty, askedIds: [...session.askedIds, question.id], question });
  }

  if (phase === "idle") {
    return (
      <ChildScreen className="items-center justify-center text-center">
        <CameraConsentNotice />
        <h1 className="text-xl font-extrabold text-ink/70 mb-2">Today's Rescue</h1>
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
        <h1 className="text-xl font-extrabold text-ink/70">Today's Rescue: {SKILL_LABELS[session.skill]}</h1>
        <span className="text-sm font-extrabold text-ink/50 tabular-nums">{secondsLeft}s</span>
      </div>
      <QuestionRunner
        question={session.question}
        progressCurrent={session.attempts.length}
        progressTotal={SESSION_LENGTH}
        onNext={handleNext}
        onAnswered={handleAnswered}
      />
    </ChildScreen>
  );
}
