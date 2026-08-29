import { useState } from "react";
import { ShieldCheck } from "lucide-react";

/** Shown once before the test screen's camera monitoring starts. States plainly what's
 *  checked and, most importantly, that no video or image is ever recorded or stored —
 *  only local, in-browser status flags leave as plain-text events. */
export function CameraConsentNotice() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="bg-white rounded-xl2 p-4 mb-4 border border-mist">
      <div className="flex items-start gap-2">
        <ShieldCheck size={20} className="text-leaf shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-bold mb-1">Before this test starts</p>
          <p className="text-xs text-ink/60 leading-relaxed">
            This test uses your camera to check that you're present, alone, and looking at the screen, and it also
            notices if you switch tabs. <strong>No video or image is ever recorded or stored</strong> — only these
            status checks.
          </p>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="mt-3 text-xs font-bold text-leaf-dark active:scale-[0.98] transition"
      >
        Got it
      </button>
    </div>
  );
}
