import React, { useMemo } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axiosInstance";

const PANEL =
  "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]";

const HAZARD_COLORS = {
  FLAMMABLE: "#D9822B",
  CORROSIVE: "#7C3AED",
  TOXIC: "#D6483F",
  OXIDIZER: "#2563EB",
  EXPLOSIVE: "#B91C1C",
  IRRITANT: "#B8873A",
  ENVIRONMENTAL: "#1E8A5A",
  COMPRESSED_GAS: "#0F766E",
  HEALTH_HAZARD: "#BE123C",
  NONE: "#6B7280",
  OTHER: "#5B6660",
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatHazard = (value) =>
  String(value || "OTHER")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const SectionHeader = ({ icon: Icon, title, text }) => (
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
  </header>
);

const EmptyState = ({ children }) => (
  <div className="flex min-h-44 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-4 text-center text-sm font-semibold text-[var(--color-text-secondary)]">
    {children}
  </div>
);

const DonutChart = ({ categories, totalQuantity }) => {
  let consumed = 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative mx-auto h-44 w-44">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="43"
            fill="none"
            stroke="var(--color-surface-muted)"
            strokeWidth="18"
          />

          {categories.map((item) => {
            const percentage = totalQuantity
              ? (item.totalQuantity / totalQuantity) * 100
              : 0;
            const offset = -consumed;
            consumed += percentage;

            return (
              <circle
                key={item.hazardCategory}
                cx="60"
                cy="60"
                r="43"
                pathLength="100"
                fill="none"
                stroke={item.color}
                strokeWidth="18"
                strokeDasharray={`${percentage} ${100 - percentage}`}
                strokeDashoffset={offset}
              >
                <title>
                  {formatHazard(item.hazardCategory)}:{" "}
                  {formatNumber(item.totalQuantity)}
                </title>
              </circle>
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <strong className="text-xl font-extrabold text-[var(--color-text-primary)]">
            {formatNumber(totalQuantity)}
          </strong>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            Total Qty
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((item) => {
          const percentage = totalQuantity
            ? (item.totalQuantity / totalQuantity) * 100
            : 0;

          return (
            <div key={item.hazardCategory} className="flex items-center gap-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />

              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-[var(--color-text-secondary)]">
                    {formatHazard(item.hazardCategory)}
                  </span>
                  <strong className="text-[var(--color-text-primary)]">
                    {percentage.toFixed(0)}%
                  </strong>
                </div>

                <div className="mt-1 flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
                  <span>{formatNumber(item.totalQuantity)} qty</span>
                  <span>{formatNumber(item.recordCount)} records</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const UsageByHazardCategory = ({
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
    queryKey: ["usageByHazardCategory", startDate, endDate],
    queryFn: async () => {
      const response = await api.get("/usage/hazard-category", {
        params: { startDate, endDate },
      });

      return response.data;
    },
    enabled: Boolean(startDate) && Boolean(endDate) && !invalidRange,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const categories = useMemo(() => {
    const rows = data?.categories || [];

    return rows
      .map((item) => ({
        ...item,
        color: HAZARD_COLORS[item.hazardCategory] || HAZARD_COLORS.OTHER,
      }))
      .filter((item) => Number(item.totalQuantity || 0) > 0);
  }, [data?.categories]);

  const totalQuantity = data?.totalQuantity || 0;

  return (
    <article className={`${PANEL} overflow-hidden`}>
      <SectionHeader
        icon={ShieldAlert}
        title="Usage by Hazard Category"
        text="Returned quantity grouped by chemical hazard classification."
      />

      <div className="p-4 sm:p-5">
        {invalidRange ? (
          <EmptyState>
            Start date cannot be later than end date.
          </EmptyState>
        ) : isLoading || isFetching ? (
          <div className="flex min-h-44 items-center justify-center">
            <Loader2 className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : isError ? (
          <EmptyState>
            {error?.response?.data?.message ||
              "Unable to load hazard category usage."}
          </EmptyState>
        ) : categories.length === 0 ? (
          <EmptyState>
            No returned usage was recorded for this date range.
          </EmptyState>
        ) : (
          <DonutChart
            categories={categories}
            totalQuantity={totalQuantity}
          />
        )}
      </div>
    </article>
  );
};

export default UsageByHazardCategory;
