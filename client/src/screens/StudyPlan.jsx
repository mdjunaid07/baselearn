import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Lock, Check, Trophy } from "lucide-react";
import { ChildScreen, BigButton, SpeakerButton, LoadingSprout } from "../components/ui.jsx";
import { QuestionRunner } from "../components/QuestionRunner.jsx";
import { useApp } from "../context/AppContext.jsx";
import { fetchAllRoadmaps, setTopicComplete } from "../lib/api.js";
import { SKILL_LABELS, getQuestionsForSkill } from "../lib/questionBank.js";

/** Picks one existing question from the regular (already offline-bundled) bank as a
 *  topic's "quick check" — reuses real content instead of authoring a parallel set
 *  just for this. Prefers the topic's own difficulty tier, falls back to any. */
function pickQuickCheckQuestion(subject, skill, difficulty) {
  const pool = getQuestionsForSkill(subject, skill);
  const matching = pool.filter((q) => q.difficulty === difficulty);
  const candidates = matching.length ? matching : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function ProgressBar({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full bg-mist overflow-hidden">
        <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-ink/50 shrink-0">
        {done}/{total} topics
      </span>
    </div>
  );
}

function RoadmapCard({ roadmap, onTopicTap, onStartLevel2 }) {
  const doneCount = roadmap.topics.filter((t) => t.complete).length;
  const skillLabel = SKILL_LABELS[roadmap.skill] ?? roadmap.skill;

  return (
    <div className="bg-white rounded-xl3 p-5 mb-4 shadow-sm">
      <h3 className="text-lg font-extrabold mb-2">{skillLabel}</h3>
      <div className="mb-4">
        <ProgressBar done={doneCount} total={roadmap.topics.length} />
      </div>

      <div className="space-y-2 mb-4">
        {roadmap.topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onTopicTap(roadmap.subject, roadmap.skill, topic)}
            className={`w-full flex items-center gap-3 rounded-xl2 border-2 py-3 px-4 text-left transition active:scale-[0.99] ${
              topic.complete ? "border-leaf bg-leaf-light/20" : "border-mist bg-white"
            }`}
          >
            <span
              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                topic.complete ? "bg-leaf border-leaf" : "border-mist"
              }`}
            >
              {topic.complete && <Check size={16} className="text-white" strokeWidth={3} />}
            </span>
            <span className={`font-semibold ${topic.complete ? "text-ink/60 line-through decoration-leaf/50" : "text-ink"}`}>
              {topic.label}
            </span>
          </button>
        ))}
      </div>

      {roadmap.eligibleForLevel2 ? (
        <BigButton onClick={() => onStartLevel2(roadmap.subject, roadmap.skill)} className="!py-4 !text-lg">
          🚀 Take the Level 2 Test!
        </BigButton>
      ) : (
        <div className="w-full flex items-center justify-center gap-2 rounded-xl2 bg-mist/40 text-ink/40 font-bold py-4 text-sm">
          <Lock size={16} /> Level 2 Test — finish all topics first
        </div>
      )}
    </div>
  );
}

function LeveledUpStrip({ roadmaps }) {
  if (roadmaps.length === 0) return null;
  return (
    <div className="bg-marigold/10 border border-marigold/30 rounded-xl3 p-4 mb-4 flex items-start gap-3">
      <Trophy className="text-marigold-dark shrink-0 mt-0.5" size={22} />
      <div>
        <p className="font-bold text-sm mb-1">Leveled up!</p>
        <p className="text-sm text-ink/70">
          {roadmaps.map((r) => SKILL_LABELS[r.skill] ?? r.skill).join(", ")} — great work reaching Level 2. 🎉
        </p>
      </div>
    </div>
  );
}

export default function StudyPlan() {
  const navigate = useNavigate();
  const { student, studentToken } = useApp();
  const [roadmaps, setRoadmaps] = useState(null);
  const [error, setError] = useState(null);
  const [quickCheck, setQuickCheck] = useState(null); // { subject, skill, topic, question } | null

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!student?.studentId || !studentToken) return;
      try {
        const data = await fetchAllRoadmaps(student.studentId, studentToken);
        if (!cancelled) setRoadmaps(data.roadmaps);
      } catch {
        if (!cancelled) setError("Couldn't load your study plan — check your connection and try again.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [student?.studentId, studentToken]);

  function handleTopicTap(subject, skill, topic) {
    if (topic.complete) {
      // Un-checking is a plain toggle, no quiz required — this is a self-report undo.
      applyTopicUpdate(subject, skill, topic.id, false);
      return;
    }
    const question = pickQuickCheckQuestion(subject, skill, topic.difficulty);
    setQuickCheck({ subject, skill, topic, question });
  }

  async function applyTopicUpdate(subject, skill, topicId, complete) {
    try {
      const updated = await setTopicComplete(student.studentId, studentToken, subject, skill, topicId, complete);
      setRoadmaps((prev) => prev.map((r) => (r.subject === subject && r.skill === skill ? updated : r)));
    } catch {
      setError("Couldn't save that — check your connection and try again.");
    }
  }

  function handleQuickCheckNext(attempt) {
    const { subject, skill, topic } = quickCheck;
    setQuickCheck(null);
    if (attempt.correct) applyTopicUpdate(subject, skill, topic.id, true);
    // A miss just closes the quick check — the topic stays open to try again anytime,
    // no penalty, matching QuestionRunner's own encouraging (never shaming) feedback.
  }

  if (quickCheck) {
    return (
      <ChildScreen>
        <p className="text-center font-bold text-ink/60 mb-4">Quick check: {SKILL_LABELS[quickCheck.skill]}</p>
        <QuestionRunner question={quickCheck.question} progressCurrent={0} progressTotal={1} onNext={handleQuickCheckNext} />
      </ChildScreen>
    );
  }

  const activeRoadmaps = roadmaps?.filter((r) => r.level === 1 && r.topics.length > 0) ?? [];
  const leveledUpRoadmaps = roadmaps?.filter((r) => r.level === 2) ?? [];

  return (
    <ChildScreen>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => navigate("/subject")} aria-label="Back" className="p-1 -ml-1">
          <ChevronLeft className="text-ink/60" size={28} />
        </button>
        <h1 className="text-2xl font-extrabold flex-1 text-center -ml-7">My Study Plan</h1>
        <SpeakerButton text="Here's your study plan. Finish the topics to unlock the Level 2 test!" size={36} />
      </div>
      <p className="text-center text-ink/60 font-semibold mb-6 text-sm">Finish the topics to unlock each Level 2 test!</p>

      <div className="flex-1 overflow-y-auto">
        {!roadmaps && !error && <LoadingSprout label="Loading your study plan..." />}
        {error && <p className="text-coral-dark text-center font-semibold">{error}</p>}

        <LeveledUpStrip roadmaps={leveledUpRoadmaps} />

        {roadmaps && activeRoadmaps.length === 0 && leveledUpRoadmaps.length === 0 && (
          <p className="text-ink/50 font-semibold text-center mt-8">
            No study plan yet — keep practicing and we'll build one for you as soon as there's something to focus on!
          </p>
        )}

        {activeRoadmaps.map((r) => (
          <RoadmapCard
            key={`${r.subject}:${r.skill}`}
            roadmap={r}
            onTopicTap={handleTopicTap}
            onStartLevel2={(subject, skill) => navigate(`/study-plan/${subject}/${skill}/level2`)}
          />
        ))}
      </div>
    </ChildScreen>
  );
}
