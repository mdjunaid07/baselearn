import { Volume2, Loader2, Delete, Check } from "lucide-react";
import { useSpeech } from "../lib/speech.js";
import { masteryTier } from "../lib/adaptiveEngine.js";

/** Full-bleed shell for every child-facing screen: generous padding, single-focus layout. */
export function ChildScreen({ children, className = "" }) {
  return <div className={`min-h-screen bg-sky flex flex-col px-6 pt-8 pb-10 ${className}`}>{children}</div>;
}

export function BigButton({ children, onClick, variant = "primary", disabled = false, className = "", icon: Icon }) {
  const base = "w-full flex items-center justify-center gap-3 rounded-xl2 text-2xl font-bold py-5 px-6 transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 shadow-sm";
  const variants = {
    primary: "bg-leaf text-white hover:bg-leaf-dark",
    secondary: "bg-white text-ink border-2 border-mist hover:border-leaf",
    ghost: "bg-transparent text-ink/60 text-base font-semibold py-2 shadow-none underline underline-offset-4",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={26} />}
      {children}
    </button>
  );
}

/** Every screen with text should offer to speak it — this is what keeps the app usable
 *  for a child who can't yet read the instructions on screen. */
export function SpeakerButton({ text, size = 44, label = "Listen" }) {
  const { speak, speaking, supported } = useSpeech();
  if (!supported) return null;
  return (
    <button
      onClick={() => speak(text)}
      aria-label={label}
      className={`shrink-0 rounded-full bg-white shadow-sm flex items-center justify-center border-2 ${speaking ? "border-leaf" : "border-mist"} active:scale-95 transition`}
      style={{ width: size, height: size }}
    >
      <Volume2 size={size * 0.5} className={speaking ? "text-leaf animate-pulse" : "text-ink/70"} />
    </button>
  );
}

/** Dot progress for a real ordered sequence ("Question 2 of 5") — order carries meaning here. */
export function DotProgress({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`Question ${current} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-2.5 rounded-full transition-all ${i < current ? "w-8 bg-leaf" : i === current ? "w-8 bg-marigold" : "w-2.5 bg-mist"}`} />
      ))}
    </div>
  );
}

export function StarRating({ count, total = 5, size = 32 }) {
  return (
    <div className="flex gap-1" aria-label={`${count} out of ${total} stars`}>
      {Array.from({ length: total }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className={i < count ? "animate-pop" : ""} style={{ animationDelay: `${i * 80}ms` }}>
          <path
            d="M12 2l2.9 6.26L21.5 9l-5 4.36L17.9 20 12 16.5 6.1 20l1.4-6.64-5-4.36 6.6-.74z"
            fill={i < count ? "#F4A825" : "#DCE8F0"}
          />
        </svg>
      ))}
    </div>
  );
}

export function Badge({ label, emoji = "🌟" }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-marigold/15 text-marigold-dark border border-marigold/40 rounded-full px-4 py-1.5 text-sm font-bold animate-pop">
      <span aria-hidden>{emoji}</span> {label}
    </span>
  );
}

export function NumericKeypad({ value, onChange, onSubmit, disabled }) {
  const press = (d) => onChange((value + d).slice(0, 4));
  const backspace = () => onChange(value.slice(0, -1));
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="grid grid-cols-3 gap-3 mb-3">
        {keys.map((k) => (
          <button
            key={k}
            disabled={disabled}
            onClick={() => press(k)}
            className="rounded-xl2 bg-white border-2 border-mist text-3xl font-bold py-4 text-ink active:scale-95 active:border-leaf transition disabled:opacity-40"
          >
            {k}
          </button>
        ))}
        <button disabled={disabled} onClick={backspace} className="rounded-xl2 bg-white border-2 border-mist py-4 flex items-center justify-center active:scale-95 transition disabled:opacity-40">
          <Delete className="text-ink/60" />
        </button>
        <button disabled={disabled} onClick={() => press("0")} className="rounded-xl2 bg-white border-2 border-mist text-3xl font-bold py-4 text-ink active:scale-95 active:border-leaf transition disabled:opacity-40">
          0
        </button>
        <button disabled={disabled || value === ""} onClick={onSubmit} className="rounded-xl2 bg-leaf text-white flex items-center justify-center active:scale-95 transition disabled:opacity-40">
          <Check size={28} />
        </button>
      </div>
    </div>
  );
}

export function ChoiceTile({ label, onClick, state = "default", disabled }) {
  const styles = {
    default: "bg-white border-mist text-ink active:border-leaf",
    correct: "bg-leaf-light/40 border-leaf text-ink",
    incorrect: "bg-coral/15 border-coral text-ink",
    dimmed: "bg-white border-mist text-ink/40",
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-xl2 border-2 py-5 px-4 text-xl font-bold transition active:scale-[0.98] ${styles[state]}`}
    >
      {label}
    </button>
  );
}

export function LoadingSprout({ label = "Getting ready..." }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink/60">
      <Loader2 className="animate-spin" size={32} />
      <p className="font-semibold">{label}</p>
    </div>
  );
}

const PLANT_PALETTE = { seed: "#C9BBA8", sprout: "#8FD9B6", sapling: "#2F9E63", bloom: "#227A4C" };

/**
 * The app's signature visual: every skill is a small plant whose growth stage is a
 * direct, literal reading of the mastery score — legible to a child without needing
 * to read a percentage, and the same four stages a parent sees on the dashboard.
 */
export function GrowthPlant({ score, size = 96, showLabel = true, labelText }) {
  const { tier, label } = masteryTier(score);
  const color = PLANT_PALETTE[tier];
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
        <ellipse cx="50" cy="92" rx="26" ry="5" fill="#DCE8F0" />
        {tier === "seed" && <circle cx="50" cy="86" r="7" fill={color} />}
        {tier !== "seed" && (
          <g className="animate-grow" style={{ transformOrigin: "50px 90px" }}>
            <path stroke="#227A4C" strokeWidth="4" strokeLinecap="round"
              d={`M50 90 L50 ${tier === "sprout" ? 62 : tier === "sapling" ? 42 : 26}`} />
            {(tier === "sprout" || tier === "sapling" || tier === "bloom") && (
              <path d="M50 70 C34 70 26 58 26 46 C42 46 50 58 50 70 Z" fill={color} />
            )}
            {(tier === "sapling" || tier === "bloom") && (
              <path d="M50 52 C66 52 74 40 74 28 C58 28 50 40 50 52 Z" fill={color} />
            )}
            {tier === "bloom" && (
              <>
                <circle cx="50" cy="22" r="9" fill="#F4A825" />
                <circle cx="38" cy="28" r="6.5" fill="#F4A825" opacity="0.85" />
                <circle cx="62" cy="28" r="6.5" fill="#F4A825" opacity="0.85" />
              </>
            )}
          </g>
        )}
      </svg>
      {showLabel && <span className="text-sm font-bold" style={{ color: "#1D3557" }}>{labelText ?? label}</span>}
    </div>
  );
}
