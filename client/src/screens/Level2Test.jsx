import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChildScreen, LoadingSprout, BigButton } from "../components/ui.jsx";
import { QuestionRunner } from "../components/QuestionRunner.jsx";
import { CameraConsentNotice } from "../components/CameraConsentNotice.jsx";
import { useApp } from "../context/AppContext.jsx";
import { getLevel2QuestionsForSkill } from "../lib/level2QuestionBank.js";
import { SKILL_LABELS } from "../lib/questionBank.js";
import { submitLevel2Test } from "../lib/api.js";
import { useTestMonitor } from "../lib/useTestMonitor.js";

/** Reuses QuestionRunner exactly like Diagnostic.jsx/DailyRescue.jsx do — this screen
 *  only owns which question is current and collects attempts; grading feedback and
 *  question rendering are 100% the existing component, unchanged. */
export default function Level2Test() {
  const { subject, skill } = useParams();
  const navigate = useNavigate();
  const { student, studentToken } = useApp();
  const [questions] = useState(() => getLevel2QuestionsForSkill(subject, skill));
  const [sessionId] = useState(() => crypto.randomUUID());
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState([]);
  // The exact set last handed to finish() — separate from `attempts` state, which
  // never gets a final setAttempts() call for the very last question (finish() is
  // called with it directly). Retry-on-failure needs this, not the (stale-by-one)
  // `attempts` state.
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { warning } = useTestMonitor({
    isActive: questions.length > 0,
    studentId: student?.studentId,
    studentToken,
    sessionId,
  });

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

  function handleNext(attempt) {
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
      <CameraConsentNotice />
      {warning && (
        <div className="bg-marigold/10 border border-marigold/30 rounded-xl2 p-3 mb-4 text-center text-sm font-semibold text-marigold-dark">
          Stay visible and on this tab.
        </div>
      )}
      <h1 className="text-xl font-extrabold text-center text-ink/70 mb-4">Level 2 Test: {SKILL_LABELS[skill] ?? skill}</h1>
      <QuestionRunner question={questions[index]} progressCurrent={index} progressTotal={questions.length} onNext={handleNext} />
    </ChildScreen>
  );
}
