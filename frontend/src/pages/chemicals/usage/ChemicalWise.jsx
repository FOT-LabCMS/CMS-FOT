import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Beaker,
  Boxes,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  FlaskConical,
  Info,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
  Sigma,
  Truck,
  TrendingDown,
  TrendingUp,
  X,
  BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axiosInstance";

/* ─────────────────────────── helpers ─────────────────────────── */

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

const fmt3dp = (val) => {
  const n = parseFloat(val);
  if (isNaN(n)) return val ?? "—";
  return parseFloat(n.toFixed(3)).toString();
};

const fmtQty = (val, unit) => {
  const s = fmt3dp(val);
  return unit ? `${s} ${unit}` : s;
};

const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return { label: "No expiry", tone: "default", days: null };
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime()))
    return { label: "Unknown", tone: "default", days: null };
  const daysLeft = Math.floor(
    (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (daysLeft < 0) return { label: "Expired", tone: "danger", days: daysLeft };
  if (daysLeft <= 30)
    return { label: `Expires in ${daysLeft}d`, tone: "warning", days: daysLeft };
  return { label: "Active", tone: "success", days: daysLeft };
};

const usagePct = (received, current) => {
  if (!received || received <= 0) return 0;
  return Math.min(((received - current) / received) * 100, 100);
};

/* ─────────────────────────── sub-components ─────────────────────────── */

const ChemicalDropdown = ({ options, value, onChange, loading }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const fn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const filtered = options.filter((o) =>
    `${o.label} ${o.sublabel || ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-left color-transition hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
          <FlaskConical size={18} />
        </div>
        <span className="min-w-0 flex-1">
          {loading ? (
            <span className="text-sm text-[var(--color-text-muted)]">
              Loading chemicals…
            </span>
          ) : selected ? (
            <span className="flex flex-col">
              <span className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                {selected.label}
              </span>
              <span className="truncate text-xs text-[var(--color-text-muted)]">
                {selected.sublabel}
              </span>
            </span>
          ) : (
            <span className="text-sm text-[var(--color-text-muted)]">
              Search and select a chemical…
            </span>
          )}
        </span>
        {loading ? (
          <Loader2 size={16} className="shrink-0 animate-spin text-[var(--color-text-muted)]" />
        ) : (
          <ChevronDown
            size={16}
            className={`shrink-0 text-[var(--color-text-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && !loading && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
          <div className="relative border-b border-[var(--color-border)] p-2">
            <Search
              size={14}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or code…"
              className="w-full rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] py-2 pl-8 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                No chemicals found.
              </p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm color-transition hover:bg-[var(--color-primary-tint)] ${
                    opt.value === value ? "bg-[var(--color-primary-tint)]" : ""
                  }`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                    <FlaskConical size={13} />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate font-semibold ${
                        opt.value === value
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-text-primary)]"
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="block truncate text-xs text-[var(--color-text-muted)]">
                      {opt.sublabel}
                    </span>
                  </span>
                  {opt.value === value && (
                    <ChevronRight size={14} className="shrink-0 text-[var(--color-primary)]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* Summary pills row */
const SummaryPill = ({ icon: Icon, label, value, tone }) => {
  const tones = {
    default: "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]",
    success: "bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]",
    danger: "bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30 text-[var(--color-danger)]",
    warning: "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30 text-[var(--color-warning)]",
    primary: "bg-[var(--color-primary-tint)] border-[var(--color-primary)]/30 text-[var(--color-primary)]",
  };
  return (
    <div className={`flex items-center gap-2.5 rounded-[var(--radius-md)] border px-4 py-3 ${tones[tone ?? "default"]}`}>
      <Icon size={16} className="shrink-0" />
      <span>
        <span className="block text-xs font-medium opacity-75">{label}</span>
        <span className="block text-sm font-extrabold">{value}</span>
      </span>
    </div>
  );
};

/* Individual batch row card */
const BatchCard = ({ batch, unit, isSelected, onClick }) => {
  const status = getExpiryStatus(batch.expiryDate);
  const pct = usagePct(batch.quantityReceived, batch.currentQuantity);

  const statusStyles = {
    danger: "text-[var(--color-danger)] bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30",
    warning: "text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30",
    success: "text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/30",
    default: "text-[var(--color-text-muted)] bg-[var(--color-surface-muted)] border-[var(--color-border)]",
  };

  const barColors = {
    danger: "bg-[var(--color-danger)]",
    warning: "bg-[var(--color-warning)]",
    success: "bg-[var(--color-success)]",
    default: "bg-[var(--color-primary)]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-[var(--radius-lg)] border p-4 text-left transition-all duration-200 hover:shadow-[var(--shadow-md)] focus:outline-none sm:p-5 ${
        isSelected
          ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)] shadow-[var(--shadow-md)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50"
      }`}
    >
      {/* Top row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`truncate text-base font-extrabold ${isSelected ? "text-[var(--color-primary)]" : "text-[var(--color-text-primary)]"}`}>
            {batch.batchNumber}
          </p>
          {batch.supplier && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <Truck size={11} />
              {batch.supplier}
            </p>
          )}
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[status.tone]}`}>
          {status.tone === "danger" ? <ShieldX size={11} /> : status.tone === "warning" ? <Clock size={11} /> : <ShieldCheck size={11} />}
          {status.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2.5">
        <div className="mb-1 flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>{pct.toFixed(1)}% used</span>
          <span>{fmtQty(batch.currentQuantity, unit)} left</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColors[pct >= 90 ? "danger" : pct >= 60 ? "warning" : "success"]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Received</p>
          <p className="text-xs font-bold text-[var(--color-text-primary)]">
            {fmtQty(batch.quantityReceived, unit)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Used</p>
          <p className="text-xs font-bold text-[var(--color-warning)]">
            {fmtQty(batch.quantityUsed, unit)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Expires</p>
          <p className="text-xs font-bold text-[var(--color-text-secondary)]">
            {formatDate(batch.expiryDate)}
          </p>
        </div>
      </div>

      {/* Selected arrow */}
      {isSelected && (
        <div className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-[var(--color-primary)]">
          <span>Details below</span>
          <ChevronRight size={13} />
        </div>
      )}
    </button>
  );
};

/* Detail usage panel for selected batch */
const UsageDetailPanel = ({ batch, chemicalName, chemicalCode, unit, onClose }) => {
  const status = getExpiryStatus(batch.expiryDate);
  const pct = usagePct(batch.quantityReceived, batch.currentQuantity);

  const barColor =
    pct >= 90
      ? "bg-[var(--color-danger)]"
      : pct >= 60
        ? "bg-[var(--color-warning)]"
        : "bg-[var(--color-success)]";

  return (
    <div className="animate-[fadeInUp_0.25s_ease-out] rounded-[var(--radius-lg)] border border-[var(--color-primary)]/40 bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
            <BarChart3 size={19} />
          </div>
          <div>
            <p className="text-base font-extrabold text-[var(--color-primary)]">
              {batch.batchNumber}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Usage breakdown
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5 sm:p-6">
        {/* Usage progress bar */}
        <div className="mb-6 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-[var(--color-text-primary)]">
              Stock consumed
            </span>
            <span className="font-extrabold text-[var(--color-text-primary)]">
              {pct.toFixed(1)}%
            </span>
          </div>
          <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
            <span>{fmtQty(batch.currentQuantity, unit)} remaining</span>
            <span>{fmtQty(batch.quantityReceived, unit)} total</span>
          </div>
        </div>

        {/* Stat grid */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-center">
            <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
              <Boxes size={15} />
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">Start qty</p>
            <p className="mt-0.5 text-sm font-extrabold text-[var(--color-text-primary)]">
              {fmtQty(batch.quantityReceived, unit)}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-3 text-center">
            <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)]">
              <Beaker size={15} />
            </div>
            <p className="text-xs text-[var(--color-success)]/80">Current qty</p>
            <p className="mt-0.5 text-sm font-extrabold text-[var(--color-success)]">
              {fmtQty(batch.currentQuantity, unit)}
            </p>
          </div>
          <div className="col-span-2 rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-3 text-center sm:col-span-1">
            <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-warning)]/15 text-[var(--color-warning)]">
              <TrendingDown size={15} />
            </div>
            <p className="text-xs text-[var(--color-warning)]/80">Qty used</p>
            <p className="mt-0.5 text-sm font-extrabold text-[var(--color-warning)]">
              {fmtQty(batch.quantityUsed, unit)}
            </p>
          </div>
        </div>

        {/* Details list */}
        <dl className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {[
            { label: "Chemical", value: chemicalName, icon: FlaskConical },
            { label: "Chemical code", value: chemicalCode, icon: Info },
            { label: "Bin Card Number", value: batch.batchNumber, icon: Layers },
            {
              label: "Supplier",
              value: batch.supplier || "—",
              icon: Truck,
            },
            {
              label: "Expiry date",
              value: formatDate(batch.expiryDate),
              icon: Calendar,
            },
            {
              label: "Status",
              value: (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                    status.tone === "danger"
                      ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                      : status.tone === "warning"
                        ? "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
                        : "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                  }`}
                >
                  {status.tone === "danger" ? (
                    <ShieldX size={11} />
                  ) : (
                    <ShieldCheck size={11} />
                  )}
                  {status.label}
                </span>
              ),
              icon: Activity,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <Icon size={14} className="shrink-0 text-[var(--color-text-muted)]" />
                {label}
              </dt>
              <dd className="text-right text-sm font-semibold text-[var(--color-text-primary)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

/* ─────────────────────────── main page ─────────────────────────── */

const chemicalwise = () => {
  const navigate = useNavigate();

  const [chemOptions, setChemOptions] = useState([]);
  const [isChemLoading, setIsChemLoading] = useState(true);
  const [chemError, setChemError] = useState("");

  const [selectedChem, setSelectedChem] = useState("");
  const [chemData, setChemData] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  const [selectedBatch, setSelectedBatch] = useState(null);

  const [batchSearch, setBatchSearch] = useState("");
  const [sortKey, setSortKey] = useState("batchNumber");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchChemicals = async () => {
    try {
      setIsChemLoading(true);
      setChemError("");
      const res = await api.get("/chemicals");
      const chems = res.data?.chemicals || res.data || [];
      setChemOptions(
        chems.map((c) => ({
          value: c.chemicalCode,
          label: c.canonicalName,
          sublabel: c.chemicalCode,
          unit: c.baseUnit ?? "",
        })),
      );
    } catch {
      setChemError("Unable to load chemical list. Please refresh.");
    } finally {
      setIsChemLoading(false);
    }
  };

  useEffect(() => {
    fetchChemicals();
  }, []);

  const fetchChemicalUsage = async (chemCode) => {
    setChemData(null);
    setSelectedBatch(null);
    setDataError("");
    setBatchSearch("");
    try {
      setIsDataLoading(true);
      const res = await api.post("/usage/chemical/calculate-usage", {
        chemicalCode: chemCode,
      });
      const matched = chemOptions.find((o) => o.value === chemCode);
      setChemData({
        ...res.data,
        unit: matched?.unit ?? "",
      });
    } catch (err) {
      setDataError(
        err.response?.data?.message ||
          "Unable to load batches for this chemical.",
      );
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleChemChange = (code) => {
    setSelectedChem(code);
    fetchChemicalUsage(code);
  };

  const allBatches = chemData?.batches ?? [];

  const filteredBatches = allBatches
    .filter((b) => {
      const s = getExpiryStatus(b.expiryDate);
      if (filterStatus !== "all" && s.tone !== filterStatus) return false;
      if (
        batchSearch &&
        !`${b.batchNumber} ${b.supplier || ""}`
          .toLowerCase()
          .includes(batchSearch.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "pct")
        return (
          usagePct(b.quantityReceived, b.currentQuantity) -
          usagePct(a.quantityReceived, a.currentQuantity)
        );
      if (sortKey === "expiry") {
        const da = a.expiryDate ? new Date(a.expiryDate) : new Date(9e15);
        const db = b.expiryDate ? new Date(b.expiryDate) : new Date(9e15);
        return da - db;
      }
      return a.batchNumber.localeCompare(b.batchNumber);
    });

  const summaryStats = (() => {
    if (!allBatches.length) return null;
    const active = allBatches.filter((b) => getExpiryStatus(b.expiryDate).tone !== "danger").length;
    const expired = allBatches.length - active;
    const totalCurrent = allBatches.reduce((s, b) => s + Number(b.currentQuantity), 0);
    const totalUsed = allBatches.reduce((s, b) => s + Number(b.quantityUsed), 0);
    return { active, expired, totalCurrent, totalUsed };
  })();

  const unit = chemData?.unit ?? "";

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">

          {/* ── Page header ── */}
          <header className="mb-6 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              {/* Decorative blobs */}
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
                        <FlaskConical size={14} />
                        Usage Analytics
                      </span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                      Chemical-wise Usage
                    </h1>
                  </div>

                  <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)]">
                      <FlaskConical size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-light)]">
                        Chemicals available
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--color-text-inverse)]">
                        {isChemLoading ? "—" : chemOptions.length} total
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* ── Chemical selector card ── */}
          <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)]">
                <span className="text-xs font-extrabold">1</span>
              </div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">
                Select a chemical
              </p>
            </div>

            {chemError ? (
              <div className="mb-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/5 px-4 py-3 text-sm text-[var(--color-danger)]">
                <AlertTriangle size={16} />
                {chemError}
                <button
                  type="button"
                  onClick={fetchChemicals}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-bold underline"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            ) : null}

            <ChemicalDropdown
              options={chemOptions}
              value={selectedChem}
              onChange={handleChemChange}
              loading={isChemLoading}
            />
          </section>

          {/* ── Loading state ── */}
          {isDataLoading && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-20">
              <div className="relative">
                <FlaskConical size={32} className="text-[var(--color-success)]" />
                <Loader2
                  size={48}
                  className="absolute -inset-2 animate-spin text-[var(--color-success)]/40"
                />
              </div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                Loading batch data…
              </p>
            </div>
          )}

          {/* ── Error state ── */}
          {!isDataLoading && dataError && (
            <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-surface)] p-4">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
              <p className="text-sm font-semibold text-[var(--color-danger)]">{dataError}</p>
            </div>
          )}

          {/* ── Empty (no chemical selected) ── */}
          {!isDataLoading && !chemData && !dataError && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]">
                <FlaskConical size={30} />
              </div>
              <div>
                <p className="font-bold text-[var(--color-text-primary)]">
                  No chemical selected yet
                </p>
                <p className="mt-1 max-w-xs text-xs text-[var(--color-text-muted)]">
                  Use the dropdown above to pick a chemical and view all its batch usage details.
                </p>
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {!isDataLoading && chemData && (
            <div className="space-y-6">

              {/* Chemical identity banner */}
              <section className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-success)]/15 text-[var(--color-success)]">
                    <FlaskConical size={26} />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-[var(--color-text-primary)] sm:text-2xl">
                      {chemData.chemicalName}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--color-text-muted)]">
                      {chemData.chemicalCode}
                      {unit && (
                        <span className="ml-2 rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-xs text-[var(--color-success)]">
                          Unit: {unit}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Summary pills */}
                {summaryStats && (
                  <div className="flex flex-wrap gap-2">
                    <SummaryPill
                      icon={Package}
                      label="Total batches"
                      value={allBatches.length}
                      tone="primary"
                    />
                    <SummaryPill
                      icon={ShieldCheck}
                      label="Active"
                      value={summaryStats.active}
                      tone="success"
                    />
                    {summaryStats.expired > 0 && (
                      <SummaryPill
                        icon={ShieldX}
                        label="Expired"
                        value={summaryStats.expired}
                        tone="danger"
                      />
                    )}
                    <SummaryPill
                      icon={Beaker}
                      label="Total stock"
                      value={fmtQty(summaryStats.totalCurrent, unit)}
                      tone="default"
                    />
                    <SummaryPill
                      icon={TrendingDown}
                      label="Total used"
                      value={fmtQty(summaryStats.totalUsed, unit)}
                      tone="warning"
                    />
                  </div>
                )}
              </section>

              {/* Batch list section header */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)]">
                    <span className="text-xs font-extrabold">2</span>
                  </div>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">
                    Select a batch to view details
                  </p>
                  <span className="ml-auto rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
                    {filteredBatches.length} / {allBatches.length}
                  </span>
                </div>

                {/* Search + filter toolbar */}
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                    />
                    <input
                      type="text"
                      value={batchSearch}
                      onChange={(e) => setBatchSearch(e.target.value)}
                      placeholder="Search Bin card number or supplier…"
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
                    />
                    {batchSearch && (
                      <button
                        type="button"
                        onClick={() => setBatchSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Status filter */}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {[
                      { key: "all", label: "All" },
                      { key: "success", label: "Active" },
                      { key: "warning", label: "Expiring" },
                      { key: "danger", label: "Expired" },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFilterStatus(key)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          filterStatus === key
                            ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                            : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Sort */}
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-xs font-semibold text-[var(--color-text-primary)] focus:outline-none"
                  >
                    <option value="batchNumber">Sort: Bin Card #</option>
                    <option value="pct">Sort: Most used</option>
                    <option value="expiry">Sort: Expiry date</option>
                  </select>
                </div>

                {/* Batch cards grid */}
                {filteredBatches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-12 text-center">
                    <Search size={26} className="text-[var(--color-text-muted)]" />
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      No batches match your filters
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setBatchSearch("");
                        setFilterStatus("all");
                      }}
                      className="text-xs font-semibold text-[var(--color-primary)] underline"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredBatches.map((batch) => (
                      <BatchCard
                        key={batch.batchNumber}
                        batch={batch}
                        unit={unit}
                        isSelected={selectedBatch?.batchNumber === batch.batchNumber}
                        onClick={() =>
                          setSelectedBatch(
                            selectedBatch?.batchNumber === batch.batchNumber
                              ? null
                              : batch,
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* ── Detail panel (appears below when batch selected) ── */}
              {selectedBatch && (
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)]">
                      <span className="text-xs font-extrabold">3</span>
                    </div>
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">
                      Batch usage breakdown
                    </p>
                  </div>
                  <UsageDetailPanel
                    batch={selectedBatch}
                    chemicalName={chemData.chemicalName}
                    chemicalCode={chemData.chemicalCode}
                    unit={unit}
                    onClose={() => setSelectedBatch(null)}
                  />
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default chemicalwise;
