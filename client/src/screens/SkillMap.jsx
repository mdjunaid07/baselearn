import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ChildScreen, BigButton, GrowthPlant, SpeakerButton } from "../components/ui.jsx";
import { useApp } from "../context/AppContext.jsx";
import { LITERACY_SKILLS, NUMERACY_SKILLS, SKILL_LABELS } from "../lib/questionBank.js";
import { pickWeakestSkill } from "../lib/adaptiveEngine.js";

function SkillGarden({ title, skills, scores, weakest }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-extrabold text-ink/70 mb-3">{title}</h2>
      <div className="grid grid-cols-3 gap-3 bg-white/60 rounded-xl3 p-4">
        {skills.map((skill) => (
          <div key={skill} className={`relative flex flex-col items-center rounded-xl2 py-2 ${skill === weakest ? "bg-marigold/10 ring-2 ring-marigold" : ""}`}>
            {skill === weakest && <span className="absolute -top-2 bg-marigold text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">FOCUS</span>}
            <GrowthPlant score={scores[skill]} size={64} showLabel={false} />
            <span className="text-xs font-bold text-center mt-1 leading-tight">{SKILL_LABELS[skill]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SkillMap() {
  const navigate = useNavigate();
  const { skillProfile } = useApp();
  const weakestLiteracy = pickWeakestSkill(skillProfile, "literacy");
  const weakestNumeracy = pickWeakestSkill(skillProfile, "numeracy");

  return (
    <ChildScreen>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => navigate("/subject")} aria-label="Back" className="p-1 -ml-1">
          <ChevronLeft className="text-ink/60" size={28} />
        </button>
        <h1 className="text-2xl font-extrabold flex-1 text-center -ml-7">Your Skill Garden</h1>
        <SpeakerButton text="Here's your skill garden. Every plant grows as you practice!" size={36} />
      </div>
      <p className="text-center text-ink/60 font-semibold mb-6 text-sm">Every plant grows as you practice!</p>

      <div className="flex-1 overflow-y-auto">
        <SkillGarden title="Reading" skills={LITERACY_SKILLS} scores={skillProfile.literacy} weakest={weakestLiteracy} />
        <SkillGarden title="Math" skills={NUMERACY_SKILLS} scores={skillProfile.numeracy} weakest={weakestNumeracy} />
      </div>

      <div className="w-full max-w-sm mx-auto space-y-3 mt-4">
        <BigButton onClick={() => navigate("/rescue/literacy")}>Practice Reading</BigButton>
        <BigButton variant="secondary" onClick={() => navigate("/rescue/numeracy")}>Practice Math</BigButton>
      </div>
    </ChildScreen>
  );
}
