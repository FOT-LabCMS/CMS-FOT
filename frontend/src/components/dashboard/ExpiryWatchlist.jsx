import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axiosInstance";

const PANEL =
  "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]";

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "No expiry";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const statusMeta = {
  EXPIRED: {
    label: "Expired",
    className: "border-[var(--color-danger)] bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  },
  EXPIRING_SOON: {
    label: "Expiring Soon",
    className: "border-[var(--color-warning)] bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  },
  UPCOMING: {
    label: "Upcoming",
    className: "border-[var(--color-primary)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]",
  },
};

const SectionHeader = ({ icon: Icon, title, text, to, action }) => (
  <header className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-extrabold text-[var(--color-text-primary)] sm:text-lg">
          {title}
        </h2>
        {text && (
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)] sm:text-sm">
            {text}
          </p>
        )}
      </div>
    </div>

    {to && action && (
      <Link
        to={to}
        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-light)]"
      >
        {action}
        <ArrowRight size={15} />
      </Link>
    )}
  </header>
);

const EmptyState = ({ children }) => (
  <div className="flex min-h-44 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-4 text-center text-sm font-semibold text-[var(--color-text-secondary)]">
    {children}
  </div>
);

const ExpiryWatchlist = () => {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["dashboardExpiryWatchlist"],
    queryFn: async () => {
      const response = await api.get("/usage/expiry-watchlist");
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const rows = data?.watchlist || [];

  return (
    <article className={`${PANEL} overflow-hidden`}>
      <SectionHeader
        icon={CalendarClock}
        title="Expiry Watchlist"
        text="Nearest expiry batches that need attention."
        to="/stock/batches"
        action="Open batches"
      />

      <div className="p-4 sm:p-5">
        {isLoading || isFetching ? (
          <div className="flex min-h-56 items-center justify-center">
            <Loader2 className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : isError ? (
          <EmptyState>
            {error?.response?.data?.message || "Unable to load expiry watchlist."}
          </EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState>No stock batches with expiry dates were found.</EmptyState>
        ) : (
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {rows.map((row) => {
              const meta = statusMeta[row.status] || statusMeta.UPCOMING;
              const daysLabel =
                row.daysRemaining === null
                  ? "No expiry"
                  : row.daysRemaining < 0
                    ? `${Math.abs(row.daysRemaining)} days expired`
                    : `${row.daysRemaining} days remaining`;

              return (
                <div
                  key={row.id}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-[var(--color-text-primary)]">
                        {row.chemicalName}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                        {row.chemicalCode} • Batch no. {row.batchNumber}
                      </p>
                    </div>

                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}>
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs font-semibold text-[var(--color-text-secondary)] sm:grid-cols-2">
                    <span>{formatDate(row.expiryDate)} • {daysLabel}</span>
                    <span className="sm:text-right">
                      {formatNumber(row.currentQuantity)} {row.unit} • {row.location}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
};

export default ExpiryWatchlist;
