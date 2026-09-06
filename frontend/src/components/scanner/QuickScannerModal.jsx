import { useEffect, useRef, useState } from "react";
import QRScanner from "./QRScanner";

/**
 * QuickScannerModal
 *
 * iOS WebKit fix (Bug #3):
 * html5-qrcode's stop() + clear() are async. If we unmount <QRScanner>
 * immediately when the backdrop is tapped (isOpen → false), React removes the
 * DOM before those promises resolve. WebKit then throws
 *   "Node.removeChild: Argument 1 is not an instance of Node"
 * on a detached element, which can crash the WKWebView renderer (white screen)
 * and leaves the camera indicator light active.
 *
 * Fix: we keep QRScanner mounted for TEARDOWN_MS after isOpen→false so the
 * async cleanup can complete while the DOM is still present. The overlay fades
 * out immediately via a CSS transition, so the user experience feels instant.
 */
const TEARDOWN_MS = 400;

const QuickScannerModal = ({ isOpen, onClose }) => {
  // Controls whether QRScanner is actually in the DOM.
  // Trails isOpen by TEARDOWN_MS on close to allow async camera teardown.
  const [mounted, setMounted] = useState(isOpen);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Cancel any pending unmount and ensure the component is in the DOM.
      clearTimeout(closeTimerRef.current);
      setMounted(true);
    } else {
      // Delay actual unmount so stop()+clear() can finish before React removes
      // the DOM nodes that html5-qrcode is still operating on.
      closeTimerRef.current = setTimeout(() => setMounted(false), TEARDOWN_MS);
    }
    return () => clearTimeout(closeTimerRef.current);
  }, [isOpen]);

  // Keyboard dismiss
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick QR Scanner"
      onClick={onClose}
      className={[
        // Overlay
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/80 p-3 sm:p-4 backdrop-blur-sm",
        // Fade in/out via opacity transition instead of animate-in so we
        // control visibility independently of the mounted state.
        "transition-opacity duration-300",
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      ].join(" ")}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-lg sm:max-w-xl overflow-y-auto rounded-[var(--radius-lg)] bg-[var(--color-bg)] p-2 sm:p-3 shadow-2xl"
      >
        <QRScanner autoNavigate={true} isModal={true} onClose={onClose} />
      </div>
    </div>
  );
};

export default QuickScannerModal;
