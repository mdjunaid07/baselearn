import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut, Users, AlertTriangle, Trophy } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { fetchTeacherStudents } from "../lib/api.js";
import { SKILL_LABELS } from "../lib/questionBank.js";
import { masteryTier } from "../lib/adaptiveEngine.js";

const AVATAR_EMOJI = { fox: "🦊", owl: "🦉", cat: "🐱", rabbit: "🐰", turtle: "🐢", dolphin: "🐬" };

function overallScore(skillProfile) {
  const scores = [...Object.values(skillProfile?.literacy ?? {}), ...Object.values(skillProfile?.numeracy ?? {})];
  if (!scores.length) return 0;
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

/** One roadmap's row in a student's card — topics X/Y, current level, and a compact
 *  pass/fail summary of Level 2 attempt history. Omitted entirely for a student with
 *  no roadmaps (pre-existing students, or anyone with no weak skills yet) — the
 *  "Study Plan" section just doesn't render, no "0 roadmaps" placeholder needed. */
function RoadmapRow({ roadmap }) {
  const label = SKILL_LABELS[roadmap.skill] ?? roadmap.skill;
  const done = roadmap.topics.filter((t) => t.complete).length;
  const total = roadmap.topics.length;
  const passCount = roadmap.level2Attempts.filter((a) => a.passed).length;
  const failCount = roadmap.level2Attempts.length - passCount;

  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-t border-mist/60 first:border-t-0 first:pt-0" title={roadmap.reason ?? undefined}>
      <div className="flex items-center gap-1.5 min-w-0">
        {roadmap.flagged && <AlertTriangle size={12} className="text-coral shrink-0" />}
        <span className="font-semibold text-ink/80 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 text-ink/50 shrink-0">
        {roadmap.level === 2 ? (
          <span className="flex items-center gap-1 font-bold text-marigold-dark">
            <Trophy size={11} /> Level 2
          </span>
        ) : (
          <span>{done}/{total} topics{roadmap.eligibleForLevel2 ? " · ready!" : ""}</span>
        )}
        {roadmap.level2Attempts.length > 0 && (
          <span>
            · {passCount}✓{failCount > 0 ? ` ${failCount}✗` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function StudentCard({ student }) {
  const score = overallScore(student.skillProfile);
  const { tier, label } = masteryTier(score);
  const weakLit = student.weakestSkills?.literacy;
  const weakNum = student.weakestSkills?.numeracy;
  const roadmaps = student.roadmaps ?? [];

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm ${student.needsAttention ? "ring-2 ring-coral/50" : ""}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-cloud flex items-center justify-center text-2xl shrink-0">
          {AVATAR_EMOJI[student.avatarId] ?? "🌱"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold truncate flex items-center gap-1.5">
            {student.nickname}
            {student.needsAttention && <AlertTriangle size={14} className="text-coral shrink-0" aria-label="Needs attention" />}
          </p>
          <p className="text-xs text-ink/40 truncate">{student.studentId}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold">{score}%</p>
          <p className="text-xs text-ink/50">{label}</p>
        </div>
      </div>

      <div className="h-2 rounded-full bg-mist overflow-hidden mb-3">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, backgroundColor: { seed: "#C9BBA8", sprout: "#8FD9B6", sapling: "#2F9E63", bloom: "#227A4C" }[tier] }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/50">
        <span>
          {student.sessionCount} session{student.sessionCount === 1 ? "" : "s"}
        </span>
        <span>{student.lastSessionAt ? `Last active ${new Date(student.lastSessionAt).toLocaleDateString()}` : "No sessions yet"}</span>
        {student.flaggedSessionCount > 0 && (
          <span>Attention check flagged in {student.flaggedSessionCount} session{student.flaggedSessionCount === 1 ? "" : "s"}</span>
        )}
        {student.terminatedSessionCount > 0 && (
          <span>{student.terminatedSessionCount} attempt{student.terminatedSessionCount === 1 ? "" : "s"} ended early</span>
        )}
      </div>

      {(weakLit || weakNum) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {weakLit && (
            <span className="bg-coral/10 text-coral-dark text-xs font-semibold rounded-full px-3 py-1">Needs: {SKILL_LABELS[weakLit]}</span>
          )}
          {weakNum && (
            <span className="bg-coral/10 text-coral-dark text-xs font-semibold rounded-full px-3 py-1">Needs: {SKILL_LABELS[weakNum]}</span>
          )}
        </div>
      )}

      {roadmaps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-mist">
          <p className="text-xs font-bold text-ink/40 uppercase tracking-wide mb-1">Study Plan</p>
          {roadmaps.map((r) => (
            <RoadmapRow key={`${r.subject}:${r.skill}`} roadmap={r} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { teacher, teacherToken, teacherLogout } = useApp();
  const [students, setStudents] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchTeacherStudents(teacherToken);
        if (!cancelled) setStudents(data.students);
      } catch (err) {
        if (!cancelled) setError(err.status === 401 ? "Your session expired — please log in again." : "Couldn't load student data. Check your connection.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [teacherToken]);

  function handleLogout() {
    teacherLogout();
    navigate("/teacher-login");
  }

  return (
    <div className="min-h-screen bg-cloud font-body text-ink px-6 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate("/")} aria-label="Back" className="p-1 -ml-1">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1">Class Dashboard</h1>
          <button onClick={handleLogout} aria-label="Log out" className="p-1 text-ink/50 hover:text-coral-dark transition">
            <LogOut size={20} />
          </button>
        </div>
        <p className="text-sm text-ink/50 mb-6">{teacher?.name}</p>

        {error && (
          <div className="bg-coral/10 border border-coral/30 rounded-2xl p-5 text-coral-dark font-semibold text-sm mb-4">{error}</div>
        )}

        {!students && !error && <p className="text-ink/40 text-sm">Loading students...</p>}

        {students && students.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-ink/50">
            <Users className="mx-auto mb-3" size={28} />
            <p className="font-semibold">No students yet</p>
            <p className="text-sm mt-1">Students will show up here once they create a profile or log in.</p>
          </div>
        )}

        {students && students.length > 0 && (
          <div className="space-y-3">
            {students.map((s) => (
              <StudentCard key={s.studentId} student={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
