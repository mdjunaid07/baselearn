import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { ChildScreen, BigButton, GrowthPlant } from "../components/ui.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function Welcome() {
  const navigate = useNavigate();
  const { student, loadDemoProfile } = useApp();
  const [demoError, setDemoError] = useState(null);

  async function handleViewDemo() {
    setDemoError(null);
    const result = await loadDemoProfile();
    if (result.ok) navigate("/dashboard");
    else setDemoError(result.reason);
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

      <div className="w-full max-w-sm space-y-3">
        {student ? (
          <>
            <BigButton onClick={() => navigate("/subject")}>Continue, {student.nickname}!</BigButton>
            <BigButton variant="secondary" onClick={() => navigate("/profile")}>New Profile</BigButton>
          </>
        ) : (
          <>
            <BigButton onClick={() => navigate("/profile")}>Start</BigButton>
            <BigButton variant="secondary" onClick={() => navigate("/student-login")}>I have a Student ID</BigButton>
          </>
        )}
        <button onClick={handleViewDemo} className="text-ink/40 text-sm font-semibold underline underline-offset-4 mt-2">
          Judges &amp; teachers: view sample dashboard
        </button>
        {demoError && <p className="text-coral-dark text-sm font-semibold">{demoError}</p>}
        <Link to="/teacher-login" className="block text-ink/40 text-sm font-semibold underline underline-offset-4">
          Teacher login
        </Link>
      </div>
    </ChildScreen>
  );
}
