import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Wraps window.speechSynthesis so every screen can read text aloud the same way.
 * This is the one piece of the app that lets a child who can't yet read instructions
 * use it independently — every screen that shows text should also offer to speak it.
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const utteranceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speak = useCallback(
    (text) => {
      if (!supported || !text) return;
      window.speechSynthesis.cancel(); // never overlap utterances
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // slightly slower - easier for an early reader to follow along
      utterance.pitch = 1.05;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { speak, stop, speaking, supported };
}
