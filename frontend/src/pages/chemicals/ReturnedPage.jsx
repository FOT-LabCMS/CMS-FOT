import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Beaker,
  Boxes,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  History,
  Info,
  Loader2,
  PackageCheck,
  Search,
  User,
  X,
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

const daysSince = (value) => {
  if (!value) return null;
  // Parse as local date to avoid UTC offset shifting the date
  const parts = String(value).slice(0, 10).split("-");
  if (parts.length !== 3) return null;
  const released = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2]),
  );
  if (Number.isNaN(released.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  released.setHours(0, 0, 0, 0);
  return Math.floor(
    (today.getTime() - released.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const OverdueBadge = ({ dateReleased }) => {
  const days = daysSince(dateReleased);
  if (days === null) return null;

  const isOverdue = days > 14;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        isOverdue
          ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
          : "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
      }`}
    >
      <Clock size={13} />
      {days === 0
        ? "Released today"
        : `${days} day${days === 1 ? "" : "s"} out`}
    </span>
  );
};

const ReturnModal = ({ record, onClose, onSuccess }) => {
  const [usageQty, setUsageQty] = useState("");
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [remark, setRemark] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputUnit, setInputUnit] = useState("native");

  const chemicalInfo = record.chemical || {};
  const densityValue = Number(chemicalInfo.densityValue) || null;
  const densityUnit = chemicalInfo.densityUnit || null;
  const stockDimension = chemicalInfo.stockDimension || null;
  const physicalState = chemicalInfo.physicalState || null;
  const baseUnit =
    chemicalInfo.baseUnit || record.unit || record.baseUnit || "";

  const canUseMassInput =
    physicalState === "LIQUID" && densityValue && densityValue > 0;

  const computedVolume = useMemo(() => {
    const qty = Number(usageQty);
    if (!usageQty || isNaN(qty) || qty < 0) return null;
    if (inputUnit === "g" && canUseMassInput) {
      return qty / densityValue;
    }
    return qty;
  }, [usageQty, inputUnit, canUseMassInput, densityValue]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const qty = Number(usageQty);
    if (usageQty === "" || qty < 0 || isNaN(qty)) {
      setError("Enter a valid quantity used.");
      return;
    }
    if (!returnDate) {
      setError("Return date is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.put(`/dispose/updateqty/${record.id}`, {
        usageQty: qty,
        returnDate,
        inputUnit: inputUnit === "g" ? "g" : undefined,
        remark: remark.trim() || undefined,
      });
      onSuccess(record.id);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to update this record. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-[var(--color-primary-dark)]/60 backdrop-blur-sm"
        onClick={() => !isSubmitting && onClose()}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
        {/* Header */}
        <div className="relative bg-[var(--color-primary-dark)] p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[var(--color-primary-light)] opacity-30" />
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[var(--color-text-inverse)] color-transition hover:bg-white/20"
          >
            <X size={16} />
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)]">
              <PackageCheck size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-light)]">
                Mark as returned
              </p>
              <h3 className="truncate text-lg font-bold text-[var(--color-text-inverse)]">
                {record.chemicalName || record.chemicalCode}
              </h3>
              <p className="text-xs text-[var(--color-text-inverse)]/70">
                Batch {record.batchNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6">
          {/* User info bar */}
          <div className="mb-5 flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] px-4 py-3 text-xs">
            <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
              <User size={13} />
              {record.userName}
              <span className="text-[var(--color-text-muted)]">
                ({record.stuRegisterNum})
              </span>
            </span>
            {baseUnit && (
              <span className="font-semibold text-[var(--color-text-primary)]">
                Unit: {baseUnit}
              </span>
            )}
          </div>

          <div className="space-y-5">
            {/* Quantity Used */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="usageQty"
                  className="text-sm font-semibold text-[var(--color-text-primary)]"
                >
                  Quantity used{" "}
                  <span className="text-[var(--color-danger)]">*</span>
                </label>

                {/* Mass/Volume toggle — only shown for LIQUID with density */}
                {canUseMassInput && (
                  <div className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setInputUnit("native")}
                      className={`rounded-full px-2.5 py-1 transition-colors ${
                        inputUnit === "native"
                          ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] shadow-sm"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {baseUnit || "Vol"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputUnit("g")}
                      className={`rounded-full px-2.5 py-1 transition-colors ${
                        inputUnit === "g"
                          ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] shadow-sm"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      g
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <Beaker
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
                <input
                  id="usageQty"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={usageQty}
                  onChange={(e) => setUsageQty(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-14 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-text-muted)]">
                  {inputUnit === "g" ? "g" : baseUnit}
                </span>
              </div>

              {/* Live conversion preview */}
              {inputUnit === "g" &&
                canUseMassInput &&
                computedVolume !== null && (
                  <div className="mt-2 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-tint)] px-3 py-2 text-xs">
                    <Info
                      size={13}
                      className="mt-0.5 shrink-0 text-[var(--color-primary)]"
                    />
                    <div className="text-[var(--color-text-secondary)]">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {computedVolume.toFixed(4)} {baseUnit}
                      </span>{" "}
                      will be deducted from stock
                      <span className="block text-[10px] text-[var(--color-text-muted)]">
                        {usageQty} g ÷ {densityValue} (
                        {densityUnit || "density"}) ={" "}
                        {computedVolume.toFixed(4)} {baseUnit}
                      </span>
                    </div>
                  </div>
                )}

              {inputUnit === "native" &&
                usageQty !== "" &&
                computedVolume !== null && (
                  <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                    {computedVolume.toFixed(4)} {baseUnit} will be deducted from
                    stock.
                  </p>
                )}
            </div>

            {/* Return Date */}
            <div>
              <label
                htmlFor="returnDate"
                className="mb-1.5 block text-sm font-semibold text-[var(--color-text-primary)]"
              >
                Return date
                <span className="text-[var(--color-danger)]">*</span>
              </label>
              <div className="relative">
                <Calendar
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
                <input
                  id="returnDate"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-4 text-sm font-medium text-[var(--color-text-primary)] color-transition focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Remark */}
            <div>
              <label
                htmlFor="remark"
                className="mb-1.5 block text-sm font-semibold text-[var(--color-text-primary)]"
              >
                Remark
              </label>
              <textarea
                id="remark"
                rows={2}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Optional — condition of bottle, notes, etc."
                className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm leading-6 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[var(--color-danger)]">
              <AlertTriangle size={14} />
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] color-transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <ClipboardCheck size={16} />
                  Mark as returned
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ReturnedPage = () => {
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeRecord, setActiveRecord] = useState(null);
  const [justReturnedId, setJustReturnedId] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setLoadError("");
      const response = await api.get("/dispose/view/notreturned");
      const data = response.data;
      setRecords(data.notReturnedChemicals || []);
    } catch (error) {
      setLoadError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Unable to load pending returns. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return records;
    return records.filter((r) =>
      `${r.canonicalName || ""} ${r.chemicalCode || ""} ${r.batchCode || ""} ${r.userName || ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [records, searchTerm]);

  const handleReturnSuccess = (id) => {
    setJustReturnedId(id);
    setActiveRecord(null);
    setTimeout(() => {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setJustReturnedId(null);
    }, 900);
  };
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
                <div className="mb-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
                  >
                    <ArrowLeft size={17} />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/reports/usage")}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-accent-light)]"
                  >
                    <History size={15} />
                    Return History
                  </button>
                </div>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                        <Boxes size={14} />
                        Return Records
                      </span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                      Pending Returns
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-inverse)] opacity-80 sm:text-base">
                      Chemical bottles still out with students. Enter the
                      quantity used and return date to close each one out.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)]">
                      <Info size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-light)]">
                        Awaiting return
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--color-text-inverse)]">
                        {isLoading ? "—" : records.length} bottle
                        {records.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Search */}
          <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by chemical, batch, or student name..."
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)]"
              />
            </div>
          </section>

          {loadError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-surface)] p-4"
            >
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-[var(--color-danger)]"
              />
              <p className="text-sm font-semibold text-[var(--color-danger)]">
                {loadError}
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-16 shadow-[var(--shadow-sm)]">
              <Loader2
                size={28}
                className="animate-spin text-[var(--color-primary)]"
              />
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                Loading pending returns...
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-16 text-center">
              <CheckCircle2 size={32} className="text-[var(--color-success)]" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {records.length === 0 ? "All caught up!" : "No matches found"}
              </p>
              <p className="max-w-sm text-xs text-[var(--color-text-muted)]">
                {records.length === 0
                  ? "There are no chemical bottles currently awaiting return."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <section className="space-y-3">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className={`overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--color-surface)] shadow-[var(--shadow-sm)] color-transition ${
                    justReturnedId === record.id
                      ? "scale-[0.99] border-[var(--color-success)] opacity-50"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex items-start gap-3 sm:items-center">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                        <Beaker size={20} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                            {record.canonicalName || record.chemicalCode}
                          </h3>
                          <span className="inline-flex rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-text-secondary)]">
                            {record.batchCode}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                          <span className="flex items-center gap-1.5">
                            <User
                              size={13}
                              className="text-[var(--color-text-muted)]"
                            />
                            {record.userName} ({record.stuRegisterNum})
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar
                              size={13}
                              className="text-[var(--color-text-muted)]"
                            />
                            Released {formatDate(record.dateReleased)}
                          </span>
                        </div>

                        {record.purpose && (
                          <p className="mt-1.5 line-clamp-1 text-xs text-[var(--color-text-muted)]">
                            {record.purpose}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:shrink-0">
                      <OverdueBadge dateReleased={record.dateReleased} />
                      <button
                        type="button"
                        onClick={() => setActiveRecord(record)}
                        className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-primary-light)]"
                      >
                        <PackageCheck size={16} />
                        Return
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </main>

      {activeRecord && (
        <ReturnModal
          record={activeRecord}
          onClose={() => setActiveRecord(null)}
          onSuccess={handleReturnSuccess}
        />
      )}
    </div>
  );
};

export default ReturnedPage;
