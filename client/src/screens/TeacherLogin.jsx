import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

/** Plain email/password login for the adult "Parent & Teacher" world — styled like
 *  ParentDashboard.jsx (bg-cloud / font-body), not the child-facing ChildScreen. */
export default function TeacherLogin() {
  const navigate = useNavigate();
  const { teacher, teacherLogin } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Already logged in (e.g. returning to this URL directly) — skip straight to the dashboard.
  useEffect(() => {
    if (teacher) navigate("/teacher-dashboard", { replace: true });
  }, [teacher, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await teacherLogin({ email, password });
      navigate("/teacher-dashboard");
    } catch (err) {
      setError(err.status === 401 ? "Incorrect email or password." : "Couldn't log in — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cloud font-body text-ink px-6 py-8">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <button onClick={() => navigate("/")} aria-label="Back" className="p-1 -ml-1">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1">Teacher Login</h1>
        </div>

        {teacher ? (
          <p className="text-center text-ink/40 text-sm">Redirecting to your dashboard...</p>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink/60 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="w-full rounded-xl border border-mist bg-cloud/60 py-3 px-4 text-base focus:border-leaf outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink/60 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-mist bg-cloud/60 py-3 px-4 text-base focus:border-leaf outline-none"
              />
            </div>

            {error && <p className="text-coral-dark text-sm font-semibold">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full rounded-xl2 bg-leaf text-white font-bold py-3.5 hover:bg-leaf-dark transition disabled:opacity-40"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>
        )}

        <Link to="/" className="block text-center text-ink/40 text-sm font-semibold underline underline-offset-4 mt-6">
          Back to student app
        </Link>
      </div>
    </div>
  );
}
