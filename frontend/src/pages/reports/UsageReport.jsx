import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  FlaskConical,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Tag,
  TrendingDown,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toInputDate = (d) => d.toISOString().slice(0, 10);

/* ─── Status Badge ─────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    RETURNED: {
      cls: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
      Icon: CheckCircle2,
    },
    RELEASED: {
      cls: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
      Icon: Clock,
    },
  };
  const { cls, Icon } = map[status] || {
    cls: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
    Icon: Tag,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${cls}`}
    >
      <Icon size={11} />
      {status}
    </span>
  );
};

/* ─── Stat Card ────────────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}
    >
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-base font-extrabold text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  </div>
);

/* ─── Sortable Column Header ───────────────────────────────────────────────── */
const SortHeader = ({ label, field, sortField, sortDir, onSort }) => {
  const active = sortField === field;
  const Icon = active && sortDir === "asc" ? ChevronUp : ChevronDown;
  return (
    <th
      scope="col"
      onClick={() => onSort(field)}
      className="cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon
          size={12}
          className={active ? "text-[var(--color-accent)]" : "opacity-30"}
        />
      </span>
    </th>
  );
};

/* ─── Main Component ───────────────────────────────────────────────────────── */
const UsageReport = () => {
  const navigate = useNavigate();

  /* Date range — default: last 30 days */
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(toInputDate(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [sortField, setSortField] = useState("dateReleased");
  const [sortDir, setSortDir] = useState("desc");

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const fetchRecords = useCallback(async () => {
    if (!startDate || !endDate) return;
    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date must be before or equal to end date.");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      setDownloadError("");
      const { data } = await api.get("/reports/usage", {
        params: { startDate, endDate },
      });
      setRecords(data?.records || data || []);
      setHasSearched(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load usage records. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records
      .filter((r) => {
        const matchStatus =
          statusFilter === "ALL" || r.returnedStatus === statusFilter;
        const matchSearch =
          !term ||
          r.chemicalCode?.toLowerCase().includes(term) ||
          r.chemicalName?.toLowerCase().includes(term) ||
          r.batchNumber?.toLowerCase().includes(term) ||
          r.stuRegisterNum?.toLowerCase().includes(term) ||
          r.purpose?.toLowerCase().includes(term);
        return matchStatus && matchSearch;
      })
      .sort((a, b) => {
        let av = a[sortField];
        let bv = b[sortField];
        if (sortField === "dateReleased" || sortField === "dateReturned") {
          av = av ? new Date(av).getTime() : 0;
          bv = bv ? new Date(bv).getTime() : 0;
        } else if (typeof av === "string") {
          av = av?.toLowerCase() ?? "";
          bv = bv?.toLowerCase() ?? "";
        }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [records, search, statusFilter, sortField, sortDir]);

  const totalUsage = useMemo(
    () => filtered.reduce((s, r) => s + Number(r.quantityUsed || 0), 0),
    [filtered],
  );
  const returnedCount = useMemo(
    () => filtered.filter((r) => r.returnedStatus === "RETURNED").length,
    [filtered],
  );
  const releasedCount = useMemo(
    () => filtered.filter((r) => r.returnedStatus === "RELEASED").length,
    [filtered],
  );
  const uniqueChemicals = useMemo(
    () => new Set(filtered.map((r) => r.chemicalCode)).size,
    [filtered],
  );

  const handleDownload = async () => {
    if (!hasSearched) return;
    try {
      setIsDownloading(true);
      setDownloadError("");
      const response = await api.get("/reports/usage/download", {
        params: { startDate, endDate },
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `usage-report-${startDate}-to-${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      setDownloadError("Failed to generate the PDF report. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (!hasSearched) return;
    try {
      setIsPreviewing(true);
      setPreviewError("");
      const response = await api.get("/reports/usage/download", {
        params: { startDate, endDate },
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
    } catch {
      setPreviewError("Failed to generate the PDF preview. Please try again.");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleReset = () => {
    setStartDate(toInputDate(thirtyDaysAgo));
    setEndDate(toInputDate(today));
    setSearch("");
    setStatusFilter("ALL");
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">
          {/* ── Page Header ─────────────────────────────────────────────── */}
          <header className="mb-6 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              {/* decorative blobs */}
              <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[var(--color-primary-light)] opacity-30" />
              <div className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-[var(--color-accent)] opacity-10" />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="mb-5 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
                >
                  <ArrowLeft size={17} />
                  Back
                </button>

                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                        <FileText size={14} />
                        Reports
                      </span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                      Usage History & Report
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-inverse)] opacity-80 sm:text-base">
                      View chemical usage records within a selected date range —
                      track releases, returns, quantities used, and purpose.
                    </p>
                  </div>

                  {/* quick stat chip in header */}
                  <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)]">
                      <ClipboardList size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-light)]">
                        Records found
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--color-text-inverse)]">
                        {isLoading ? "—" : filtered.length} total
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* ── Filter Panel ────────────────────────────────────────────── */}
          <div className="mb-6 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-3">
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-[var(--color-primary)]" />
                <span className="text-sm font-bold text-[var(--color-text-primary)]">
                  Filter &amp; Search
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Start Date */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Start Date
                  </label>
                  <div className="relative">
                    <Calendar
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                    />
                    <input
                      type="date"
                      value={startDate}
                      max={endDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-9 pr-3 text-sm font-medium text-[var(--color-text-primary)] color-transition focus:border-[var(--color-primary)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* End Date */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    End Date
                  </label>
                  <div className="relative">
                    <Calendar
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                    />
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-9 pr-3 text-sm font-medium text-[var(--color-text-primary)] color-transition focus:border-[var(--color-primary)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Search */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Search
                  </label>
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Chemical, batch, purpose…"
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-9 pr-3 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 px-3 text-sm font-medium text-[var(--color-text-primary)] color-transition focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    <option value="ALL">All statuses</option>
                    <option value="RELEASED">Released</option>
                    <option value="RETURNED">Returned</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={fetchRecords}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <Filter size={16} />
                      Apply Filter
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] color-transition hover:bg-[var(--color-surface-muted)]"
                >
                  <RotateCcw size={15} />
                  Reset
                </button>

                {hasSearched && filtered.length > 0 && (
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePreview}
                      disabled={isPreviewing || isDownloading}
                      className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-bold text-[var(--color-text-secondary)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPreviewing ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Previewing…
                        </>
                      ) : (
                        <>
                          <Eye size={16} />
                          Preview Usage Report
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={isDownloading || isPreviewing}
                      className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-5 py-2.5 text-sm font-bold text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-accent-light)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Generating PDF…
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          Download Usage Report
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Download error */}
              {(downloadError || previewError) && (
                <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-danger)] bg-[var(--color-danger)]/5 px-4 py-3">
                  <AlertTriangle
                    size={16}
                    className="shrink-0 text-[var(--color-danger)]"
                  />
                  <p className="text-sm font-semibold text-[var(--color-danger)]">
                    {downloadError || previewError}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Stats Row ───────────────────────────────────────────────── */}
          {hasSearched && !isLoading && filtered.length > 0 && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={ClipboardList}
                label="Total Records"
                value={filtered.length}
                accent="bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
              />
              <StatCard
                icon={FlaskConical}
                label="Unique Chemicals"
                value={uniqueChemicals}
                accent="bg-[var(--color-accent)]/10 text-[var(--color-accent-dark)]"
              />
              <StatCard
                icon={TrendingDown}
                label="Total Qty Used"
                value={totalUsage.toFixed(2)}
                accent="bg-[var(--color-info)]/10 text-[var(--color-info)]"
              />
              <StatCard
                icon={CheckCircle2}
                label="Returned / Released"
                value={`${returnedCount} / ${releasedCount}`}
                accent="bg-[var(--color-success)]/10 text-[var(--color-success)]"
              />
            </div>
          )}

          {/* ── Error ───────────────────────────────────────────────────── */}
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
            >
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-[var(--color-danger)]"
              />
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--color-danger)]">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={fetchRecords}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] underline"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            </div>
          )}

          {/* ── Loading Skeleton ─────────────────────────────────────────── */}
          {isLoading && (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
              <div className="flex flex-col items-center justify-center gap-3 p-20">
                <Loader2
                  size={30}
                  className="animate-spin text-[var(--color-primary)]"
                />
                <p className="text-sm font-medium text-[var(--color-text-muted)]">
                  Loading usage records…
                </p>
              </div>
            </div>
          )}

          {/* ── Empty State ──────────────────────────────────────────────── */}
          {!isLoading && hasSearched && filtered.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-16 text-center shadow-[var(--shadow-sm)]">
              <ClipboardList
                size={36}
                className="text-[var(--color-text-muted)]"
              />
              <p className="text-base font-bold text-[var(--color-text-primary)]">
                No usage records found
              </p>
              <p className="max-w-sm text-sm text-[var(--color-text-muted)]">
                No records match the selected filters. Try adjusting the date
                range or search term.
              </p>
            </div>
          )}

          {/* ── Table ───────────────────────────────────────────────────── */}
          {!isLoading && filtered.length > 0 && (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
              {/* table header strip */}
              <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-3">
                <div className="flex items-center gap-2">
                  <ClipboardList
                    size={15}
                    className="text-[var(--color-primary)]"
                  />
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">
                    Usage Records
                  </span>
                  <span className="rounded-full bg-[var(--color-primary-tint)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-primary)]">
                    {filtered.length}
                  </span>
                </div>
                <span className="hidden text-xs text-[var(--color-text-muted)] sm:block">
                  {formatDate(startDate)} — {formatDate(endDate)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                      <SortHeader
                        label="Chemical"
                        field="chemicalName"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Code"
                        field="chemicalCode"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Bin Card Number"
                        field="batchNumber"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Reg.No"
                        field="stuRegisterNum"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Qty Used"
                        field="quantityUsed"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]"
                      >
                        Purpose
                      </th>
                      <SortHeader
                        label="Status"
                        field="returnedStatus"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Released"
                        field="dateReleased"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Returned"
                        field="dateReturned"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((record, idx) => (
                      <tr
                        key={record.id || idx}
                        className={`border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-primary-tint)]/40 last:border-b-0 ${
                          idx % 2 === 0
                            ? ""
                            : "bg-[var(--color-surface-muted)]/40"
                        }`}
                      >
                        {/* Chemical Name */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                              <FlaskConical size={13} />
                            </div>
                            <span className="max-w-[140px] truncate font-semibold text-[var(--color-text-primary)]">
                              {record.chemicalName || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Chemical Code */}
                        <td className="px-3 py-3">
                          <span className="rounded-md bg-[var(--color-primary-tint)] px-2 py-1 text-[11px] font-bold text-[var(--color-primary)]">
                            {record.chemicalCode || "—"}
                          </span>
                        </td>

                        {/* Bin Card Number */}
                        <td className="px-3 py-3">
                          <span className="rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-[11px] font-bold text-[var(--color-text-secondary)]">
                            {record.batchNumber || "—"}
                          </span>
                        </td>

                        {/* Reg. No */}
                        <td className="px-3 py-3">
                          <span className="rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-[11px] font-bold text-[var(--color-text-secondary)]">
                            {record.stuRegisterNum || "—"}
                          </span>
                        </td>

                        {/* Quantity Used */}
                        <td className="px-3 py-3">
                          <span className="font-bold text-[var(--color-text-primary)]">
                            {record.quantityUsed != null
                              ? `${Number(record.quantityUsed).toFixed(2)}${record.baseUnit || ""}`
                              : "—"}
                          </span>
                        </td>

                        {/* Purpose */}
                        <td className="px-3 py-3">
                          <span
                            className="block max-w-[160px] truncate text-xs text-[var(--color-text-secondary)]"
                            title={record.purpose}
                          >
                            {record.purpose || "—"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3">
                          <StatusBadge status={record.returnedStatus} />
                        </td>

                        {/* Date Released */}
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                            <Calendar
                              size={11}
                              className="shrink-0 text-[var(--color-text-muted)]"
                            />
                            {formatDateTime(record.dateReleased)}
                          </span>
                        </td>

                        {/* Date Returned */}
                        <td className="px-3 py-3">
                          {record.dateReturned ? (
                            <span className="flex items-center gap-1 text-xs text-[var(--color-success)]">
                              <CheckCircle2 size={11} className="shrink-0" />
                              {formatDateTime(record.dateReturned)}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--color-text-muted)]">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UsageReport;
