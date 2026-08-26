import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera,
  CameraOff,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  QrCode,
  Sparkles,
  RefreshCw,
  Upload,
  ArrowRight,
  FlaskConical,
  Boxes,
  MapPin,
  Tag,
  Hash,
  X,
  FlipHorizontal,
} from "lucide-react";
import api from "../../api/axiosInstance";

const QRScanner = ({ onResult, autoNavigate = true, isModal = false, onClose }) => {
  const navigate = useNavigate();
  const readerId = useRef(`qr-reader-${Math.random().toString(36).substring(2, 9)}`).current;
  const scannerRef = useRef(null);

  // Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [recentScans, setRecentScans] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cms-recent-scans") || "[]");
    } catch {
      return [];
    }
  });

  const saveRecentScan = useCallback((item) => {
    setRecentScans((prev) => {
      const filtered = prev.filter((s) => s.chemicalId !== item.chemicalId || s.batchId !== item.batchId);
      const updated = [{ ...item, scannedAt: new Date().toISOString() }, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("cms-recent-scans", JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to persist recent scans", e);
      }
      return updated;
    });
  }, []);

  // Handle resolving a scanned string or manually entered code
  const handleResolveCode = useCallback(async (codeToResolve) => {
    if (!codeToResolve || !codeToResolve.trim()) return;

    const query = codeToResolve.trim();
    setIsResolving(true);
    setResolveError(null);
    setScanResult(null);

    try {
      const response = await api.get("/chemicals/scan/resolve", {
        params: { query },
      });

      if (response.data?.success) {
        const data = response.data;
        setScanResult(data);
        saveRecentScan({
          chemicalId: data.chemicalId,
          batchId: data.batchId,
          chemicalCode: data.chemical?.chemicalCode,
          canonicalName: data.chemical?.canonicalName,
          binCardNumber: data.chemical?.binCardNumber,
          batchNumber: data.batch?.batchNumber,
          matchType: data.matchType,
        });

        if (onResult) {
          onResult(data);
        }

        if (autoNavigate) {
          // Play subtle success tone
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          } catch {
            // ignore
          }

          // Navigate directly to the chemical details page
          setTimeout(() => {
            const state = data.batchId ? { highlightedBatchId: data.batchId } : undefined;
            navigate(`/chemicals/${data.chemicalId}${data.batchId ? `?batchId=${data.batchId}` : ""}`, { state });
            if (onClose) onClose();
          }, 800);
        }
      } else {
        throw new Error(response.data?.message || "Chemical or batch not found.");
      }
    } catch (err) {
      console.error("Resolution error:", err);
      setResolveError(
        err.response?.data?.message ||
        err.message ||
        `No matching chemical or batch found for "${query}".`
      );
    } finally {
      setIsResolving(false);
    }
  }, [autoNavigate, navigate, onResult, onClose, saveRecentScan]);

  // Start Camera Scanning
  const startCamera = useCallback(async (cameraId = null) => {
    setCameraError(null);
    setScanResult(null);
    setResolveError(null);

    try {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode(readerId);
      scannerRef.current = html5QrCode;

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          if (!cameraId && !selectedCameraId) {
            const rearCamera = devices.find(d => 
              d.label.toLowerCase().includes("back") || 
              d.label.toLowerCase().includes("rear") || 
              d.label.toLowerCase().includes("environment")
            );
            const chosenId = rearCamera ? rearCamera.id : devices[0].id;
            setSelectedCameraId(chosenId);
            cameraId = chosenId;
          }
        }
      } catch (e) {
        console.warn("Could not enumerate camera devices", e);
      }

      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: "environment" };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 12,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrEdge = Math.floor(minEdge * 0.72);
            return { width: qrEdge, height: qrEdge };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          console.log("QR Code decoded:", decodedText);
          handleResolveCode(decodedText);
        },
        () => {
          // frame misses
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Camera startup error:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. Please allow camera access in your browser settings or enter the code manually below."
          : "Unable to access camera. Please check camera connections or enter the code manually below."
      );
      setIsScanning(false);
    }
  }, [readerId, selectedCameraId, handleResolveCode]);

  // Stop camera
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn("Error stopping scanner", e);
      }
    }
    setIsScanning(false);
  }, []);

  // Switch camera
  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    stopCamera().then(() => startCamera(nextCamera.id));
  };

  // Image file QR upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResolveError(null);
    setScanResult(null);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerId);
      }
      setIsResolving(true);
      const decodedText = await scannerRef.current.scanFile(file, true);
      if (decodedText) {
        handleResolveCode(decodedText);
      }
    } catch (err) {
      console.error("QR image scan error:", err);
      setResolveError("No readable QR code found in the uploaded image. Please try another image or enter the code manually.");
      setIsResolving(false);
    }
  };

  // Mount effect
  useEffect(() => {
    startCamera();

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {
          // ignore
        }
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`flex flex-col gap-6 ${isModal ? "" : "mx-auto max-w-3xl"}`}>
      {/* Scanner Card Viewport */}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white shadow-sm">
              <QrCode size={19} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Live QR Code Scanner
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Point camera at batch or chemical QR label
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cameras.length > 1 && isScanning && (
              <button
                type="button"
                onClick={switchCamera}
                title="Switch Camera"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] color-transition"
              >
                <FlipHorizontal size={14} />
                <span className="hidden sm:inline">Flip</span>
              </button>
            )}

            {isScanning ? (
              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 color-transition"
              >
                <CameraOff size={14} />
                <span className="hidden sm:inline">Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startCamera(selectedCameraId)}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-primary-light)] color-transition shadow-sm"
              >
                <Camera size={14} />
                <span>Start Camera</span>
              </button>
            )}

            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-danger)] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Viewport Area */}
        <div className="relative bg-black/95 p-3 sm:p-5 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[360px]">
          {/* html5-qrcode video container */}
          <div
            id={readerId}
            className="w-full max-w-sm sm:max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-white/20 bg-black"
          />

          {/* Scanner Overlay Guide when active */}
          {isScanning && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative h-56 w-56 sm:h-64 sm:w-64 rounded-2xl border-2 border-[var(--color-accent)] shadow-[0_0_20px_rgba(234,179,8,0.3)] flex items-center justify-center">
                {/* Laser animation bar */}
                <div className="absolute left-2 right-2 h-0.5 bg-[var(--color-accent)] shadow-[0_0_8px_#eab308] animate-pulse" />
                <div className="absolute top-2 left-2 h-4 w-4 border-t-2 border-l-2 border-[var(--color-accent)]" />
                <div className="absolute top-2 right-2 h-4 w-4 border-t-2 border-r-2 border-[var(--color-accent)]" />
                <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-[var(--color-accent)]" />
                <div className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-[var(--color-accent)]" />
              </div>
              <p className="mt-4 rounded-full bg-black/70 px-3.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
                Align QR Code within the frame
              </p>
            </div>
          )}

          {/* Error / Stopped State */}
          {!isScanning && (
            <div className="flex flex-col items-center justify-center p-6 text-center text-white">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white/70 mb-3">
                <CameraOff size={26} />
              </div>
              <p className="text-sm font-semibold text-white/90 max-w-sm">
                {cameraError || "Camera is currently paused."}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => startCamera(selectedCameraId)}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-light)] color-transition shadow"
                >
                  <Camera size={14} />
                  Enable Camera
                </button>
                <label className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer color-transition">
                  <Upload size={14} />
                  Upload QR Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Resolving indicator overlay */}
          {isResolving && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm text-white animate-in fade-in">
              <Loader2 size={36} className="animate-spin text-[var(--color-accent)] mb-3" />
              <p className="text-sm font-bold tracking-wide">Resolving Chemical / Batch Record...</p>
              <p className="text-xs text-white/70 mt-1">Accessing authorized database records</p>
            </div>
          )}
        </div>

        {/* Scan Result Notification Card */}
        {scanResult && (
          <div className="border-t border-green-200 bg-green-50/90 p-4 sm:p-5 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-sm mt-0.5">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800 border border-green-300">
                    Match Found ({scanResult.matchType})
                  </span>
                  <h3 className="text-base font-extrabold text-green-950 mt-1">
                    {scanResult.chemical?.canonicalName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-green-800 font-medium">
                    <span>Code: <strong className="font-bold">{scanResult.chemical?.chemicalCode}</strong></span>
                    {scanResult.batch?.batchNumber && (
                      <span>Batch: <strong className="font-bold">{scanResult.batch?.batchNumber}</strong></span>
                    )}
                    {scanResult.chemical?.binCardNumber && (
                      <span>Bin Card: <strong className="font-bold">{scanResult.chemical?.binCardNumber}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const state = scanResult.batchId ? { highlightedBatchId: scanResult.batchId } : undefined;
                  navigate(`/chemicals/${scanResult.chemicalId}${scanResult.batchId ? `?batchId=${scanResult.batchId}` : ""}`, { state });
                  if (onClose) onClose();
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-md)] bg-green-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-green-800 color-transition shadow"
              >
                <span>View Details</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {resolveError && (
          <div className="border-t border-red-200 bg-red-50 p-4 sm:p-5 flex items-start gap-3 text-red-800 animate-in fade-in">
            <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 text-xs sm:text-sm font-medium">
              <p className="font-bold text-red-900">Record Not Found</p>
              <p className="mt-0.5">{resolveError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Manual Code / Batch Number Search Section (Directly Below Scanner) */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Hash size={18} className="text-[var(--color-primary)]" />
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              Manual Code & Batch Search
            </h3>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            If scanning is difficult, enter the QR code value, Batch Number, Chemical Code (e.g. CHE-000001), or Bin Card Number (e.g. BST001) directly below.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleResolveCode(manualCode);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. BATCH-001, CHE-000001, BST001, or scan payload..."
              disabled={isResolving}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-10 py-3 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] color-transition"
            />
            {manualCode && (
              <button
                type="button"
                onClick={() => setManualCode("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                aria-label="Clear code"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!manualCode.trim() || isResolving}
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--color-primary-light)] disabled:opacity-60 disabled:cursor-not-allowed color-transition shadow-sm"
          >
            {isResolving ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span>Search Record</span>
          </button>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-[var(--color-text-muted)]">Supported Formats:</span>
          <span className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 font-mono text-[var(--color-text-secondary)] border border-[var(--color-border)]">
            Batch Number
          </span>
          <span className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 font-mono text-[var(--color-text-secondary)] border border-[var(--color-border)]">
            CHE-######
          </span>
          <span className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 font-mono text-[var(--color-text-secondary)] border border-[var(--color-border)]">
            BST###
          </span>
          <span className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 font-mono text-[var(--color-text-secondary)] border border-[var(--color-border)]">
            Full QR URL
          </span>
        </div>
      </div>

      {/* Recent Scans History (if any) */}
      {recentScans.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-3 border-b border-[var(--color-border)] pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Recently Scanned Records
            </h4>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("cms-recent-scans");
                setRecentScans([]);
              }}
              className="text-xs text-[var(--color-text-muted)] hover:text-red-600 transition-colors"
            >
              Clear History
            </button>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {recentScans.map((scan, idx) => (
              <div
                key={`${scan.chemicalId}-${scan.batchId || idx}`}
                onClick={() => {
                  const state = scan.batchId ? { highlightedBatchId: scan.batchId } : undefined;
                  navigate(`/chemicals/${scan.chemicalId}${scan.batchId ? `?batchId=${scan.batchId}` : ""}`, { state });
                  if (onClose) onClose();
                }}
                className="flex items-center justify-between py-2.5 px-1 hover:bg-[var(--color-surface-muted)] rounded-[var(--radius-sm)] cursor-pointer color-transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                    <FlaskConical size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                      {scan.canonicalName}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Code: {scan.chemicalCode} {scan.batchNumber ? `• Batch: ${scan.batchNumber}` : ""}
                    </p>
                  </div>
                </div>
                <ArrowRight size={15} className="text-[var(--color-text-muted)] shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;

