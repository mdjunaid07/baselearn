import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChildScreen, BigButton, GrowthPlant, SpeakerButton } from "../components/ui.jsx";
import { SKILL_LABELS } from "../lib/questionBank.js";

export default function DiagnosticResult() {
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state) navigate("/subject", { replace: true });
  }, [state, navigate]);

  if (!state) return null;
  const { subject, weakestSkill, weakestScore, tier } = state;
  const skillLabel = SKILL_LABELS[weakestSkill] ?? weakestSkill;
  const message = `We found it! ${skillLabel} is the best place to practice next.`;

  return (
    <ChildScreen className="items-center text-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <p className="text-lg font-bold text-ink/60">Great job on the Quick Check!</p>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold">{skillLabel}</h1>
          <SpeakerButton text={message} size={38} />
        </div>
        <GrowthPlant score={weakestScore} size={150} labelText={tier.label} />
        <p className="text-ink/70 font-semibold max-w-xs">
          This is where a few minutes of practice will help the most. Let's grow it together!
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <BigButton onClick={() => navigate(`/rescue/${subject}`)}>Start Today's Rescue</BigButton>
        <BigButton variant="secondary" onClick={() => navigate("/skill-map")}>See Full Skill Map</BigButton>
      </div>
    </ChildScreen>
  );
}
