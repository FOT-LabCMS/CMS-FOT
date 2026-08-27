import { QrCode, Scan, ArrowLeft, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QRScanner from "../../components/scanner/QRScanner";
import { useAuth } from "../../context/AuthContext";

const ScanQRPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-6 sm:px-6 lg:px-8">
      <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-screen-2xl">
          {/* Page Header */}
          <header className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] p-6 sm:p-8 text-white shadow-[var(--shadow-md)] relative">
            <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[var(--color-primary-light)] opacity-30" />
            <div className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-[var(--color-accent)] opacity-10" />

            <div className="relative z-10">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-4 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-light)] color-transition"
              >
                <ArrowLeft size={15} />
                Back
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                    <Scan size={14} />
                    QR & Batch Verification
                  </div>
                  <h1 className="text-2xl font-extrabold sm:text-3xl text-white">
                    Chemical & Batch QR Scanner
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-white/80 max-w-xl">
                    Scan any chemical bottle or batch label QR code to instantly verify stock, location, safety summaries, and audit logs.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white shrink-0 backdrop-blur-sm self-start sm:self-auto">
                  <ShieldCheck size={16} className="text-[var(--color-accent-light)]" />
                  <span>Authorized as {user?.role?.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Scanner Component */}
          <QRScanner autoNavigate={true} />
        </div>
      </main>
    </div>
  );
};

export default ScanQRPage;

