import { useEffect, useState } from "react";
import { gradeAttempt } from "../lib/adaptiveEngine.js";
import { useSpeech } from "../lib/speech.js";
import { BigButton, ChoiceTile, NumericKeypad, DotProgress, SpeakerButton } from "./ui.jsx";

const CORRECT_PHRASES = ["Great job!", "Yes!", "You got it!", "Awesome!", "Nailed it!"];
const TRY_AGAIN_PHRASES = ["Nice try!", "Almost!", "Good effort!", "Keep going!"];
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Fully controlled: the parent screen owns the current `question` and the sequencing
 * logic (what comes next, when to stop). This component only asks one question at a
 * time, grades it locally via the shared adaptive engine, shows encouraging feedback
 * (never shame-based), and hands the graded attempt back via onNext.
 */
export function QuestionRunner({ question, progressCurrent, progressTotal, onNext }) {
  const [phase, setPhase] = useState("asking"); // 'asking' | 'feedback'
  const [selected, setSelected] = useState(null);
  const [numericValue, setNumericValue] = useState("");
  const [lastAttempt, setLastAttempt] = useState(null);
  const [feedbackPhrase, setFeedbackPhrase] = useState("");
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now());
  const { speak } = useSpeech();

  useEffect(() => {
    setPhase("asking");
    setSelected(null);
    setNumericValue("");
    setQuestionStartedAt(Date.now());
    if (question?.audioText) speak(question.audioText);
  }, [question?.id]);

  function grade(rawAnswer) {
    if (phase !== "asking") return;
    const { correct, errorPattern } = gradeAttempt(question, rawAnswer);
    const attempt = {
      questionId: question.id,
      subject: question.subject,
      skill: question.skill,
      difficulty: question.difficulty,
      answer: rawAnswer,
      correct,
      errorPattern,
      responseTimeMs: Date.now() - questionStartedAt,
    };
    const phrase = correct ? randomFrom(CORRECT_PHRASES) : randomFrom(TRY_AGAIN_PHRASES);
    setLastAttempt(attempt);
    setFeedbackPhrase(phrase);
    setPhase("feedback");
    speak(phrase);
  }

  const correctLabel = question.type === "numeric" ? String(question.correctAnswer) : question.options.find((o) => o.correct)?.label;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <DotProgress current={progressCurrent} total={progressTotal} />
        <SpeakerButton text={question.audioText || question.prompt} size={40} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <p className="text-3xl font-extrabold text-center leading-snug">{question.prompt}</p>

        {question.type === "choice" && (
          <div className="w-full grid grid-cols-2 gap-4">
            {question.options.map((opt) => {
              if (phase === "asking") return <ChoiceTile key={opt.id} label={opt.label} onClick={() => { setSelected(opt.id); grade(opt.id); }} />;
              const state = opt.correct ? "correct" : opt.id === selected ? "incorrect" : "dimmed";
              return <ChoiceTile key={opt.id} label={opt.label} state={state} disabled />;
            })}
          </div>
        )}

        {question.type === "numeric" && (
          <NumericKeypad value={numericValue} onChange={setNumericValue} onSubmit={() => grade(Number(numericValue))} disabled={phase === "feedback"} />
        )}
      </div>

      {phase === "feedback" && (
        <div className="mt-6">
          <div className={`rounded-xl2 p-4 mb-4 text-center font-bold text-lg ${lastAttempt.correct ? "bg-leaf-light/40 text-leaf-dark" : "bg-coral/15 text-coral-dark"}`}>
            {feedbackPhrase}
            {!lastAttempt.correct && <span className="block font-semibold text-base mt-1">The answer was {correctLabel}.</span>}
          </div>
          <BigButton onClick={() => onNext(lastAttempt)}>Continue</BigButton>
        </div>
      )}
    </div>
  );
}
