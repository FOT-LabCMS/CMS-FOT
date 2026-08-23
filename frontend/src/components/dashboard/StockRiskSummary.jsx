import React from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  PackageX,
  ShieldAlert,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axiosInstance";

const PANEL =
  "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]";

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

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

const riskItems = [
  {
    key: "expired",
    label: "Expired",
    icon: ShieldAlert,
    className: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
    barClass: "bg-[var(--color-danger)]",
  },
  {
    key: "expiringSoon",
    label: "Expiring Soon",
    icon: AlertTriangle,
    className: "bg-[var(--color-surface-muted)] text-[var(--color-accent-dark)]",
    barClass: "bg-[var(--color-accent)]",
  },
  {
    key: "lowStock",
    label: "Low Stock",
    icon: AlertTriangle,
    className: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
    barClass: "bg-[var(--color-warning)]",
  },
  {
    key: "outOfStock",
    label: "Out of Stock",
    icon: PackageX,
    className: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
    barClass: "bg-[var(--color-danger)]",
  },
];

const StockRiskSummary = () => {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["dashboardStockRiskSummary"],
    queryFn: async () => {
      const response = await api.get("/usage/stock-risk-summary");
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const stats = data?.stats || {};
  const total = Number(stats.total || 0);
  const atRisk =
    Number(stats.expired || 0) +
    Number(stats.expiringSoon || 0) +
    Number(stats.lowStock || 0) +
    Number(stats.outOfStock || 0);
  const riskPercentage = total ? Math.round((atRisk / total) * 100) : 0;

  return (
    <article className={`${PANEL} overflow-hidden`}>
      <SectionHeader
        icon={ShieldAlert}
        title="Stock Risk Summary"
        text="Expired, low stock and expiry risks across active inventory."
        to="/stock/batches"
        action="Review stock"
      />

      <div className="p-4 sm:p-5">
        {isLoading || isFetching ? (
          <div className="flex min-h-56 items-center justify-center">
            <Loader2 className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : isError ? (
          <EmptyState>
            {error?.response?.data?.message || "Unable to load stock risk summary."}
          </EmptyState>
        ) : total === 0 ? (
          <EmptyState>No active stock batches were found.</EmptyState>
        ) : (
          <div className="space-y-5">
            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                    At Risk
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-[var(--color-text-primary)]">
                    {formatNumber(atRisk)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                    Risk Share
                  </p>
                  <p className="mt-2 text-2xl font-extrabold text-[var(--color-danger)]">
                    {riskPercentage}%
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-[var(--color-danger)]"
                  style={{ width: `${Math.min(riskPercentage, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {riskItems.map((item) => {
                const Icon = item.icon;
                const value = Number(stats[item.key] || 0);
                const width = total ? Math.max((value / total) * 100, value ? 7 : 0) : 0;

                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${item.className}`}>
                          <Icon size={16} />
                        </span>
                        <span className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                          {item.label}
                        </span>
                      </div>
                      <strong className="shrink-0 text-sm text-[var(--color-text-primary)]">
                        {formatNumber(value)}
                      </strong>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                      <div className={`h-full rounded-full ${item.barClass}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-primary-tint)] px-3 py-2 text-sm">
              <span className="inline-flex items-center gap-2 font-bold text-[var(--color-success)]">
                <CheckCircle2 size={16} />
                Healthy
              </span>
              <strong className="text-[var(--color-text-primary)]">
                {formatNumber(stats.healthy)}
              </strong>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

export default StockRiskSummary;
