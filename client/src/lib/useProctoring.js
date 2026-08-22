import { useEffect, useState, useCallback } from 'react';

/**
 * Hook to enforce full-screen and monitor tab switches/visibility loss.
 * @param {Object} options
 * @param {boolean} options.isActive - Whether proctoring is enabled
 * @param {number} options.maxWarnings - Maximum tab switch violations allowed before auto-trigger
 * @param {Function} options.onViolation - Callback triggered on each violation
 * @param {Function} options.onDisqualified - Callback triggered when max warnings exceeded
 */
export function useProctoring({
  isActive = true,
  maxWarnings = 3,
  onViolation,
  onDisqualified,
} = {}) {
  const [warnings, setWarnings] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const requestFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (!document.fullscreenElement) {
        if (elem.requestFullscreen) await elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
        else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request denied or blocked:', err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    // Trigger full screen on mount/start
    requestFullscreen();

    const handleViolation = (reason) => {
      setWarnings((prev) => {
        const nextCount = prev + 1;
        if (onViolation) onViolation({ count: nextCount, reason });
        if (nextCount >= maxWarnings && onDisqualified) {
          onDisqualified({ totalViolations: nextCount });
        }
        return nextCount;
      });
    };

    // 1. Detect tab switching or window minimization
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('tab_switched_or_minimized');
      }
    };

    // 2. Detect leaving the window focus (e.g. alt-tab, clicking outside browser)
    const handleWindowBlur = () => {
      handleViolation('window_blur');
    };

    // 3. Detect exiting full screen
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active && isActive) {
        handleViolation('exited_fullscreen');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      exitFullscreen();
    };
  }, [isActive, maxWarnings, onViolation, onDisqualified, requestFullscreen, exitFullscreen]);

  return { warnings, isFullscreen, requestFullscreen, exitFullscreen };
}