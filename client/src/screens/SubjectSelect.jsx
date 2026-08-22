import { useNavigate } from "react-router-dom";
import { BookOpen, Calculator } from "lucide-react";
import { ChildScreen, SpeakerButton } from "../components/ui.jsx";
import { useApp } from "../context/AppContext.jsx";

function hasBeenDiagnosed(scores) {
  return Object.values(scores).some((v) => v !== 50);
}

export default function SubjectSelect() {
  const navigate = useNavigate();
  const { student, skillProfile } = useApp();

  function go(subject) {
    if (hasBeenDiagnosed(skillProfile[subject])) navigate(`/rescue/${subject}`);
    else navigate(`/diagnostic/${subject}`);
  }

  const tiles = [
    { subject: "literacy", label: "Reading", icon: BookOpen, color: "bg-leaf" },
    { subject: "numeracy", label: "Math", icon: Calculator, color: "bg-marigold" },
  ];

  return (
    <ChildScreen className="items-center">
      <div className="flex items-center justify-center gap-3 mb-2 mt-4">
        <h1 className="text-3xl font-extrabold text-center">
          {student ? `Hi, ${student.nickname}!` : "What do you want to try?"}
        </h1>
        <SpeakerButton text={`Hi ${student?.nickname ?? "there"}! What do you want to try today, reading or math?`} size={38} />
      </div>
      <p className="text-ink/60 font-semibold mb-10">What do you want to try today?</p>

      <div className="flex-1 w-full flex flex-col gap-6 justify-center max-w-sm mx-auto">
        {tiles.map(({ subject, label, icon: Icon, color }) => (
          <button
            key={subject}
            onClick={() => go(subject)}
            className={`${color} rounded-xl3 py-10 flex flex-col items-center gap-3 text-white shadow-sm active:scale-[0.98] transition`}
          >
            <Icon size={56} strokeWidth={2.2} />
            <span className="text-2xl font-extrabold">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-5 mt-6 flex-wrap">
        <button onClick={() => navigate("/skill-map")} className="text-ink/50 text-sm font-bold underline underline-offset-4">
          My Skill Garden
        </button>
        <button onClick={() => navigate("/progress")} className="text-ink/50 text-sm font-bold underline underline-offset-4">
          My Progress
        </button>
        <button onClick={() => navigate("/study-plan")} className="text-ink/50 text-sm font-bold underline underline-offset-4">
          My Study Plan
        </button>
        <button onClick={() => navigate("/dashboard")} className="text-ink/50 text-sm font-bold underline underline-offset-4">
          Parent/Teacher View
        </button>
      </div>
    </ChildScreen>
  );
}
