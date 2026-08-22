import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Flame, Star, CheckCircle2 } from "lucide-react";
import { ChildScreen, LoadingSprout } from "../components/ui.jsx";
import { useApp } from "../context/AppContext.jsx";
import { fetchProgress } from "../lib/api.js";
import { getLocalSessions } from "../lib/offlineStore.js";
import { SKILL_LABELS } from "../lib/questionBank.js";

function dateKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function computeLocalStats(sessions) {
  const dates = new Set(sessions.map((s) => dateKey(s.completedAt)));
  let streak = 0;
  const cursor = new Date();
  if (!dates.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return {
    sessions,
    totalSessions: sessions.length,
    totalStars: sessions.reduce((sum, s) => sum + (s.starsEarned || 0), 0),
    streakDays: streak,
  };
}

function StatTile({ icon: Icon, value, label, color }) {
  return (
    <div className="bg-white rounded-xl2 py-4 flex flex-col items-center gap-1 flex-1">
      <Icon size={26} className={color} />
      <span className="text-2xl font-extrabold">{value}</span>
      <span className="text-xs font-bold text-ink/50">{label}</span>
    </div>
  );
}

export default function ProgressScreen() {
  const navigate = useNavigate();
  const { student } = useApp();
  const [data, setData] = useState(null);
  const [usedLocalFallback, setUsedLocalFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (student?.studentId && navigator.onLine) {
        try {
          const remote = await fetchProgress(student.studentId);
          if (!cancelled) {
            setData(remote);
            return;
          }
        } catch {
          /* fall through to local */
        }
      }
      if (!cancelled) {
        setData(computeLocalStats(getLocalSessions()));
        setUsedLocalFallback(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [student?.studentId]);

  if (!data) return <ChildScreen><LoadingSprout label="Loading your progress..." /></ChildScreen>;

  const recent = [...data.sessions].reverse().slice(0, 8);

  return (
    <ChildScreen>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate("/subject")} aria-label="Back" className="p-1 -ml-1">
          <ChevronLeft className="text-ink/60" size={28} />
        </button>
        <h1 className="text-2xl font-extrabold flex-1 text-center -ml-7">My Progress</h1>
      </div>

      <div className="flex gap-3 mb-8">
        <StatTile icon={Flame} value={data.streakDays} label="day streak" color="text-coral" />
        <StatTile icon={Star} value={data.totalStars} label="stars" color="text-marigold" />
        <StatTile icon={CheckCircle2} value={data.totalSessions} label="sessions" color="text-leaf" />
      </div>

      <h2 className="text-lg font-extrabold text-ink/70 mb-3">Recent Sessions</h2>
      <div className="flex-1 overflow-y-auto space-y-2">
        {recent.length === 0 && <p className="text-ink/50 font-semibold text-center mt-8">No sessions yet — start today's rescue!</p>}
        {recent.map((s, i) => (
          <div key={i} className="bg-white rounded-xl2 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-bold">{s.type === "diagnostic" ? "Quick Check" : SKILL_LABELS[s.skill] ?? s.skill}</p>
              <p className="text-xs text-ink/50 font-semibold">{new Date(s.completedAt).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-1 text-marigold font-extrabold">
              <Star size={16} fill="currentColor" /> {s.starsEarned ?? s.correctCount}
            </div>
          </div>
        ))}
      </div>

      {usedLocalFallback && <p className="text-center text-ink/40 text-xs font-semibold mt-4">Showing what's saved on this device (offline).</p>}
    </ChildScreen>
  );
}
