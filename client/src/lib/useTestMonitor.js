import { useEffect, useRef, useState } from "react";
import { enqueueSyncEvent } from "./offlineStore.js";
import { trySync } from "./api.js";

/**
 * Warn-and-log only — never gates or terminates a test. Runs entirely client-side;
 * only a plain-text eventType + timestamp ever leaves the browser (via the same
 * offline sync queue diagnostic/rescue submissions already use), never a video frame.
 *
 * Camera detection is whole-frame pixel-diffing against the previous frame and a
 * 3-second "alone" baseline — not real face detection — so thresholds are tuned
 * loosely and may false-positive under lighting changes or a very still student.
 *
 * @param {Object} options
 * @param {boolean} options.isActive - Whether monitoring should run (test in progress)
 * @param {string} options.studentId
 * @param {string} options.studentToken
 * @param {string} options.sessionId - Ties every logged event to this specific test attempt
 */
export function useTestMonitor({ isActive = true, studentId, studentToken, sessionId } = {}) {
  const [warning, setWarning] = useState(false);
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (!isActive || !sessionId) return;

    let stream = null;
    let cancelled = false;
    let lastData = null;
    let baselineData = null;
    let calibrateTicks = 0;
    let noFaceStreak = 0;
    let noFaceFlagged = false;
    let multiFaceStreak = 0;
    let multiFaceFlagged = false;
    let headMovementFlagged = false;

    function emitEvent(eventType) {
      enqueueSyncEvent({
        type: "proctoring",
        payload: { studentId, sessionId, eventType, createdAt: new Date().toISOString() },
      });
      trySync(studentId, studentToken);
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true;
        setWarning(true);
      }
    }

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
      })
      .catch(() => {
        // Camera denied/unavailable — tab-switch detection below still runs;
        // camera-based checks just never fire. No error surfaced to the student.
      });

    const handleVisibility = () => {
      if (document.hidden) emitEvent("tab_switch");
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 75;
    const ctx = canvas.getContext("2d");
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    let videoAttached = false;

    const interval = setInterval(() => {
      if (!stream) return;
      if (!videoAttached) {
        video.srcObject = stream;
        video.play().catch(() => {});
        videoAttached = true;
      }
      if (video.videoWidth === 0) return;

      ctx.drawImage(video, 0, 0, 100, 75);
      const data = ctx.getImageData(0, 0, 100, 75).data;

      calibrateTicks++;
      if (calibrateTicks === 6) baselineData = new Uint8ClampedArray(data); // ~3s in, assumed alone

      if (lastData && baselineData) {
        let total = 0;
        let diffFromBaseline = 0;
        for (let i = 0; i < data.length; i += 4) {
          total += Math.abs(data[i] - lastData[i]);
          diffFromBaseline += Math.abs(data[i] - baselineData[i]);
        }
        const avg = total / (100 * 75);
        const baseAvg = diffFromBaseline / (100 * 75);

        // Emit once per rising edge, not on every tick the condition stays true.
        if (avg >= 40) {
          if (!headMovementFlagged) emitEvent("head_movement");
          headMovementFlagged = true;
        } else {
          headMovementFlagged = false;
        }

        if (avg < 4) {
          noFaceStreak++;
          if (noFaceStreak > 10 && !noFaceFlagged) {
            emitEvent("no_face");
            noFaceFlagged = true;
          }
        } else {
          noFaceStreak = 0;
          noFaceFlagged = false;
        }

        if (baseAvg > 15) {
          multiFaceStreak++;
          if (multiFaceStreak > 1 && !multiFaceFlagged) {
            emitEvent("multiple_faces");
            multiFaceFlagged = true;
          }
        } else {
          multiFaceStreak = 0;
          multiFaceFlagged = false;
        }
      }
      lastData = data;
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [isActive, sessionId, studentId, studentToken]);

  return { warning };
}
