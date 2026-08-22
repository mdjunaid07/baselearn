import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChildScreen, BigButton, GrowthPlant, StarRating, Badge, SpeakerButton } from "../components/ui.jsx";
import { SKILL_LABELS } from "../lib/questionBank.js";

export default function SessionComplete() {
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state) navigate("/subject", { replace: true });
  }, [state, navigate]);

  if (!state) return null;
  const { subject, skill, before, after, correctCount, total, badge } = state;
  const skillLabel = SKILL_LABELS[skill] ?? skill;
  const grew = after > before;

  return (
    <ChildScreen className="items-center text-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold">Awesome work!</h1>
          <SpeakerButton text={`Awesome work! You got ${correctCount} out of ${total} right in ${skillLabel}.`} size={36} />
        </div>
        <StarRating count={correctCount} total={total} size={40} />
        <GrowthPlant score={after} size={140} />
        <p className="font-bold text-ink/70">
          {skillLabel}: {before}% {grew ? "→" : ""} {after}%{grew ? " 🌱 growing!" : ""}
        </p>
        {badge && (
          <div className="mt-1">
            <p className="text-xs font-bold text-ink/50 mb-1 uppercase tracking-wide">New badge!</p>
            <Badge label={badge} />
          </div>
        )}
      </div>

      <div className="w-full max-w-sm space-y-3">
        <BigButton onClick={() => navigate("/skill-map")}>See My Skill Garden</BigButton>
        <BigButton variant="secondary" onClick={() => navigate("/subject")}>Done for Today</BigButton>
      </div>
    </ChildScreen>
  );
}
