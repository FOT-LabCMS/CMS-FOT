import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  FileText,
  FlaskConical,
  Loader2,
  MapPin,
  TrendingUp,
} from "lucide-react";
import api from "../../api/axiosInstance";

const PANEL =
  "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]";

const number = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const MetricCard = ({
  label,
  value,
  helper,
  icon: Icon,
  iconClass,
  helperClass = "text-[var(--color-success)]",
}) => (
  <article
    className={`${PANEL} flex h-full min-w-0 flex-col p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] sm:p-5`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          {label}
        </p>

        <div className="mt-3 whitespace-nowrap text-2xl font-extrabold text-[var(--color-text-primary)] sm:text-3xl">
          {value}
        </div>
      </div>

      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${iconClass}`}
      >
        <Icon size={23} />
      </span>
    </div>

    <p
      className={`mt-auto pt-3 text-xs font-semibold leading-5 ${helperClass}`}
    >
      {helper}
    </p>
  </article>
);

const InventoryAlertsCard = ({
  batchStats,
  isLoading,
}) => {
  const totalAlerts =
    Number(batchStats?.lowStock || 0) +
    Number(batchStats?.expiringSoon || 0);

  return (
    <article
      className={`${PANEL} flex h-full flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]`}
    >
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
            Inventory Alerts
          </p>

          <div className="mt-3 text-2xl font-extrabold text-[var(--color-text-primary)] sm:text-3xl">
            {isLoading ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              number(totalAlerts)
            )}
          </div>
        </div>

        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] text-[var(--color-warning)]">
          <AlertTriangle size={23} />
        </span>
      </div>

      <div className="mt-auto grid grid-cols-2 border-t border-[var(--color-border)]">
        <div className="border-r border-[var(--color-border)] p-2 text-center">
          <p className="text-lg font-bold text-[var(--color-warning)]">
            {isLoading
              ? "..."
              : number(batchStats?.lowStock)}
          </p>

          <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">
            Low Stock
          </p>
        </div>

        <div className="p-2 text-center">
          <p className="text-lg font-bold text-[var(--color-danger)]">
            {isLoading
              ? "..."
              : number(batchStats?.expiringSoon)}
          </p>

          <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">
            Expiring Soon
          </p>
        </div>
      </div>
    </article>
  );
};

const DashboardMetricCards = () => {
  const {
    data: chemicalStats,
    isLoading: isLoadingChemicalStats,
  } = useQuery({
    queryKey: ["chemicalStats"],
    queryFn: () =>
      api
        .get("/chemicals/stats")
        .then((response) => response.data.stats),
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: batchStats,
    isLoading: isLoadingBatchStats,
  } = useQuery({
    queryKey: ["batchStats"],
    queryFn: () =>
      api
        .get("/batches/stats")
        .then((response) => response.data.stats),
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: locationStats,
    isLoading: isLoadingLocationStats,
  } = useQuery({
    queryKey: ["locationStats"],
    queryFn: () =>
      api
        .get("/locations/stats")
        .then((response) => response.data.stats),
    staleTime: 1000 * 60 * 5,
  });

  const activeChemicals =
    Number(chemicalStats?.active || 0);

  const sdsCount =
    Number(chemicalStats?.sdsCount || 0);

  const sdsCoverage =
    activeChemicals > 0
      ? (sdsCount / activeChemicals) * 100
      : 0;

  return (
    <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Link
        to="/chemicals/list"
        className="h-full"
      >
        <MetricCard
          label="Total Chemicals"
          value={
            isLoadingChemicalStats ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              number(chemicalStats?.active)
            )
          }
          helper={
            isLoadingChemicalStats
              ? "Loading..."
              : `${number(
                  chemicalStats?.inactive,
                )} deactivated`
          }
          icon={FlaskConical}
          iconClass="bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
          helperClass="text-[var(--color-text-secondary)]"
        />
      </Link>

      <Link
        to="/stock/batches"
        className="h-full"
      >
        <InventoryAlertsCard
          batchStats={batchStats}
          isLoading={isLoadingBatchStats}
        />
      </Link>

      <Link
        to="/locations"
        className="h-full"
      >
        <MetricCard
          label="Total Locations"
          value={
            isLoadingLocationStats ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              number(locationStats?.total)
            )
          }
          helper={
            isLoadingLocationStats
              ? "Loading..."
              : `${number(
                  locationStats?.rootLocations,
                )} parent, ${number(
                  locationStats?.childLocations,
                )} child locations`
          }
          icon={MapPin}
          iconClass="bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
          helperClass="text-[var(--color-text-secondary)]"
        />
      </Link>

      <Link
        to="/reports/usage"
        className="h-full"
      >
        <MetricCard
          label="Total Usage"
          value={
            isLoadingBatchStats ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              `${Number(
                batchStats?.usagePercentage || 0,
              ).toFixed(1)}%`
            )
          }
          helper={
            isLoadingBatchStats
              ? "Loading..."
              : `${number(
                  batchStats?.totalUsed,
                )} of ${number(
                  batchStats?.totalReceived,
                )} units consumed`
          }
          icon={TrendingUp}
          iconClass="bg-[var(--color-primary-tint)] text-[var(--color-success)]"
          helperClass="text-[var(--color-success)]"
        />
      </Link>

      <Link
        to="/sds/library"
        className="h-full"
      >
        <MetricCard
          label="SDS Documents"
          value={
            isLoadingChemicalStats ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              number(sdsCount)
            )
          }
          helper={
            isLoadingChemicalStats
              ? "Loading..."
              : `${sdsCoverage.toFixed(
                  1,
                )}% document coverage`
          }
          icon={FileText}
          iconClass="bg-[var(--color-surface-muted)] text-[var(--color-accent-dark)]"
          helperClass="text-[var(--color-accent-dark)]"
        />
      </Link>
    </section>
  );
};

export default DashboardMetricCards;