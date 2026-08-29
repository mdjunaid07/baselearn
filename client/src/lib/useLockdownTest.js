import { useEffect, useRef, useState } from "react";

/**
 * Fullscreen + per-question countdown mechanics only — no proctoring/session
 * logging here. The caller (a test screen) owns what "terminate" actually means
 * for it (discard state, log an event, create/skip a Session record).
 *
 * @param {Object} options
 * @param {boolean} options.isActive - Whether lockdown enforcement should run (test in progress)
 * @param {boolean} options.hasAnsweredCurrent - Freezes the countdown once the current question is answered
 * @param {*} options.questionKey - Changing this resets the 20s countdown for a new question
 * @param {(reason: "fullscreen_exit"|"timeout") => void} options.onTerminate
 */
export function useLockdownTest({ isActive = false, hasAnsweredCurrent = false, questionKey, onTerminate } = {}) {
  const [secondsLeft, setSecondsLeft] = useState(20);
  const enteredFullscreenRef = useRef(false);

  async function enterFullscreenLockdown() {
    try {
      const elem = document.documentElement;
      if (!document.fullscreenElement) await elem.requestFullscreen();
      enteredFullscreenRef.current = true;
      return true;
    } catch {
      return false;
    }
  }

  // Fullscreen-exit detection.
  useEffect(() => {
    if (!isActive) return;
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && enteredFullscreenRef.current) {
        enteredFullscreenRef.current = false;
        onTerminate?.("fullscreen_exit");
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isActive]);

  // 20s-per-question countdown — resets on questionKey change, freezes once answered.
  useEffect(() => {
    if (!isActive || hasAnsweredCurrent) return;
    setSecondsLeft(20);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          onTerminate?.("timeout");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, hasAnsweredCurrent, questionKey]);

  return { secondsLeft, enterFullscreenLockdown };
}
