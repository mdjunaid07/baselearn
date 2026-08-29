import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sparkles, WifiOff } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { fetchDashboard } from "../lib/api.js";
import { getLocalSessions } from "../lib/offlineStore.js";
import { LITERACY_SKILLS, NUMERACY_SKILLS, SKILL_LABELS } from "../lib/questionBank.js";
import { pickWeakestSkill, masteryTier } from "../lib/adaptiveEngine.js";

const TIER_COLOR = { seed: "#C9BBA8", sprout: "#8FD9B6", sapling: "#2F9E63", bloom: "#227A4C" };

function SkillRow({ skill, score }) {
  const { tier, label } = masteryTier(score);
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-32 shrink-0 text-sm font-semibold text-ink">{SKILL_LABELS[skill]}</span>
      <div className="flex-1 h-2.5 rounded-full bg-mist overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: TIER_COLOR[tier] }} />
      </div>
      <span className="w-24 shrink-0 text-xs font-bold text-ink/60 text-right">
        {score}% · {label}
      </span>
    </div>
  );
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { student, studentToken, skillProfile } = useApp();
  const [remote, setRemote] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!student?.studentId || !studentToken) return;
      try {
        const data = await fetchDashboard(student.studentId, studentToken);
        if (!cancelled) setRemote(data);
      } catch {
        if (!cancelled) setOfflineMode(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [student?.studentId, studentToken]);

  const profile = remote?.skillProfile ?? skillProfile;
  const weakestLiteracy = pickWeakestSkill(profile, "literacy");
  const weakestNumeracy = pickWeakestSkill(profile, "numeracy");
  const localSessionCount = getLocalSessions().length;

  return (
    <div className="min-h-screen bg-cloud font-body text-ink px-6 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => navigate("/subject")} aria-label="Back" className="p-1 -ml-1">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1">Parent &amp; Teacher Dashboard</h1>
        </div>

        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <p className="text-sm text-ink/50 font-medium mb-1">{student?.nickname ?? "This learner"}</p>
          <p className="text-sm text-ink/40">
            {remote ? `${remote.sessionCount} session${remote.sessionCount === 1 ? "" : "s"} completed` : `${localSessionCount} session${localSessionCount === 1 ? "" : "s"} on this device`}
          </p>
        </div>

        {remote?.insight ? (
          <div className="bg-leaf/10 border border-leaf/30 rounded-2xl p-5 mb-6 flex gap-3">
            <Sparkles className="text-leaf shrink-0 mt-0.5" size={22} />
            <div>
              <p className="font-bold text-sm mb-1">{remote.insight.headline}</p>
              <p className="text-sm text-ink/70 mb-2">{remote.insight.detail}</p>
              <p className="text-sm text-leaf-dark font-semibold">{remote.insight.recommendation}</p>
            </div>
          </div>
        ) : (
          <div className="bg-marigold/10 border border-marigold/30 rounded-2xl p-5 mb-6 flex gap-3">
            <Sparkles className="text-marigold-dark shrink-0 mt-0.5" size={22} />
            <p className="text-sm text-ink/70">
              Biggest opportunity right now looks like <strong>{SKILL_LABELS[weakestLiteracy]}</strong> (Reading) or{" "}
              <strong>{SKILL_LABELS[weakestNumeracy]}</strong> (Math) — a few minutes of focused practice here goes furthest.
            </p>
          </div>
        )}

        {remote?.flaggedSessionCount > 0 && (
          <p className="text-xs text-ink/40 font-semibold mb-4">
            Attention check flagged in {remote.flaggedSessionCount} recent session{remote.flaggedSessionCount === 1 ? "" : "s"}.
          </p>
        )}

        {offlineMode && (
          <div className="flex items-center gap-2 text-xs text-ink/40 font-medium mb-4">
            <WifiOff size={14} /> Showing data saved on this device — connect to see full history and insights.
          </div>
        )}

        <section className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <h2 className="font-bold mb-3">Literacy</h2>
          {LITERACY_SKILLS.map((s) => (
            <SkillRow key={s} skill={s} score={profile.literacy[s]} />
          ))}
        </section>

        <section className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <h2 className="font-bold mb-3">Numeracy</h2>
          {NUMERACY_SKILLS.map((s) => (
            <SkillRow key={s} skill={s} score={profile.numeracy[s]} />
          ))}
        </section>

        <p className="text-xs text-ink/30 text-center mt-6">
          No name, photo, or location is collected for this learner — only an anonymous ID and practice history.
        </p>
      </div>
    </div>
  );
}
