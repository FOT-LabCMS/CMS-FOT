import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  FileChartColumn,
  Filter,
  RefreshCcw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ChemicalUsageTrend from "../components/dashboard/ChemicalUsageTrend.jsx";
import UsageByHazardCategory from "../components/dashboard/UsageByHazardCategory.jsx";
import InventorySnapshot from "../components/dashboard/InventorySnapshot.jsx";
import StockRiskSummary from "../components/dashboard/StockRiskSummary.jsx";
import RecentReturnActivity from "../components/dashboard/RecentReturnActivity.jsx";
import UnassignedStock from "../components/dashboard/UnassignedStock.jsx";
import ExpiryWatchlist from "../components/dashboard/ExpiryWatchlist.jsx";
import DashboardMetricCards from "../components/dashboard/DashboardMetricCards.jsx";

const inputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateFromInput = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return date;
};

const showDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(dateFromInput(value))
    : "N/A";

const PANEL =
  "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]";

const Dashboard = () => {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);

  const [preset, setPreset] = React.useState("this-month");
  const [startDate, setStartDate] = React.useState(inputDate(monthStart));
  const [endDate, setEndDate] = React.useState(inputDate(today));

  const invalidRange = dateFromInput(startDate) > dateFromInput(endDate);

  const displayName = user?.fullName || user?.name || user?.institutionalId || "FOTCMS User";

  const applyPreset = (value) => {
    const end = new Date();
    let start = new Date(end);

    if (value === "today") start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    if (value === "this-month") start = new Date(end.getFullYear(), end.getMonth(), 1);
    if (value === "last-30") start.setDate(start.getDate() - 29);
    if (value === "last-90") start.setDate(start.getDate() - 89);
    if (value === "this-year") start = new Date(end.getFullYear(), 0, 1);

    setPreset(value);
    setStartDate(inputDate(start));
    setEndDate(inputDate(end));
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <main className="px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1600px]">
          <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] px-5 py-6 shadow-[var(--shadow-md)] sm:px-7 sm:py-7 lg:px-8">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-[var(--color-accent)] opacity-20" />
            <div className="pointer-events-none absolute -bottom-28 right-20 h-56 w-56 rounded-full bg-[var(--color-primary-light)] opacity-30" />
            <div className="relative">
              <div className="flex w-full items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--color-accent-light)]">
                  <BarChart3 size={14} />
                  Laboratory Overview
                </span>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent-light)] transition-colors hover:bg-[var(--color-primary-light)]"
                >
                  <RefreshCcw size={13} />
                  Refresh
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                  <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                    Welcome back, {displayName}
                  </h1>
                </div>

                <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-xl">
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent-light)]">
                      Active Date Range
                    </p>

                    <p className="mt-2 text-sm font-extrabold text-[var(--color-text-inverse)]">
                      {showDate(startDate)} – {showDate(endDate)}
                    </p>
                  </div>

                  <Link
                    to="/reports/usage"
                    className="group flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-accent)] p-4 text-[var(--color-primary-dark)] transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em]">
                        Reports
                      </p>

                      <p className="mt-2 text-sm font-extrabold">
                        Open full analytics
                      </p>
                    </div>

                    <FileChartColumn
                      size={26}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className={`${PANEL} mt-6 p-4 sm:p-5`}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-[var(--color-primary)]" />
                  <h2 className="text-base font-extrabold text-[var(--color-text-primary)]">
                    Dashboard Date Filter
                  </h2>
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Chemical usage trend, hazard usage and return activity update by this range.
                </p>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-[180px_170px_170px_auto]">
                <label>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Quick Range
                  </span>
                  <select
                    value={preset}
                    onChange={(event) => applyPreset(event.target.value)}
                    className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                  >
                    <option value="today">Today</option>
                    <option value="this-month">This Month</option>
                    <option value="last-30">Last 30 Days</option>
                    <option value="last-90">Last 90 Days</option>
                    <option value="this-year">This Year</option>
                    {preset === "custom" && <option value="custom">Custom Range</option>}
                  </select>
                </label>

                <label>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Start Date
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => {
                      setPreset("custom");
                      setStartDate(event.target.value);
                    }}
                    className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    End Date
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    max={inputDate(today)}
                    onChange={(event) => {
                      setPreset("custom");
                      setEndDate(event.target.value);
                    }}
                    className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => applyPreset("this-month")}
                  className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-4 text-sm font-bold text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
                >
                  <RefreshCcw size={16} />
                  Reset
                </button>
              </div>
            </div>

            {invalidRange && (
              <p className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-danger)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--color-danger)]">
                Start date cannot be later than end date.
              </p>
            )}
          </section>

          <DashboardMetricCards />

          <section className="mt-6 grid gap-6 xl:grid-cols-3">
            <ChemicalUsageTrend
              startDate={startDate}
              endDate={endDate}
              invalidRange={invalidRange}
            />
            <UsageByHazardCategory
              startDate={startDate}
              endDate={endDate}
              invalidRange={invalidRange}
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-3">
            <InventorySnapshot />
            <StockRiskSummary />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-3">
            <RecentReturnActivity
              startDate={startDate}
              endDate={endDate}
              invalidRange={invalidRange}
            />
            <UnassignedStock />
            <ExpiryWatchlist />
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
