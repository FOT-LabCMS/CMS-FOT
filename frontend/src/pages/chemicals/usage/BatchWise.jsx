import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Beaker,
  Boxes,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Info,
  Loader2,
  RefreshCw,
  Search,
  TrendingDown,
  Truck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axiosInstance";

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  loading,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((o) =>
    `${o.label} ${o.sublabel || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-left text-sm font-medium color-transition focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Boxes size={18} className="shrink-0 text-[var(--color-text-muted)]" />
        <span className="min-w-0 flex-1">
          {loading ? (
            "Loading batches..."
          ) : selectedOption ? (
            <span className="flex flex-col">
              <span className="truncate font-bold text-[var(--color-primary)]">
                {selectedOption.label}
              </span>
              <span className="truncate text-xs text-[var(--color-text-muted)]">
                {selectedOption.sublabel}
              </span>
            </span>
          ) : (
            <span className="text-[var(--color-text-muted)]">
              {placeholder}
            </span>
          )}
        </span>
        {loading ? (
          <Loader2
            size={16}
            className="shrink-0 animate-spin text-[var(--color-text-muted)]"
          />
        ) : (
          <ChevronDown
            size={16}
            className="shrink-0 text-[var(--color-text-muted)]"
          />
        )}
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
          <div className="relative border-b border-[var(--color-border)] p-2">
            <Search
              size={15}
              className="absolute left-4.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chemical or Bin Card Number..."
              className="w-full rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] py-2 pl-8 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                No batches found.
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm color-transition hover:bg-[var(--color-primary-tint)] ${
                    option.value === value
                      ? "bg-[var(--color-primary-tint)]"
                      : ""
                  }`}
                >
                  <span className={`truncate font-bold ${
                    option.value === value
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-text-primary)]"
                  }`}>
                    {option.label}
                  </span>
                  <span className="truncate text-xs text-[var(--color-text-muted)]">
                    {option.sublabel}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
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

/** Round to max 3 decimal places, strip trailing zeros */
const fmt3dp = (val) => {
  const n = parseFloat(val);
  if (isNaN(n)) return val ?? "—";
  return parseFloat(n.toFixed(3)).toString();
};
const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return null;

  const daysLeft = Math.floor(
    (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (daysLeft < 0) {
    return { label: "Expired", tone: "danger" };
  }
  if (daysLeft <= 30) {
    return { label: `Expires in ${daysLeft}d`, tone: "warning" };
  }
  return { label: "Active", tone: "success" };
};
const StatCard = ({ icon: Icon, label, value, tone = "default" }) => {
  const toneClasses = {
    default: "bg-[var(--color-primary-tint)] text-[var(--color-primary)]",
    danger: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
    warning: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
    success: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] ${toneClasses[tone]}`}
      >
        <Icon size={19} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
};
const batchwise = () => {
  const navigate = useNavigate();

  const [batchOptions, setBatchOptions] = useState([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [selectedBatch, setSelectedBatch] = useState("");
  const [usageData, setUsageData] = useState(null);
  const [isUsageLoading, setIsUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState("");

  const fetchBatchList = async () => {
    try {
      setIsListLoading(true);
      setListError("");
      const response = await api.get("/usage/batch-details");
      const batches = response.data?.batchDetails || [];

      setBatchOptions(
        batches.map((b) => ({
          value: b.batchNumber,
          label: b.batchNumber,
          sublabel: b.chemical?.canonicalName || "Unnamed chemical",
        })),
      );
    } catch (error) {
      setListError(
        error.response?.data?.message ||
          "Unable to load the batch list. Please refresh.",
      );
    } finally {
      setIsListLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchList();
  }, []);

  const handleSelectBatch = async (batchNumber) => {
    setSelectedBatch(batchNumber);
    setUsageData(null);
    setUsageError("");

    try {
      setIsUsageLoading(true);
      const response = await api.post("/usage/batch/calculate-usage", {
        batchNumber,
      });
      setUsageData(response.data);
    } catch (error) {
      setUsageError(
        error.response?.data?.message ||
          "Unable to calculate usage for this batch. Please try again.",
      );
    } finally {
      setIsUsageLoading(false);
    }
  };

  const usagePercent =
    usageData && usageData.quantityReceived > 0
      ? Math.min(
          (usageData.quantityUsed / usageData.quantityReceived) * 100,
          100,
        )
      : 0;

  const expiryStatus = usageData ? getExpiryStatus(usageData.expiryDate) : null;
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">
          {/* Page header */}
          <header className="mb-6 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
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
                        <Boxes size={14} />
                        Usage Analytics
                      </span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                      Batch Usage Lookup
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-inverse)] opacity-80 sm:text-base">
                      Select a batch to see exactly how much has been used
                      against what was received, plus its expiry and supplier
                      details.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)]">
                      <Info size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-light)]">
                        Available batches
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--color-text-inverse)]">
                        {isListLoading ? "—" : batchOptions.length} total
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {listError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-surface)] p-4"
            >
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-[var(--color-danger)]"
              />
              <p className="text-sm font-semibold text-[var(--color-danger)]">
                {listError}
              </p>
              <button
                type="button"
                onClick={fetchBatchList}
                className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-danger)] underline"
              >
                <RefreshCw size={13} />
                Retry
              </button>
            </div>
          )}

          {/* Batch selector */}
          <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
              Select a batch
            </label>
            <p className="mb-3 text-xs leading-5 text-[var(--color-text-muted)]">
              Search by chemical name or bin card number.
            </p>
            <SearchableSelect
              options={batchOptions}
              value={selectedBatch}
              onChange={handleSelectBatch}
              placeholder="Choose a chemical / batch"
              loading={isListLoading}
              disabled={isListLoading}
            />
          </section>

          {/* Usage error */}
          {usageError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-surface)] p-4"
            >
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-[var(--color-danger)]"
              />
              <p className="text-sm font-semibold text-[var(--color-danger)]">
                {usageError}
              </p>
            </div>
          )}

          {/* Loading */}
          {isUsageLoading && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-16 shadow-[var(--shadow-sm)]">
              <Loader2
                size={28}
                className="animate-spin text-[var(--color-primary)]"
              />
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                Calculating usage...
              </p>
            </div>
          )}

          {/* Empty state */}
          {!isUsageLoading && !usageData && !usageError && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-16 text-center">
              <Beaker size={32} className="text-[var(--color-text-muted)]" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                No batch selected yet
              </p>
              <p className="max-w-sm text-xs text-[var(--color-text-muted)]">
                Pick a chemical and batch above to see its usage breakdown.
              </p>
            </div>
          )}

          {/* Results */}
          {!isUsageLoading && usageData && (
            <div className="space-y-6">
              {/* Summary banner */}
              <section className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
                <div className="relative p-5 sm:p-7">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--color-primary-light)] opacity-20" />
                  <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-extrabold text-[var(--color-accent)] sm:text-3xl">
                        {usageData.batchNumber}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-[var(--color-text-inverse)] opacity-80">
                        {usageData.chemicalName}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-inverse)] opacity-50">
                        {usageData.chemicalCode}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {expiryStatus && (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                            expiryStatus.tone === "danger"
                              ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                              : expiryStatus.tone === "warning"
                                ? "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
                                : "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                          }`}
                        >
                          <Clock size={13} />
                          {expiryStatus.label}
                        </span>
                      )}
                      {usageData.supplier && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-[var(--color-text-inverse)]">
                          <Truck size={13} />
                          {usageData.supplier}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Usage progress bar */}
                  <div className="relative mt-6">
                    <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[var(--color-text-inverse)]/80">
                      <span>{usagePercent.toFixed(1)}% used</span>
                      <span>
                        {fmt3dp(usageData.currentQuantity)}{usageData.unit ? ` ${usageData.unit}` : ""} remaining of{" "}
                        {fmt3dp(usageData.quantityReceived)}{usageData.unit ? ` ${usageData.unit}` : ""}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full color-transition ${
                          usagePercent >= 90
                            ? "bg-[var(--color-danger)]"
                            : usagePercent >= 60
                              ? "bg-[var(--color-warning)]"
                              : "bg-[var(--color-accent)]"
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Stat cards */}
              <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  icon={Boxes}
                  label="Start quantity"
                  value={`${fmt3dp(usageData.quantityReceived)}${usageData.unit ? ` ${usageData.unit}` : ""}`}
                />
                <StatCard
                  icon={Beaker}
                  label="Current quantity"
                  value={`${fmt3dp(usageData.currentQuantity)}${usageData.unit ? ` ${usageData.unit}` : ""}`}
                  tone="success"
                />
                <StatCard
                  icon={TrendingDown}
                  label="Quantity used"
                  value={`${fmt3dp(usageData.quantityUsed)}${usageData.unit ? ` ${usageData.unit}` : ""}`}
                  tone="warning"
                />
                <StatCard
                  icon={Calendar}
                  label="Expiry date"
                  value={formatDate(usageData.expiryDate)}
                  tone={expiryStatus?.tone === "danger" ? "danger" : "default"}
                />
              </section>

              {/* Details card */}
              <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                    <CheckCircle2 size={21} strokeWidth={2.1} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      Batch details
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                      Full reference for this batch.
                    </p>
                  </div>
                </div>

                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                    <dt className="text-sm text-[var(--color-text-secondary)]">
                      Chemical code
                    </dt>
                    <dd className="text-sm font-bold text-[var(--color-text-primary)]">
                      {usageData.chemicalCode}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                    <dt className="text-sm text-[var(--color-text-secondary)]">
                      Bin Card Number
                    </dt>
                    <dd className="text-sm font-bold text-[var(--color-text-primary)]">
                      {usageData.batchNumber}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                    <dt className="text-sm text-[var(--color-text-secondary)]">
                      Supplier
                    </dt>
                    <dd className="text-sm font-bold text-[var(--color-text-primary)]">
                      {usageData.supplier || "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3 sm:border-b-0">
                    <dt className="text-sm text-[var(--color-text-secondary)]">
                      Expiry date
                    </dt>
                    <dd className="text-sm font-bold text-[var(--color-text-primary)]">
                      {formatDate(usageData.expiryDate)}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default batchwise;
