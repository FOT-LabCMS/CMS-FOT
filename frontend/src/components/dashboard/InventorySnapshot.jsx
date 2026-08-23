import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FlaskConical,
  Loader2,
} from "lucide-react";
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
  LOW_STOCK: {
    label: "Low Stock",
    className: "border-[var(--color-warning)] bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  },
  EXPIRING_SOON: {
    label: "Expiring Soon",
    className: "border-[var(--color-accent)] bg-[var(--color-surface-muted)] text-[var(--color-accent-dark)]",
  },
  HEALTHY: {
    label: "Healthy",
    className: "border-[var(--color-success)] bg-[var(--color-primary-tint)] text-[var(--color-success)]",
  },
};

const SectionHeader = ({
  icon: Icon,
  title,
  text,
  to,
  action,
}) => (
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

const InventorySnapshot = () => {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["dashboardInventorySnapshot"],
    queryFn: async () => {
      const response = await api.get("/usage/inventory-snapshot");
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const rows = data?.inventory || [];

  return (
    <article
      className={`${PANEL} overflow-hidden xl:col-span-2`}
    >
      <SectionHeader
        icon={FlaskConical}
        title="Inventory Snapshot"
        text="Current stock, storage, expiry and batch status."
        to="/chemicals/list"
        action="View inventory"
      />

      <div className="overflow-x-auto">
        {isLoading || isFetching ? (
          <div className="flex min-h-56 items-center justify-center">
            <Loader2 className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : isError ? (
          <div className="p-4">
            <EmptyState>
              {error?.response?.data?.message ||
                "Unable to load inventory snapshot."}
            </EmptyState>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4">
            <EmptyState>
              No inventory batches were found.
            </EmptyState>
          </div>
        ) : (
          <div className="max-h-[405px] overflow-y-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[var(--color-surface-muted)]">
              <tr className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                <th className="px-5 py-3">Chemical</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Current Quantity</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((row) => {
                const meta = statusMeta[row.status] || statusMeta.HEALTHY;
                const daysLabel =
                  row.daysRemaining === null
                    ? "No expiry"
                    : row.daysRemaining < 0
                      ? `${Math.abs(row.daysRemaining)} days expired`
                      : `${row.daysRemaining} days remaining`;

                return (
                  <tr key={row.id} className="hover:bg-[var(--color-primary-tint)]">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-[var(--color-text-primary)]">
                        {row.chemicalName}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                        {row.chemicalCode}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 text-sm font-bold text-[var(--color-text-primary)]">
                      {row.batchNumber}
                    </td>

                    <td className="px-4 py-3.5 text-sm font-semibold text-[var(--color-text-secondary)]">
                      {formatNumber(row.currentQuantity)} {row.unit}
                    </td>

                    <td className="px-4 py-3.5 text-sm text-[var(--color-text-secondary)]">
                      {row.location}
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {formatDate(row.expiryDate)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {daysLabel}
                      </p>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}>
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </article>
  );
};

export default InventorySnapshot;
