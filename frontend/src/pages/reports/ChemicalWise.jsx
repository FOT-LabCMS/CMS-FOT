import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Beaker,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileDown,
  FlaskConical,
  Info,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getExpiryInfo = (expiryDate) => {
  if (!expiryDate)
    return { label: "No expiry set", tone: "default", daysLeft: null };
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime()))
    return { label: "No expiry set", tone: "default", daysLeft: null };

  const daysLeft = Math.floor(
    (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (daysLeft < 0) {
    const absDays = Math.abs(daysLeft);
    return { label: `Expired (${absDays} day${absDays === 1 ? "" : "s"})`, tone: "danger", daysLeft };
  }
  if (daysLeft <= 30) {
    return {
      label: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
      tone: "warning",
      daysLeft,
    };
  }
  return { label: `${daysLeft} days left`, tone: "success", daysLeft };
};

const ExpiryBadge = ({ expiryDate }) => {
  const { label, tone } = getExpiryInfo(expiryDate);

  const toneClasses = {
    danger: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
    warning: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
    success: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
    default: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
  };

  const Icon =
    tone === "danger" ? XCircle : tone === "success" ? CheckCircle2 : Clock;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${toneClasses[tone]}`}
    >
      <Icon size={13} />
      {label}
    </span>
  );
};

const BatchCard = ({ batch, baseUnit }) => {
  const usagePercent =
    batch.quantityReceived > 0
      ? Math.min(
          ((batch.quantityReceived - batch.currentQuantity) /
            batch.quantityReceived) *
            100,
          100,
        )
      : 0;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
            <Layers size={16} />
          </div>
          <p className="text-sm font-bold text-[var(--color-text-primary)]">
            Batch No {batch.batchNumber}
          </p>
        </div>
        <ExpiryBadge expiryDate={batch.expiryDate} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Received
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-[var(--color-text-primary)]">
            <Calendar size={12} className="text-[var(--color-text-muted)]" />
            {formatDate(batch.receivedDate)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Expiry
          </p>
          <p className="mt-0.5 text-xs font-bold text-[var(--color-text-primary)]">
            {formatDate(batch.expiryDate)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Received qty
          </p>
          <p className="mt-0.5 text-xs font-bold text-[var(--color-text-primary)]">
            {batch.quantityReceived}
            {baseUnit}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Remaining
          </p>
          <p className="mt-0.5 text-xs font-bold text-[var(--color-primary)]">
            {batch.currentQuantity}
            {baseUnit}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] color-transition"
            style={{ width: `${100 - usagePercent}%` }}
          />
        </div>
      </div>

      {batch.supplier && (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Supplier:{" "}
          <span className="font-semibold text-[var(--color-text-secondary)]">
            {batch.supplier}
          </span>
        </p>
      )}
    </div>
  );
};

const ChemicalWise = () => {
  const navigate = useNavigate();

  const [chemicals, setChemicals] = useState([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCode, setSelectedCode] = useState("");
  const [detail, setDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [isDownloadingFull, setIsDownloadingFull] = useState(false);
  const [fullDownloadError, setFullDownloadError] = useState("");

  const [isPreviewingFull, setIsPreviewingFull] = useState(false);
  const [fullPreviewError, setFullPreviewError] = useState("");

  const fetchChemicals = async () => {
    try {
      setIsListLoading(true);
      setListError("");
      const response = await api.get("/chemicals/");
      setChemicals(response.data?.chemicals || response.data || []);
    } catch (error) {
      setListError(
        error.response?.data?.message || "Unable to load the chemical list.",
      );
    } finally {
      setIsListLoading(false);
    }
  };

  useEffect(() => {
    fetchChemicals();
  }, []);

  const handleSelectChemical = async (chemicalCode) => {
    setSelectedCode(chemicalCode);
    setDetail(null);
    setDetailError("");
    setDownloadError("");

    try {
      setIsDetailLoading(true);
      const response = await api.get(
        `/reports/chemical/${encodeURIComponent(chemicalCode)}`,
      );
      setDetail(response.data);
    } catch (error) {
      setDetailError(
        error.response?.data?.message ||
          "Unable to load report details for this chemical.",
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedCode) return;
    try {
      setIsPreviewing(true);
      setPreviewError("");
      const response = await api.get(
        `/reports/chemical/${encodeURIComponent(selectedCode)}/download`,
        { responseType: "blob" },
      );
      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const newTab = window.open(blobUrl, "_blank");
      // Revoke the object URL after the tab has had time to load it
      if (newTab) {
        newTab.addEventListener("load", () =>
          window.URL.revokeObjectURL(blobUrl),
        );
      }
    } catch (error) {
      setPreviewError("Unable to generate the PDF preview. Please try again.");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedCode) return;
    try {
      setIsDownloading(true);
      setDownloadError("");
      const response = await api.get(
        `/reports/chemical/${encodeURIComponent(selectedCode)}/download`,
        { responseType: "blob" },
      );
      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${selectedCode}-stock-report.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setDownloadError("Unable to generate the PDF report. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreviewFullReport = async () => {
    try {
      setIsPreviewingFull(true);
      setFullPreviewError("");
      const response = await api.get("/reports/inventory/download", {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const newTab = window.open(blobUrl, "_blank");
      if (newTab) {
        newTab.addEventListener("load", () =>
          window.URL.revokeObjectURL(blobUrl),
        );
      }
    } catch (error) {
      setFullPreviewError("Unable to generate the full status report preview. Please try again.");
    } finally {
      setIsPreviewingFull(false);
    }
  };

  const handleDownloadFullReport = async () => {
    try {
      setIsDownloadingFull(true);
      setFullDownloadError("");
      const response = await api.get("/reports/inventory/download", {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `full-inventory-report.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setFullDownloadError("Unable to generate the full status report. Please try again.");
    } finally {
      setIsDownloadingFull(false);
    }
  };

  const filteredChemicals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return chemicals;
    return chemicals.filter(
      (c) =>
        c.canonicalName?.toLowerCase().includes(term) ||
        c.chemicalCode?.toLowerCase().includes(term),
    );
  }, [chemicals, searchTerm]);

  const soonestExpiry = useMemo(() => {
    if (!detail?.batches?.length) return null;
    const withExpiry = detail.batches.filter((b) => b.expiryDate);
    if (withExpiry.length === 0) return null;
    return withExpiry.reduce((soonest, b) =>
      new Date(b.expiryDate) < new Date(soonest.expiryDate) ? b : soonest,
    );
  }, [detail]);

  const totalRemaining = useMemo(() => {
    if (!detail?.batches?.length) return 0;
    return detail.batches.reduce(
      (sum, b) => sum + Number(b.currentQuantity || 0),
      0,
    );
  }, [detail]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">
          {/* Page header */}
          <header className="mb-6 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[var(--color-primary-light)] opacity-30" />
              <div className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-[var(--color-accent)] opacity-10" />

              <div className="relative">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
                  >
                    <ArrowLeft size={17} />
                    Back
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePreviewFullReport}
                      disabled={isPreviewingFull || isDownloadingFull}
                      className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPreviewingFull ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Previewing...
                        </>
                      ) : (
                        <>
                          <Eye size={15} />
                          Preview Report
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadFullReport}
                      disabled={isDownloadingFull || isPreviewingFull}
                      className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-accent-light)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDownloadingFull ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download size={15} />
                          Full Status Report
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                        <FileDown size={14} />
                        Reports
                      </span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                      Chemical Stock Report
                    </h1>
                  </div>

                  <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)]">
                      <Info size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-light)]">
                        Chemicals tracked
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--color-text-inverse)]">
                        {isListLoading ? "—" : chemicals.length} total
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {(fullDownloadError || fullPreviewError) && (
            <div className="mb-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
              <p className="text-sm font-semibold text-[var(--color-danger)]">{fullDownloadError || fullPreviewError}</p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            {/* Left: chemical list */}
            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                <div className="border-b border-[var(--color-border)] p-4">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                    />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search chemicals..."
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>

                {listError ? (
                  <div className="flex flex-col items-center gap-2 p-6 text-center">
                    <AlertTriangle
                      size={20}
                      className="text-[var(--color-danger)]"
                    />
                    <p className="text-xs font-semibold text-[var(--color-danger)]">
                      {listError}
                    </p>
                    <button
                      type="button"
                      onClick={fetchChemicals}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] underline"
                    >
                      <RefreshCw size={12} />
                      Retry
                    </button>
                  </div>
                ) : isListLoading ? (
                  <div className="flex flex-col items-center gap-2 p-8">
                    <Loader2
                      size={22}
                      className="animate-spin text-[var(--color-primary)]"
                    />
                    <p className="text-xs font-medium text-[var(--color-text-muted)]">
                      Loading chemicals...
                    </p>
                  </div>
                ) : filteredChemicals.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-xs font-medium text-[var(--color-text-muted)]">
                      No chemicals found.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[70vh] overflow-y-auto lg:max-h-[calc(100vh-260px)]">
                    {filteredChemicals.map((chem) => (
                      <button
                        key={chem.chemicalCode || chem.id}
                        type="button"
                        onClick={() => handleSelectChemical(chem.chemicalCode)}
                        className={`flex w-full items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left color-transition last:border-b-0 hover:bg-[var(--color-primary-tint)] ${
                          selectedCode === chem.chemicalCode
                            ? "bg-[var(--color-primary-tint)]"
                            : ""
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
                            selectedCode === chem.chemicalCode
                              ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                              : "bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                          }`}
                        >
                          <FlaskConical size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-semibold ${
                              selectedCode === chem.chemicalCode
                                ? "text-[var(--color-primary)]"
                                : "text-[var(--color-text-primary)]"
                            }`}
                          >
                            {chem.canonicalName}
                          </p>
                          <p className="truncate text-xs text-[var(--color-text-muted)]">
                            {chem.chemicalCode}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            {/* Right: detail panel */}
            <section>
              {!selectedCode && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-16 text-center">
                  <Beaker
                    size={32}
                    className="text-[var(--color-text-muted)]"
                  />
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    No chemical selected
                  </p>
                  <p className="max-w-sm text-xs text-[var(--color-text-muted)]">
                    Choose a chemical from the list to view its full stock
                    report.
                  </p>
                </div>
              )}

              {selectedCode && isDetailLoading && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-16 shadow-[var(--shadow-sm)]">
                  <Loader2
                    size={28}
                    className="animate-spin text-[var(--color-primary)]"
                  />
                  <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                    Loading report...
                  </p>
                </div>
              )}

              {selectedCode && detailError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-surface)] p-4"
                >
                  <AlertTriangle
                    size={20}
                    className="mt-0.5 shrink-0 text-[var(--color-danger)]"
                  />
                  <p className="text-sm font-semibold text-[var(--color-danger)]">
                    {detailError}
                  </p>
                </div>
              )}

              {selectedCode && !isDetailLoading && detail && (
                <div className="space-y-6">
                  {/* Summary + download */}
                  <div className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
                    <div className="relative p-5 sm:p-7">
                      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--color-primary-light)] opacity-20" />
                      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                          <span className="inline-flex rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary-dark)]">
                            {detail.chemicalCode}
                          </span>
                          <h2 className="mt-3 truncate text-xl font-extrabold text-[var(--color-text-inverse)] sm:text-2xl">
                            {detail.canonicalName}
                          </h2>
                          <p className="mt-1 text-sm text-[var(--color-text-inverse)] opacity-75">
                            {detail.batches?.length || 0} batch
                            {(detail.batches?.length || 0) === 1 ? "" : "es"} on
                            record
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={handlePreview}
                            disabled={isPreviewing || isDownloading}
                            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isPreviewing ? (
                              <>
                                <Loader2 size={17} className="animate-spin" />
                                Previewing...
                              </>
                            ) : (
                              <>
                                <Eye size={17} />
                                Preview report
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleDownload}
                            disabled={isDownloading || isPreviewing}
                            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-accent-light)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 size={17} className="animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Download size={17} />
                                Download report
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Quick stats */}
                      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-inverse)]/60">
                            Base unit
                          </p>
                          <p className="mt-1 text-lg font-extrabold text-[var(--color-text-inverse)]">
                            {detail.baseUnit}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-inverse)]/60">
                            Total remaining
                          </p>
                          <p className="mt-1 text-lg font-extrabold text-[var(--color-text-inverse)]">
                            {totalRemaining}
                            {detail.baseUnit}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-inverse)]/60">
                            Next to expire
                          </p>
                          <p className="mt-1 text-lg font-extrabold text-[var(--color-text-inverse)]">
                            {soonestExpiry
                              ? formatDate(soonestExpiry.expiryDate)
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(downloadError || previewError) && (
                    <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-surface)] p-4">
                      <AlertTriangle
                        size={18}
                        className="mt-0.5 shrink-0 text-[var(--color-danger)]"
                      />
                      <p className="text-sm font-semibold text-[var(--color-danger)]">
                        {downloadError || previewError}
                      </p>
                    </div>
                  )}

                  {/* Batch list */}
                  {!detail.batches || detail.batches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-12 text-center">
                      <Package
                        size={26}
                        className="text-[var(--color-text-muted)]"
                      />
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        No batches recorded for this chemical
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detail.batches.map((batch) => (
                        <BatchCard
                          key={batch.batchNumber}
                          batch={batch}
                          baseUnit={detail.baseUnit}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChemicalWise;
