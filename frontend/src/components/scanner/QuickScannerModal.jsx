import { useEffect } from "react";
import QRScanner from "./QRScanner";

const QuickScannerModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick QR Scanner"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
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

