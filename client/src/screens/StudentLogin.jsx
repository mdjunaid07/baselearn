import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ChildScreen, BigButton, SpeakerButton, NumericKeypad } from "../components/ui.jsx";
import { useApp } from "../context/AppContext.jsx";
import { describeAuthError } from "../lib/api.js";

/** Child-friendly two-step login: type the Student ID a teacher gave you, then tap
 *  your 4-digit PIN on a big number pad — no keyboard needed for the part a young
 *  child has to get right under time pressure. */
export default function StudentLogin() {
  const navigate = useNavigate();
  const { studentLogin } = useApp();
  const [step, setStep] = useState("id"); // "id" | "pin"
  const [studentId, setStudentId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleContinue() {
    if (!studentId.trim()) return;
    setError(null);
    setStep("pin");
  }

  async function handlePinSubmit() {
    if (pin.length !== 4 || loading) return;
    setLoading(true);
    setError(null);
    try {
      await studentLogin({ studentId: studentId.trim(), pin });
      navigate("/subject");
    } catch (err) {
      setError(describeAuthError(err, "That ID and PIN don't match. Try again!"));
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ChildScreen>
      <button
        onClick={() => (step === "pin" ? setStep("id") : navigate("/"))}
        className="flex items-center gap-1 text-ink/50 font-semibold mb-4 active:scale-95 transition"
      >
        <ChevronLeft size={22} /> Back
      </button>

      {step === "id" ? (
        <>
          <div className="flex items-center justify-center gap-3 mb-8">
            <h1 className="text-3xl font-extrabold text-center">What's your Student ID?</h1>
            <SpeakerButton text="What's your Student ID?" size={38} />
          </div>

          <div className="mb-8">
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              placeholder="Type your Student ID..."
              autoCapitalize="off"
              autoCorrect="off"
              className="w-full rounded-xl2 border-2 border-mist bg-white py-4 px-5 text-xl text-center font-bold focus:border-leaf outline-none"
            />
          </div>

          <div className="mt-auto space-y-3">
            <BigButton onClick={handleContinue} disabled={!studentId.trim()}>
              Next
            </BigButton>
            <Link to="/profile" className="block text-center text-ink/40 text-sm font-semibold underline underline-offset-4">
              New here? Create a profile instead
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center gap-3 mb-6">
            <h1 className="text-3xl font-extrabold text-center">Enter your PIN</h1>
            <SpeakerButton text="Enter your PIN" size={38} />
          </div>

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
