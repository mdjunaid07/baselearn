import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Flame, Star, CheckCircle2, ClipboardList, Trophy, Lock } from "lucide-react";
import { ChildScreen, LoadingSprout } from "../components/ui.jsx";
import { useApp } from "../context/AppContext.jsx";
import { fetchProgress, fetchAllRoadmaps } from "../lib/api.js";
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

/** Roadmap status surfaced here rather than only living on its own screen — a
 *  compact summary with a link through to the full My Study Plan checklist. */
function StudyPlanSummary({ roadmaps, onOpen }) {
  if (!roadmaps) return null;
  const active = roadmaps.filter((r) => r.level === 1 && r.topics.length > 0);
  const leveledUp = roadmaps.filter((r) => r.level === 2);
  if (active.length === 0 && leveledUp.length === 0) return null;

  return (
    <button onClick={onOpen} className="w-full bg-white rounded-xl2 p-4 mb-6 text-left active:scale-[0.99] transition">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList size={20} className="text-leaf" />
        <h2 className="font-extrabold flex-1">My Study Plan</h2>
        <span className="text-xs font-bold text-ink/40">View →</span>
      </div>
      <div className="space-y-2">
        {active.map((r) => {
          const done = r.topics.filter((t) => t.complete).length;
          return (
            <div key={`${r.subject}:${r.skill}`} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-ink/80">{SKILL_LABELS[r.skill] ?? r.skill}</span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-ink/50">
                {r.eligibleForLevel2 ? "Ready for Level 2!" : `${done}/${r.topics.length} topics`}
                {!r.eligibleForLevel2 && <Lock size={12} />}
              </span>
            </div>
          );
        })}
        {leveledUp.map((r) => (
          <div key={`${r.subject}:${r.skill}`} className="flex items-center gap-1.5 text-sm font-bold text-marigold-dark">
            <Trophy size={14} /> {SKILL_LABELS[r.skill] ?? r.skill} — Level 2!
          </div>
        ))}
      </div>
    </button>
  );
}

export default function ProgressScreen() {
  const navigate = useNavigate();
  const { student, studentToken } = useApp();
  const [data, setData] = useState(null);
  const [usedLocalFallback, setUsedLocalFallback] = useState(false);
  const [roadmaps, setRoadmaps] = useState(null); // null while loading/unavailable — section just hides, non-critical

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (student?.studentId && studentToken && navigator.onLine) {
        try {
          const remote = await fetchProgress(student.studentId, studentToken);
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
  }, [student?.studentId, studentToken]);

  useEffect(() => {
    let cancelled = false;
    async function loadRoadmaps() {
      if (!student?.studentId || !studentToken) return;
      try {
        const res = await fetchAllRoadmaps(student.studentId, studentToken);
        if (!cancelled) setRoadmaps(res.roadmaps);
      } catch {
        /* study plan is online-only for now — just leave the section hidden */
      }
    }
    loadRoadmaps();
    return () => {
      cancelled = true;
    };
  }, [student?.studentId, studentToken]);

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

      <StudyPlanSummary roadmaps={roadmaps} onOpen={() => navigate("/study-plan")} />

      <h2 className="text-lg font-extrabold text-ink/70 mb-3">Recent Sessions</h2>
      <div className="flex-1 overflow-y-auto space-y-2">
        {recent.length === 0 && <p className="text-ink/50 font-semibold text-center mt-8">No sessions yet — start today's rescue!</p>}
        {recent.map((s, i) => (
          <div key={i} className="bg-white rounded-xl2 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-bold">{s.type === "diagnostic" ? "Quick Check" : SKILL_LABELS[s.skill] ?? s.skill}</p>
              <p className="text-xs text-ink/50 font-semibold">{new Date(s.completedAt).toLocaleDateString()}</p>
              {s.flaggedEventCount > 0 && <p className="text-xs text-ink/40 font-semibold mt-0.5">Attention check flagged</p>}
              {s.terminated && (
                <p className="text-xs text-ink/40 font-semibold mt-0.5">
                  {s.terminationReason === "fullscreen_exit" ? "Ended early — left fullscreen" : "Ended early — time ran out"}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 text-marigold font-extrabold">
              {!s.terminated && (
                <>
                  <Star size={16} fill="currentColor" /> {s.starsEarned ?? s.correctCount}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {usedLocalFallback && <p className="text-center text-ink/40 text-xs font-semibold mt-4">Showing what's saved on this device (offline).</p>}
    </ChildScreen>
  );
}
