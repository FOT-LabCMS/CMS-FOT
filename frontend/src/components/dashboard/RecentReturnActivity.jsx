import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axiosInstance";

const PANEL =
  "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]";

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

const RecentReturnActivity = ({
  startDate,
  endDate,
  invalidRange = false,
}) => {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["dashboardRecentReturns", startDate, endDate],
    queryFn: async () => {
      const response = await api.get("/usage/recent-returns", {
        params: { startDate, endDate },
      });
      return response.data;
    },
    enabled: Boolean(startDate) && Boolean(endDate) && !invalidRange,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const activities = data?.activities || [];

  return (
    <article className={`${PANEL} overflow-hidden`}>
      <SectionHeader
        icon={RotateCcw}
        title="Recent Return Activity"
        text="Latest chemical returns recorded in usage logs."
        to="/usage/batchwise"
        action="View usage"
      />

      <div className="p-4 sm:p-5">
        {invalidRange ? (
          <EmptyState>
            Start date cannot be later than end date.
          </EmptyState>
        ) : isLoading || isFetching ? (
          <div className="flex min-h-56 items-center justify-center">
            <Loader2 className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : isError ? (
          <EmptyState>
            {error?.response?.data?.message || "Unable to load recent return activity."}
          </EmptyState>
        ) : activities.length === 0 ? (
          <EmptyState>No returned usage records were found.</EmptyState>
        ) : (
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {activities.map((item) => (
              <div
                key={item.id}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-[var(--color-text-primary)]">
                      {item.chemicalName}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                      {item.chemicalCode} • Bin card no. {item.batchNumber}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--color-primary-tint)] px-2.5 py-1 text-xs font-extrabold text-[var(--color-primary)]">
                    {formatNumber(item.quantityUsed)} {item.unit}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <span className="truncate">By {item.userName || item.stuRegisterNum}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {formatDateTime(item.dateReturned)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

export default RecentReturnActivity;
