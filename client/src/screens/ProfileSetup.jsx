import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChildScreen, BigButton, SpeakerButton } from "../components/ui.jsx";
import { useApp } from "../context/AppContext.jsx";

const AVATARS = [
  { id: "fox", emoji: "🦊", name: "Fox" },
  { id: "owl", emoji: "🦉", name: "Owl" },
  { id: "cat", emoji: "🐱", name: "Cat" },
  { id: "rabbit", emoji: "🐰", name: "Rabbit" },
  { id: "turtle", emoji: "🐢", name: "Turtle" },
  { id: "dolphin", emoji: "🐬", name: "Dolphin" },
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { createProfile } = useApp();
  const [avatarId, setAvatarId] = useState(null);
  const [nickname, setNickname] = useState("");

  function handleStart() {
    const avatar = AVATARS.find((a) => a.id === avatarId);
    createProfile({ nickname: nickname.trim() || `Curious ${avatar?.name ?? "Explorer"}`, avatarId: avatarId ?? "fox" });
    navigate("/subject");
  }

  return (
    <ChildScreen>
      <div className="flex items-center justify-center gap-3 mb-8">
        <h1 className="text-3xl font-extrabold text-center">Pick your buddy!</h1>
        <SpeakerButton text="Pick your buddy!" size={38} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {AVATARS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAvatarId(a.id)}
            className={`aspect-square rounded-xl3 flex items-center justify-center text-5xl border-4 transition active:scale-95 ${
              avatarId === a.id ? "border-leaf bg-leaf-light/30" : "border-mist bg-white"
            }`}
            aria-label={a.name}
          >
            {a.emoji}
          </button>
        ))}
      </div>

      <div className="mb-8">
        <label className="block text-sm font-bold text-ink/60 mb-2 text-center">What should we call you? (optional)</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Type a nickname..."
          maxLength={24}
          className="w-full rounded-xl2 border-2 border-mist bg-white py-4 px-5 text-xl text-center font-bold focus:border-leaf outline-none"
        />
      </div>

      <div className="mt-auto">
        <BigButton onClick={handleStart} disabled={!avatarId}>
          Let's Go!
        </BigButton>
      </div>
    </ChildScreen>
  );
}
