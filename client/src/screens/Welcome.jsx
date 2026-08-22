import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { ChildScreen, BigButton, GrowthPlant, LoadingSprout } from "../components/ui.jsx";
import { useApp, DEMO_STUDENT_ID, DEMO_STUDENT_PIN } from "../context/AppContext.jsx";

export default function Welcome() {
  const navigate = useNavigate();
  const { student, authChecked, studentLogin, studentLogout } = useApp();
  const [demoError, setDemoError] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);

  /** Same code path as any other student login — just pre-filled with the seeded
   *  demo account's real credentials, not a client-side shortcut around auth. */
  async function handleViewDemo() {
    setDemoError(null);
    setDemoLoading(true);
    try {
      await studentLogin({ studentId: DEMO_STUDENT_ID, pin: DEMO_STUDENT_PIN });
      navigate("/dashboard");
    } catch {
      setDemoError("The sample profile needs an internet connection the first time it's viewed.");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <ChildScreen className="items-center justify-between text-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <GrowthPlant score={72} size={140} showLabel={false} />
        <div>
          <h1 className="text-4xl font-extrabold text-ink mb-2">Let's Grow!</h1>
          <p className="text-lg text-ink/70 font-semibold max-w-xs">
            Short reading and number games, just for you.
          </p>
        </div>
      </div>

      {!authChecked ? (
        <LoadingSprout label="Checking your session..." />
      ) : (
        <div className="w-full max-w-sm space-y-3">
          {student ? (
            <>
              <BigButton onClick={() => navigate("/subject")}>Continue, {student.nickname}!</BigButton>
              <button onClick={studentLogout} className="text-ink/40 text-sm font-semibold underline underline-offset-4">
                Not you? Log out
              </button>
            </>
          ) : (
            <>
              <BigButton onClick={() => navigate("/profile")}>Start</BigButton>
              <BigButton variant="secondary" onClick={() => navigate("/student-login")}>I have a Student ID</BigButton>
            </>
          )}
          <button onClick={handleViewDemo} disabled={demoLoading} className="text-ink/40 text-sm font-semibold underline underline-offset-4 mt-2 disabled:opacity-50">
            Judges &amp; teachers: view sample dashboard
          </button>
          {demoError && <p className="text-coral-dark text-sm font-semibold">{demoError}</p>}
          <Link to="/teacher-login" className="block text-ink/40 text-sm font-semibold underline underline-offset-4">
            Teacher login
          </Link>
        </div>
      )}
    </ChildScreen>
  );
}
