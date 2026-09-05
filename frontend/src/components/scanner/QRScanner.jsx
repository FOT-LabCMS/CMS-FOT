import { useEffect, useRef, useState, useCallback, useId } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import {
  Camera,
  CameraOff,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  QrCode,
  Upload,
  ArrowRight,
  FlaskConical,
  Hash,
  X,
  FlipHorizontal,
} from "lucide-react";
import api from "../../api/axiosInstance";

const QRScanner = ({ onResult, autoNavigate = true, isModal = false, onClose }) => {
  const navigate = useNavigate();
  const rawId = useId();
  const readerId = `qr-reader-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const scannerRef = useRef(null);
  const isMountedRef = useRef(true);
  const shouldBeScanningRef = useRef(false);
  // Prevents concurrent startCamera() calls (e.g. double-tap or StrictMode).
  const isStartingRef = useRef(false);

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

  // ---------------------------------------------------------------------------
  // stopCamera – lets html5-qrcode manage its own DOM.
  //
  // The library's stop() calls element.removeChild(canvasElement) and
  // close() calls parentElement.removeChild(videoElement).  If we wipe
  // container.innerHTML before or during those calls WebKit throws:
  //   "Node.removeChild: Argument 1 is not an instance of Node"
  // which is exactly the Safari warning that was observed.
  //
  // Rule: do NOT touch the readerId container's innerHTML anywhere in this
  // component.  Let stop() / clear() own the scanner DOM.
  // ---------------------------------------------------------------------------
  const stopCamera = useCallback(async (explicitUserAction = false) => {
    shouldBeScanningRef.current = false;
    if (explicitUserAction) {
      try {
        localStorage.setItem("cms-scanner-power", "off");
        sessionStorage.setItem("cms-scanner-power", "off");
      } catch {
        // ignore
      }
    }

    const scanner = scannerRef.current;
    if (!scanner) {
      setIsScanning(false);
      return;
    }

    try {
      const state = scanner.getState?.();
      if (
        state === Html5QrcodeScannerState.SCANNING ||
        state === Html5QrcodeScannerState.PAUSED
      ) {
        await scanner.stop();
      }
    } catch (stopErr) {
      // html5-qrcode throws a string "Cannot stop, scanner is not running…"
      // when stop() is called in a non-scanning state.  This is safe to ignore.
      console.warn("scanner.stop() warning:", stopErr);
    }

    try {
      await scanner.clear();
    } catch {
      // ignore – clear() wipes innerHTML which may already be empty
    }

    scannerRef.current = null;
    setIsScanning(false);
  }, []);

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
          binCardNumber: data.chemical?.binCardNumber,
          canonicalName: data.chemical?.canonicalName,
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

          // Immediately shut down camera when match is found before navigating away
          stopCamera();

          // Navigate directly to the chemical details page
          setTimeout(() => {
            const state = data.batchId ? { highlightedBatchId: data.batchId } : undefined;
            navigate(`/chemicals/${data.chemicalId}${data.batchId ? `?batchId=${data.batchId}` : ""}`, { state });
            if (onClose) onClose();
          }, 400);
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
  }, [autoNavigate, navigate, onResult, onClose, saveRecentScan, stopCamera]);

  // ---------------------------------------------------------------------------
  // startCamera
  //
  // iOS/WebKit camera rules:
  //   1. getUserMedia() must be called within a synchronous user-gesture
  //      activation context.  Every extra await before the call risks
  //      expiring that activation window.
  //   2. html5-qrcode v2.3.8's getCameras() internally opens the camera
  //      (getUserMedia) and then immediately stops the tracks.  Calling it
  //      before start() causes a double open-close-open cycle that leaves
  //      iOS with a degraded stream (videoWidth === 0 in the decode loop).
  //   3. aspectRatio applied via applyConstraints() post-acquisition is a
  //      known source of OverconstrainedError on iOS and leaks the stream
  //      when it throws (because the RenderedCameraImpl is not yet wired up).
  //
  // Fix strategy:
  //   A. Do NOT call getCameras() before start().
  //   B. Start with { facingMode: "environment" } (soft/ideal constraint).
  //   C. Do NOT pass aspectRatio in the scan config.
  //   D. After a successful start, enumerate cameras in the background
  //      (fire-and-forget) purely for the Flip-camera UI.
  //   E. Avoid touching the scanner container's innerHTML – let the library
  //      own its DOM.
  // ---------------------------------------------------------------------------
  const startCamera = useCallback(async (cameraId = null) => {
    // Prevent concurrent startup calls (double-tap, StrictMode double-invoke).
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    shouldBeScanningRef.current = true;
    try {
      localStorage.setItem("cms-scanner-power", "on");
      sessionStorage.setItem("cms-scanner-power", "on");
    } catch {
      // ignore
    }
    setCameraError(null);
    setScanResult(null);
    setResolveError(null);

    // getUserMedia is only exposed in secure contexts (HTTPS) or localhost.
    const hostname =
      typeof window !== "undefined" ? window.location.hostname : "";
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";
    const mediaDevicesUnavailable =
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia;

    if (mediaDevicesUnavailable) {
      if (isMountedRef.current && shouldBeScanningRef.current) {
        setCameraError(
          isLocalHost
            ? "Camera is not available in this browser. Please use the 'Upload QR Image' or 'Manual Code Search' options instead."
            : "Camera access requires a secure (HTTPS) connection. This page is currently being served over plain HTTP, so mobile browsers block the camera. Please access the application over HTTPS, or use the 'Upload QR Image' / 'Manual Code Search' options below."
        );
        setIsScanning(false);
      }
      isStartingRef.current = false;
      return;
    }

    // ---------------------------------------------------------------------------
    // Tear down any previously running scanner instance.
    //
    // We call stop()/clear() only when the library reports an active scan.
    // We do NOT manually clear container.innerHTML – the library does that
    // inside clear().  Clearing it ourselves before stop() causes the
    // "Node.removeChild: Argument 1 is not an instance of Node" Safari error
    // because the library's stop() still tries to removeChild() elements that
    // we already destroyed.
    // ---------------------------------------------------------------------------
    if (scannerRef.current) {
      try {
        const prevState = scannerRef.current.getState?.();
        if (
          prevState === Html5QrcodeScannerState.SCANNING ||
          prevState === Html5QrcodeScannerState.PAUSED
        ) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore – may already be stopped
      }
      try {
        await scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }

    if (!isMountedRef.current || !shouldBeScanningRef.current) {
      isStartingRef.current = false;
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode(readerId);
      scannerRef.current = html5QrCode;

      // Use { facingMode: "environment" } (soft/ideal back-camera preference)
      // for the initial start.  An explicit deviceId is only used when the
      // user manually switches cameras via the Flip button, because an exact
      // deviceId constraint is unreliable on iOS/WebKit for the first start.
      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: "environment" };

      // No aspectRatio – see note above.  fps: 15 keeps CPU usage reasonable.
      const scanConfig = { fps: 15 };

      setIsScanning(true);

      const onDecoded = (decodedText) => {
        console.log("QR Code decoded:", decodedText);
        handleResolveCode(decodedText);
      };

      const onDecodeError = () => {
        // frame misses – intentionally silent
      };

      // Primary start attempt.
      let startSucceeded = false;
      try {
        await html5QrCode.start(cameraConfig, scanConfig, onDecoded, onDecodeError);
        startSucceeded = true;
      } catch (primaryErr) {
        // If the primary config failed (e.g. exact deviceId not found on this
        // device) AND we were using a specific deviceId, retry once with the
        // soft facingMode fallback.
        if (cameraId) {
          console.warn("Primary camera start failed, trying facingMode fallback:", primaryErr);
          try {
            await html5QrCode.start(
              { facingMode: "environment" },
              scanConfig,
              onDecoded,
              onDecodeError
            );
            startSucceeded = true;
          } catch (fallbackErr) {
            // Both attempts failed – throw the original error so the catch
            // block below can show the user a meaningful message.
            throw primaryErr;
          }
        } else {
          throw primaryErr;
        }
      }

      // Guard: component may have been unmounted or user pressed Pause while
      // the camera was still starting.
      if (!isMountedRef.current || !shouldBeScanningRef.current) {
        try {
          const st = html5QrCode.getState?.();
          if (
            st === Html5QrcodeScannerState.SCANNING ||
            st === Html5QrcodeScannerState.PAUSED
          ) {
            await html5QrCode.stop();
          }
          await html5QrCode.clear();
        } catch {
          // ignore
        }
        scannerRef.current = null;
        setIsScanning(false);
        isStartingRef.current = false;
        return;
      }

      // -----------------------------------------------------------------------
      // Deferred camera enumeration for the Flip-camera UI.
      //
      // getCameras() internally opens the camera (getUserMedia) and immediately
      // stops the tracks.  Calling it BEFORE start() causes a double open on
      // iOS.  We call it AFTER the scanner is successfully running so that the
      // first getUserMedia (inside start()) is not disturbed.
      //
      // Note: on some iOS/WebKit versions getCameras() may still fail even
      // after a successful start().  We swallow the error and simply hide the
      // Flip button (cameras stays empty → cameras.length <= 1).
      // -----------------------------------------------------------------------
      if (startSucceeded && isMountedRef.current) {
        Html5Qrcode.getCameras()
          .then((devices) => {
            if (!isMountedRef.current) return;
            if (devices && devices.length > 0) {
              setCameras(devices);
              if (!selectedCameraId) {
                const rearCamera = devices.find(
                  (d) =>
                    d.label.toLowerCase().includes("back") ||
                    d.label.toLowerCase().includes("rear") ||
                    d.label.toLowerCase().includes("environment")
                );
                setSelectedCameraId(rearCamera ? rearCamera.id : devices[0].id);
              }
            }
          })
          .catch((e) => {
            // Non-fatal – Flip button simply won't appear.
            console.warn("Could not enumerate camera devices (Flip UI will be hidden):", e);
          });
      }
    } catch (err) {
      if (!isMountedRef.current || !shouldBeScanningRef.current) {
        isStartingRef.current = false;
        return;
      }
      console.error("Camera startup error:", err);

      // html5-qrcode rejects with plain strings such as
      // "Error getting userMedia, error = NotAllowedError: …"
      // so we inspect both err.name (if it's an Error object) and the
      // stringified text.
      const errName = typeof err === "object" ? (err?.name || "") : "";
      const errText = typeof err === "string" ? err : (err?.message || "");
      const combined = `${errName} ${errText}`.toLowerCase();

      let message;
      if (errName === "NotAllowedError" || errName === "SecurityError" || combined.includes("notallowed")) {
        message =
          "Camera permission was denied. Please allow camera access in your browser settings, or use the 'Upload QR Image' / 'Manual Code Search' options instead.";
      } else if (
        errName === "NotFoundError" ||
        errName === "OverconstrainedError" ||
        combined.includes("notfound") ||
        combined.includes("overconstrained")
      ) {
        message =
          "No usable camera was found on this device. You can still use the 'Upload QR Image' / 'Manual Code Search' options.";
      } else if (errName === "NotReadableError" || errName === "AbortError" || combined.includes("notreadable")) {
        message =
          "The camera is currently unavailable (it may be in use by another application). Try again, or use the 'Upload QR Image' / 'Manual Code Search' options.";
      } else {
        message =
          "Unable to access the camera. If the app is being served over plain HTTP, mobile browsers block camera access — please use HTTPS. You can also use the 'Upload QR Image' / 'Manual Code Search' options.";
      }
      setCameraError(message);
      setIsScanning(false);

      // Clean up the scanner instance so a retry starts fresh.
      if (scannerRef.current) {
        try { await scannerRef.current.clear(); } catch { /* ignore */ }
        scannerRef.current = null;
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [readerId, selectedCameraId, handleResolveCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch camera (Flip button)
  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
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

  // ---------------------------------------------------------------------------
  // Mount effect
  //
  // iOS/WebKit note: getUserMedia() requires a genuine synchronous user-gesture
  // context.  A setTimeout() callback is NOT a user gesture on iOS – the
  // camera popup may not appear or may silently fail, leaving the page in a
  // bad permission state for the rest of the session.
  //
  // Detection: we treat any device that matches the iPad/iPhone/iPod UA string
  // OR a desktop Safari UA with touch points > 1 (iPadOS 13+ reports as Mac)
  // as iOS and skip the automatic timer-based start.  The user must tap
  // "Start Camera" manually on those devices, which provides the required
  // synchronous gesture context.
  //
  // Non-iOS platforms (Android, desktop) continue to auto-start after a short
  // delay as before.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;
    isStartingRef.current = false;
    let active = true;
    let initTimer = null;

    // Check if scanner was explicitly turned off previously by the user
    let isExplicitlyOff = false;
    if (!isModal) {
      try {
        isExplicitlyOff =
          localStorage.getItem("cms-scanner-power") === "off" ||
          sessionStorage.getItem("cms-scanner-power") === "off";
      } catch {
        isExplicitlyOff = false;
      }
    }

    // Detect iOS / iPadOS
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports "MacIntel" but exposes touch support unlike real Macs
      (ua.includes("Macintosh") &&
        typeof navigator !== "undefined" &&
        navigator.maxTouchPoints > 1);

    if (isExplicitlyOff || isIOS) {
      // On iOS let the user initiate via the "Start Camera" button so that
      // getUserMedia() is called synchronously from within a user gesture.
      shouldBeScanningRef.current = false;
    } else {
      // Non-iOS: auto-start after a short delay
      initTimer = setTimeout(() => {
        if (active && isMountedRef.current) {
          startCamera();
        }
      }, 50);
    }

    const handleBeforeUnload = () => {
      // Best-effort: stop all scanner tracks when the page is hidden/closed.
      // We do not call scanner.stop() here because that is async; we just
      // stop the underlying tracks directly.
      try {
        const scanner = scannerRef.current;
        if (scanner) {
          const st = scanner.getState?.();
          if (
            st === Html5QrcodeScannerState.SCANNING ||
            st === Html5QrcodeScannerState.PAUSED
          ) {
            scanner.stop().catch(() => {});
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("pagehide", handleBeforeUnload);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMountedRef.current = false;
      shouldBeScanningRef.current = false;
      active = false;
      if (initTimer) {
        clearTimeout(initTimer);
      }
      window.removeEventListener("pagehide", handleBeforeUnload);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Cleanup on unmount – stop the scanner if it is running.
      // We do not await here (React cleanup cannot be async) so we fire-and-
      // forget.  The library will stop the camera track and remove its own DOM.
      const scanner = scannerRef.current;
      if (scanner) {
        try {
          const st = scanner.getState?.();
          if (
            st === Html5QrcodeScannerState.SCANNING ||
            st === Html5QrcodeScannerState.PAUSED
          ) {
            scanner.stop().catch(() => {});
          }
        } catch {
          // ignore
        }
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`w-full ${isModal ? "flex flex-col gap-4" : "flex flex-col gap-6"}`}>
      <div className={isModal ? "flex flex-col gap-4" : "grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start"}>
        {/* Left Column: Live Scanner Viewport */}
        <div className={isModal ? "w-full" : "lg:col-span-7 flex flex-col gap-4"}>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
            {/* Header Bar */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white shadow-sm">
                  <QrCode size={20} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] leading-tight">
                    Live QR Code Scanner
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Point camera at chemical or batch QR label
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {cameras.length > 1 && isScanning && (
                  <button
                    type="button"
                    onClick={switchCamera}
                    title="Switch Camera"
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] color-transition"
                  >
                    <FlipHorizontal size={14} />
                    <span className="hidden sm:inline">Flip</span>
                  </button>
                )}

                {isScanning ? (
                  <button
                    type="button"
                    onClick={() => stopCamera(true)}
                    title="Pause and turn off scanner camera"
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 color-transition"
                  >
                    <CameraOff size={14} />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    title="Start scanner camera"
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
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-danger)] transition-colors ml-1"
                    aria-label="Close"
                  >
                    <X size={17} />
                  </button>
                )}
              </div>
            </div>

            {/* Viewport Area */}
            <div className="relative bg-black/95 p-3 flex flex-col items-center justify-center min-h-[175px] sm:min-h-[195px]">
              <style>{`
                #${readerId} {
                  border: none !important;
                }
                #${readerId} #qr-shaded-region,
                #${readerId} #qr-shaded-region * {
                  display: none !important;
                  border: none !important;
                }
                #${readerId} video {
                  object-fit: cover !important;
                  max-height: 195px !important;
                  border-radius: var(--radius-md);
                  margin: 0 auto;
                  border: none !important;
                }
                #${readerId} img[alt="Info icon"],
                #${readerId} > div:first-child:not(:has(video)) {
                  display: none !important;
                }
              `}</style>

              {/* html5-qrcode video container */}
              <div
                id={readerId}
                className={`w-full max-w-[260px] sm:max-w-[300px] max-h-[175px] sm:max-h-[195px] overflow-hidden rounded-[var(--radius-md)] border-0 bg-black ${
                  isScanning ? "block" : "hidden"
                }`}
              />

              {/* Scanner Overlay Guide when active */}
              {isScanning && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-lg border-2 border-[var(--color-accent)] shadow-[0_0_12px_rgba(234,179,8,0.3)] flex items-center justify-center">
                    {/* Laser animation bar */}
                    <div className="absolute left-2 right-2 h-0.5 bg-[var(--color-accent)] shadow-[0_0_6px_#eab308] animate-pulse" />
                    <div className="absolute top-1 left-1 h-2.5 w-2.5 border-t-2 border-l-2 border-[var(--color-accent)]" />
                    <div className="absolute top-1 right-1 h-2.5 w-2.5 border-t-2 border-r-2 border-[var(--color-accent)]" />
                    <div className="absolute bottom-1 left-1 h-2.5 w-2.5 border-b-2 border-l-2 border-[var(--color-accent)]" />
                    <div className="absolute bottom-1 right-1 h-2.5 w-2.5 border-b-2 border-r-2 border-[var(--color-accent)]" />
                  </div>
                  <p className="mt-2 rounded-full bg-black/80 px-3 py-0.5 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
                    Align QR Code within frame
                  </p>
                </div>
              )}

              {/* Error / Stopped State */}
              {!isScanning && (
                <div className="flex flex-col items-center justify-center p-4 text-center text-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 mb-2">
                    <CameraOff size={20} />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-white/90 max-w-sm">
                    {cameraError || "Camera scanner is paused."}
                  </p>
                  <p className="text-xs text-white/60 mt-0.5 max-w-sm">
                    Click Start Camera below to scan with webcam, or use manual search
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-primary-light)] color-transition shadow"
                    >
                      <Camera size={14} />
                      Start Camera
                    </button>
                    <label className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer color-transition">
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
                  <Loader2 size={28} className="animate-spin text-[var(--color-accent)] mb-1.5" />
                  <p className="text-xs font-bold tracking-wide">Resolving Record...</p>
                  <p className="text-[10px] text-white/70 mt-0.5">Accessing authorized database records</p>
                </div>
              )}
            </div>

            {/* Scan Result Notification Card */}
            {scanResult && (
              <div className="border-t border-green-200 bg-green-50/90 p-4 sm:p-5 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-sm mt-0.5">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-800 border border-green-300">
                        Match Found ({scanResult.matchType})
                      </span>
                      <h3 className="text-base font-extrabold text-green-950 mt-1">
                        {scanResult.chemical?.canonicalName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-green-800 font-medium">
                        <span>Bin Card: <strong className="font-bold">{scanResult.chemical?.binCardNumber}</strong></span>
                        {scanResult.batch?.batchNumber && (
                          <span>Batch: <strong className="font-bold">{scanResult.batch?.batchNumber}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      const state = scanResult.batchId ? { highlightedBatchId: scanResult.batchId } : undefined;
                      navigate(`/chemicals/${scanResult.chemicalId}${scanResult.batchId ? `?batchId=${scanResult.batchId}` : ""}`, { state });
                      if (onClose) onClose();
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] bg-green-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-green-800 color-transition shadow"
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
                  <p className="mt-0.5 text-xs text-red-700">{resolveError}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Manual Code Search & History */}
        <div className={isModal ? "w-full flex flex-col gap-4" : "lg:col-span-5 flex flex-col gap-4"}>
          {/* Manual Code / Batch Number Search Section */}
          <div
            onClick={() => {
              if (isScanning) stopCamera(true);
            }}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]"
          >
            {/* Header Bar matching Left Card */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)] shadow-sm">
                  <Hash size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] leading-tight">
                    Manual Code &amp; Batch Search
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Enter code or bin card number manually
                  </p>
                </div>
              </div>

              {!isScanning && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-300 shrink-0">
                  Manual Active
                </span>
              )}
            </div>

            {/* Form Body */}
            <div className="p-4 sm:p-6">
              <p className="mb-3 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Enter QR payload, Batch Number, or Bin Card Number (e.g. BST001) below to search records:
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isScanning) stopCamera(true);
                  handleResolveCode(manualCode);
                }}
                className="flex flex-col gap-3"
              >
                <div className="relative w-full">
                  <Search
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                  />
                  <input
                    type="text"
                    value={manualCode}
                    onFocus={() => {
                      if (isScanning) stopCamera(true);
                    }}
                    onClick={() => {
                      if (isScanning) stopCamera(true);
                    }}
                    onChange={(e) => {
                      if (isScanning) stopCamera(true);
                      setManualCode(e.target.value);
                    }}
                    placeholder="e.g. BATCH-001, BST001, or code..."
                    disabled={isResolving}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-10 py-2.5 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] color-transition"
                  />
                  {manualCode && (
                    <button
                      type="button"
                      onClick={() => setManualCode("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      aria-label="Clear code"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!manualCode.trim() || isResolving}
                  className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--color-primary-light)] disabled:opacity-60 disabled:cursor-not-allowed color-transition shadow-sm"
                >
                  {isResolving ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  <span>Search Record</span>
                </button>
              </form>

              {/* Quick Suggestion Pills */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-[var(--color-text-muted)]">Supported:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (isScanning) stopCamera(true);
                  }}
                  className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1 font-mono text-xs text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                >
                  Batch Number
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isScanning) stopCamera(true);
                  }}
                  className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1 font-mono text-xs text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                >
                  BST###
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isScanning) stopCamera(true);
                  }}
                  className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1 font-mono text-xs text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                >
                  Full QR URL
                </button>
              </div>
            </div>
          </div>

          {/* Recent Scans History (if any) */}
          {recentScans.length > 0 && (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 sm:px-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Recently Scanned Records
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("cms-recent-scans");
                    setRecentScans([]);
                  }}
                  className="text-xs font-medium text-[var(--color-text-muted)] hover:text-red-600 transition-colors"
                >
                  Clear
                </button>
              </div>

              <div className="p-3 sm:p-4 divide-y divide-[var(--color-border)]">
                {recentScans.slice(0, 3).map((scan, idx) => (
                  <div
                    key={`${scan.chemicalId}-${scan.batchId || idx}`}
                    onClick={() => {
                      stopCamera();
                      const state = scan.batchId ? { highlightedBatchId: scan.batchId } : undefined;
                      navigate(`/chemicals/${scan.chemicalId}${scan.batchId ? `?batchId=${scan.batchId}` : ""}`, { state });
                      if (onClose) onClose();
                    }}
                    className="flex items-center justify-between py-2.5 px-2 hover:bg-[var(--color-surface-muted)] rounded-[var(--radius-sm)] cursor-pointer color-transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                        <FlaskConical size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                          {scan.canonicalName}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                          Bin: <strong className="font-semibold text-[var(--color-text-secondary)]">{scan.binCardNumber}</strong> {scan.batchNumber ? `• Batch: ${scan.batchNumber}` : ""}
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
      </div>
    </div>
  );
};

export default QRScanner;
