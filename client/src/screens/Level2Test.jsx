import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChildScreen, LoadingSprout, BigButton } from "../components/ui.jsx";
import { QuestionRunner } from "../components/QuestionRunner.jsx";
import { CameraConsentNotice } from "../components/CameraConsentNotice.jsx";
import { useApp } from "../context/AppContext.jsx";
import { getLevel2QuestionsForSkill } from "../lib/level2QuestionBank.js";
import { SKILL_LABELS } from "../lib/questionBank.js";
import { submitLevel2Test, recordTermination, trySync } from "../lib/api.js";
import { enqueueSyncEvent } from "../lib/offlineStore.js";
import { useTestMonitor } from "../lib/useTestMonitor.js";
import { useLockdownTest } from "../lib/useLockdownTest.js";

const TERMINATION_MESSAGE = {
  fullscreen_exit: "That attempt ended because you left fullscreen.",
  timeout: "That attempt ended because time ran out on a question.",
};

/** Reuses QuestionRunner exactly like Diagnostic.jsx/DailyRescue.jsx do — this screen
 *  only owns which question is current and collects attempts; grading feedback and
 *  question rendering are 100% the existing component, unchanged. */
export default function Level2Test() {
  const { subject, skill } = useParams();
  const navigate = useNavigate();
  const { student, studentToken } = useApp();
  const [questions] = useState(() => getLevel2QuestionsForSkill(subject, skill));
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [phase, setPhase] = useState("idle"); // "idle" | "active"
  const [terminationReason, setTerminationReason] = useState(null);
  const [startError, setStartError] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState([]);
  // The exact set last handed to finish() — separate from `attempts` state, which
  // never gets a final setAttempts() call for the very last question (finish() is
  // called with it directly). Retry-on-failure needs this, not the (stale-by-one)
  // `attempts` state.
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const lockdownActive = phase === "active" && !submitting && !error;

  const { warning } = useTestMonitor({
    isActive: lockdownActive,
    studentId: student?.studentId,
    studentToken,
    sessionId,
  });

  function handleTerminate(reason) {
    if (student?.studentId && studentToken) {
      recordTermination(student.studentId, studentToken, { type: "level2", subject, skill, sessionId, reason });
      enqueueSyncEvent({
        type: "proctoring",
        payload: { studentId: student.studentId, sessionId, eventType: reason, createdAt: new Date().toISOString() },
      });
      trySync(student.studentId, studentToken);
    }
    setTerminationReason(reason);
    setPhase("idle");
  }

  const { secondsLeft, enterFullscreenLockdown } = useLockdownTest({
    isActive: lockdownActive,
    hasAnsweredCurrent: hasAnswered,
    questionKey: questions[index]?.id,
    onTerminate: handleTerminate,
  });

  async function handleStart() {
    setStartError(null);
    const ok = await enterFullscreenLockdown();
    if (!ok) {
      setStartError("Fullscreen is required to start this test — please allow it and try again.");
      return;
    }
    setSessionId(crypto.randomUUID());
    setIndex(0);
    setAttempts([]);
    setHasAnswered(false);
    setPhase("active");
  }

  async function finish(allAttempts) {
    setPendingSubmit(allAttempts);
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitLevel2Test(student.studentId, studentToken, subject, skill, {
        sessionId,
        attempts: allAttempts.map(({ questionId, answer, responseTimeMs }) => ({ questionId, answer, responseTimeMs })),
      });
      navigate("/study-plan/level2-result", { state: { subject, skill, ...result } });
    } catch {
      setError("Couldn't submit your test — check your connection and try again.");
      setSubmitting(false);
    }
  }

  function handleAnswered() {
    setHasAnswered(true);
  }

  function handleNext(attempt) {
    setHasAnswered(false);
    const next = [...attempts, attempt];
    if (index + 1 >= questions.length) {
      finish(next);
      return;
    }
    setAttempts(next);
    setIndex(index + 1);
  }

  if (questions.length === 0) {
    return (
      <ChildScreen className="items-center justify-center text-center">
        <p className="font-bold text-ink/60">There's no Level 2 test set up for this skill yet.</p>
      </ChildScreen>
    );
  }

  if (phase === "idle") {
    return (
      <ChildScreen className="items-center justify-center text-center">
        <CameraConsentNotice />
        <h1 className="text-xl font-extrabold text-ink/70 mb-2">Level 2 Test: {SKILL_LABELS[skill] ?? skill}</h1>
        <p className="text-sm text-ink/60 font-semibold mb-4 max-w-xs mx-auto">
          This test locks to fullscreen and gives 20 seconds per question. Leaving fullscreen or running out of time ends the attempt.
        </p>
        {terminationReason && <p className="text-coral-dark text-sm font-semibold mb-4">{TERMINATION_MESSAGE[terminationReason]}</p>}
        {startError && <p className="text-coral-dark text-sm font-semibold mb-4">{startError}</p>}
        <BigButton onClick={handleStart}>Start Test</BigButton>
      </ChildScreen>
    );
  }

  if (submitting) {
    return (
      <ChildScreen>
        <LoadingSprout label="Checking your answers..." />
      </ChildScreen>
    );
  }

  // A failed submit replaces the (already-answered) last question entirely, rather
  // than falling through to re-render it underneath the error — QuestionRunner has
  // no "already submitted" state to show there.
  if (error) {
    return (
      <ChildScreen className="items-center justify-center text-center">
        <p className="text-coral-dark font-semibold mb-4">{error}</p>
        <BigButton onClick={() => finish(pendingSubmit)}>Try again</BigButton>
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
        <h1 className="text-xl font-extrabold text-ink/70">Level 2 Test: {SKILL_LABELS[skill] ?? skill}</h1>
        <span className="text-sm font-extrabold text-ink/50 tabular-nums">{secondsLeft}s</span>
      </div>
      <QuestionRunner
        question={questions[index]}
        progressCurrent={index}
        progressTotal={questions.length}
        onNext={handleNext}
        onAnswered={handleAnswered}
      />
    </ChildScreen>
  );
}
