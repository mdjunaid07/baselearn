import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChildScreen, BigButton, GrowthPlant, StarRating, Badge, SpeakerButton } from "../components/ui.jsx";
import { SKILL_LABELS } from "../lib/questionBank.js";

/** Modeled on SessionComplete.jsx / DiagnosticResult.jsx's tone and layout — same
 *  calm, encouraging language style either way, never shame-based on a miss. */
export default function Level2Result() {
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state) navigate("/study-plan", { replace: true });
  }, [state, navigate]);

  if (!state) return null;
  const { skill, passed, missedTopicIds, roadmap, correctCount, questionCount, skillScoreAfter } = state;
  const skillLabel = SKILL_LABELS[skill] ?? skill;

  if (passed) {
    return (
      <ChildScreen className="items-center text-center">
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold">You leveled up! 🎉</h1>
            <SpeakerButton text={`You leveled up! ${skillLabel} is now Level 2.`} size={36} />
          </div>
          <StarRating count={correctCount} total={questionCount} size={40} />
          <GrowthPlant score={skillScoreAfter} size={140} />
          <p className="font-bold text-ink/70">{skillLabel} — Level 2 unlocked!</p>
          <Badge label={`${skillLabel} · Level 2`} emoji="🏆" />
        </div>

        <div className="w-full max-w-sm space-y-3">
          <BigButton onClick={() => navigate("/study-plan")}>Back to My Study Plan</BigButton>
          <BigButton variant="secondary" onClick={() => navigate("/subject")}>Done for Today</BigButton>
        </div>
      </ChildScreen>
    );
  }

  const missedTopics = roadmap.topics.filter((t) => missedTopicIds.includes(t.id));

  return (
    <ChildScreen className="items-center text-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold">So close! Let's practice a bit more.</h1>
          <SpeakerButton text="So close! Let's practice a bit more before trying again." size={36} />
        </div>
        <GrowthPlant score={skillScoreAfter} size={130} />
        <p className="font-bold text-ink/70">
          You got {correctCount} of {questionCount} — nice effort!
        </p>
        {missedTopics.length > 0 && (
          <div className="bg-white rounded-xl2 p-5 w-full max-w-sm text-left shadow-sm">
            <p className="font-bold text-sm text-ink/60 mb-2">We'll practice these a little more:</p>
            <ul className="space-y-1">
              {missedTopics.map((t) => (
                <li key={t.id} className="font-semibold text-ink">
                  • {t.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm space-y-3">
        <BigButton onClick={() => navigate("/study-plan")}>Back to My Study Plan</BigButton>
      </div>
    </ChildScreen>
  );
}
