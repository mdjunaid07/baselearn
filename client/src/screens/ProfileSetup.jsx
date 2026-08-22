import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ChildScreen, BigButton, SpeakerButton, NumericKeypad } from "../components/ui.jsx";
import { useApp } from "../context/AppContext.jsx";
import { describeAuthError } from "../lib/api.js";

const AVATARS = [
  { id: "fox", emoji: "🦊", name: "Fox" },
  { id: "owl", emoji: "🦉", name: "Owl" },
  { id: "cat", emoji: "🐱", name: "Cat" },
  { id: "rabbit", emoji: "🐰", name: "Rabbit" },
  { id: "turtle", emoji: "🐢", name: "Turtle" },
  { id: "dolphin", emoji: "🐬", name: "Dolphin" },
];

/** Self-serve signup, in three steps: pick an avatar/nickname, choose a 4-digit PIN,
 *  then show the Student ID the backend assigned so it can be written down. Nothing
 *  here grants access on its own — the student is only logged in once studentSignup's
 *  real registerStudentPin API call succeeds (see AppContext.jsx). */
export default function ProfileSetup() {
  const navigate = useNavigate();
  const { studentSignup } = useApp();
  const [step, setStep] = useState("avatar"); // "avatar" | "pin" | "reveal"
  const [avatarId, setAvatarId] = useState(null);
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null);

  const avatar = AVATARS.find((a) => a.id === avatarId);

  async function handlePinSubmit() {
    if (pin.length !== 4 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const student = await studentSignup({
        pin,
        nickname: nickname.trim() || `Curious ${avatar?.name ?? "Explorer"}`,
        avatarId: avatarId ?? "fox",
      });
      setCreatedStudent(student);
      setStep("reveal");
    } catch (err) {
      // 409 here means the randomly generated ID collided with an existing one —
      // vanishingly rare, but a plain retry (new random ID) resolves it.
      setError(err.status === 409 ? "That ID was just taken — please try again." : describeAuthError(err, "Couldn't create your profile — try again."));
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  if (step === "reveal" && createdStudent) {
    return (
      <ChildScreen className="items-center text-center justify-center">
        <p className="text-4xl mb-4" aria-hidden>
          🎉
        </p>
        <h1 className="text-3xl font-extrabold mb-3">You're all set!</h1>
        <p className="text-ink/70 font-semibold mb-6 max-w-xs">
          Remember your Student ID — you'll need it with your PIN to log in next time.
        </p>
        <div className="bg-white rounded-xl2 border-2 border-leaf px-8 py-5 mb-10">
          <p className="text-xs font-bold text-ink/40 uppercase tracking-wide mb-1">Your Student ID</p>
          <p className="text-3xl font-extrabold tracking-widest text-leaf-dark">{createdStudent.studentId}</p>
        </div>
        <div className="w-full max-w-sm">
          <BigButton onClick={() => navigate("/subject")}>Let's Go!</BigButton>
        </div>
      </ChildScreen>
    );
  }

  return (
    <ChildScreen>
      <button
        onClick={() => (step === "pin" ? setStep("avatar") : navigate("/"))}
        className="flex items-center gap-1 text-ink/50 font-semibold mb-4 active:scale-95 transition"
      >
        <ChevronLeft size={22} /> Back
      </button>

      {step === "avatar" ? (
        <>
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
            <BigButton onClick={() => setStep("pin")} disabled={!avatarId}>
              Next
            </BigButton>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center gap-3 mb-6">
            <h1 className="text-3xl font-extrabold text-center">Choose a 4-digit PIN</h1>
            <SpeakerButton text="Choose a 4-digit PIN" size={38} />
          </div>
          <p className="text-center text-ink/50 font-semibold mb-6 max-w-xs mx-auto">You'll use this PIN to log back in, so pick one you'll remember.</p>

          <div className="flex items-center justify-center gap-4 mb-8" aria-hidden>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`w-5 h-5 rounded-full border-2 ${i < pin.length ? "bg-leaf border-leaf" : "border-mist bg-white"}`} />
            ))}
          </div>

          {error && <p className="text-coral-dark text-center font-semibold mb-4">{error}</p>}

          <NumericKeypad value={pin} onChange={setPin} onSubmit={handlePinSubmit} disabled={loading} />
        </>
      )}
    </ChildScreen>
  );
}
