import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axiosInstance";

const DAY = 24 * 60 * 60 * 1000;

const PANEL =
  "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]";

/**
 * Convert a Date object into YYYY-MM-DD format.
 */
const inputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Convert HTML date input value into a Date object.
 */
const dateFromInput = (value) => {
  if (!value) return null;

  return new Date(`${value}T00:00:00`);
};

/**
 * Create a consistent date key for backend trend data.
 */
const trendDateKey = (value) => {
  if (!value) return "";

  // Handle both YYYY-MM-DD and ISO date strings
  if (typeof value === "string") {
    const matchedDate = value.match(/^\d{4}-\d{2}-\d{2}/);

    if (matchedDate) {
      return matchedDate[0];
    }
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return inputDate(date);
};

/**
 * Format numerical values.
 */
const formatNumber = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

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

/**
 * SVG line chart.
 */
const TrendChart = ({ points, unit }) => {
  const width = 760;
  const height = 250;
  const left = 52;
  const right = 20;
  const top = 20;
  const bottom = 42;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const maximumValue = Math.max(
    ...points.map((point) => Number(point.value || 0)),
    1,
  );

  const coordinates = points.map((point, index) => ({
    ...point,

    x:
      points.length === 1
        ? left + chartWidth / 2
        : left +
          (index / (points.length - 1)) * chartWidth,

    y:
      top +
      chartHeight -
      (Number(point.value || 0) / maximumValue) *
        chartHeight,
  }));

  const linePoints = coordinates
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const areaPoints = `${left},${top + chartHeight} ${linePoints} ${
    left + chartWidth
  },${top + chartHeight}`;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[250px] min-w-[650px] w-full"
        role="img"
        aria-label="Chemical usage trend chart"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y =
            top + chartHeight - tick * chartHeight;

          return (
            <g key={tick}>
              <line
                x1={left}
                x2={left + chartWidth}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
              />

              <text
                x={left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--color-text-muted)"
              >
                {formatNumber(maximumValue * tick)}
              </text>
            </g>
          );
        })}

        <polygon
          points={areaPoints}
          fill="var(--color-primary-tint)"
          opacity="0.85"
        />

        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coordinates.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="var(--color-surface)"
              stroke="var(--color-primary)"
              strokeWidth="3"
            />

            <title>
              {point.label}: {formatNumber(point.value)}{" "}
              {unit}
            </title>

            <text
              x={point.x}
              y={height - 14}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-text-muted)"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const ChemicalUsageTrend = ({
  startDate,
  endDate,
  invalidRange = false,
}) => {
  const [trendType, setTrendType] =
    useState("chemical");

  const [trendEntity, setTrendEntity] =
    useState("");

  /**
   * Fetch chemicals for chemical-wise selection.
   */
  const {
    data: chemicalsForSelect = [],
    isLoading: isLoadingChemicals,
    isError: isChemicalsError,
  } = useQuery({
    queryKey: ["dashboardChemicalsForTrend"],

    queryFn: async () => {
      const response = await api.get("/chemicals");

      return response.data.chemicals || [];
    },

    staleTime: 1000 * 60 * 60,
  });

  /**
   * Fetch batches for batch-wise selection.
   */
  const {
    data: batchesForSelect = [],
    isLoading: isLoadingBatches,
    isError: isBatchesError,
  } = useQuery({
    queryKey: ["dashboardBatchesForTrend"],

    queryFn: async () => {
      const response = await api.get("/batches/dashboard-options");

      return response.data.batches || [];
    },

    staleTime: 1000 * 60 * 5,
  });

  /**
   * Split the selected batch key.
   *
   * Batch option format:
   * CHE-000001::BAT-001
   */
  const selectedBatchData = useMemo(() => {
    if (
      trendType !== "batch" ||
      !trendEntity
    ) {
      return {
        chemicalCode: "",
        batchNumber: "",
      };
    }

    const separatorIndex =
      trendEntity.indexOf("::");

    if (separatorIndex === -1) {
      return {
        chemicalCode: "",
        batchNumber: trendEntity,
      };
    }

    return {
      chemicalCode: trendEntity.substring(
        0,
        separatorIndex,
      ),

      batchNumber: trendEntity.substring(
        separatorIndex + 2,
      ),
    };
  }, [trendEntity, trendType]);

  /**
   * Get trend data from the backend.
   */
  const {
    data: trendData,
    isLoading: isLoadingTrend,
    isFetching: isFetchingTrend,
    isError: isTrendError,
    error: trendError,
  } = useQuery({
    queryKey: [
      "usageTrend",
      startDate,
      endDate,
      trendType,
      trendEntity,
    ],

    queryFn: async () => {
      const params = {
        startDate,
        endDate,
      };

      if (trendType === "chemical") {
        params.chemicalCode = trendEntity;
      } else {
        params.batchNumber =
          selectedBatchData.batchNumber;

        if (selectedBatchData.chemicalCode) {
          params.chemicalCode =
            selectedBatchData.chemicalCode;
        }
      }

      const response = await api.get(
        "/usage/dashboard-trend",
        {
          params,
        },
      );

      return response.data;
    },

    enabled:
      Boolean(startDate) &&
      Boolean(endDate) &&
      !invalidRange &&
      Boolean(trendEntity),

    staleTime: 1000 * 60 * 2,

    retry: 1,
  });

  const trendPointsData =
    trendData?.trend || [];

  const trendUnit = trendData?.unit || "";

  const hasTrendResponse = Boolean(trendData);

  /**
   * Create the selected chemical or batch label.
   */
  const selectedTrendLabel = useMemo(() => {
    if (!trendEntity) return "";

    if (trendData?.label) {
      return trendData.label;
    }

    if (trendType === "chemical") {
      const chemical =
        chemicalsForSelect.find(
          (item) =>
            item.chemicalCode === trendEntity,
        );

      return chemical
        ? `${chemical.canonicalName} (${chemical.chemicalCode})`
        : trendEntity;
    }

    const selectedBatch =
      batchesForSelect.find((batch) => {
        const chemicalCode =
          batch.chemical?.chemicalCode ||
          batch.chemicalCode ||
          "";

        const batchKey = `${chemicalCode}::${batch.batchNumber}`;

        return batchKey === trendEntity;
      });

    if (!selectedBatch) {
      return selectedBatchData.batchNumber;
    }

    const chemicalName =
      selectedBatch.chemical?.canonicalName ||
      selectedBatch.chemicalName ||
      "Unknown Chemical";

    return `${chemicalName} - ${selectedBatch.batchNumber}`;
  }, [
    batchesForSelect,
    chemicalsForSelect,
    selectedBatchData.batchNumber,
    trendData?.label,
    trendEntity,
    trendType,
  ]);

  /**
   * Convert daily backend data into maximum eight
   * display buckets.
   */
  const trendPoints = useMemo(() => {
    if (
      !trendPointsData.length ||
      !startDate ||
      !endDate ||
      invalidRange
    ) {
      return [];
    }

    const start = dateFromInput(startDate);
    const end = dateFromInput(endDate);

    if (
      !start ||
      !end ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return [];
    }

    const dateMap = new Map(
      trendPointsData.map((item) => [
        trendDateKey(item.date),
        Number(item.totalQuantity || 0),
      ]),
    );

    const totalDays = Math.max(
      1,
      Math.floor((end - start) / DAY) + 1,
    );

    const bucketCount = Math.min(8, totalDays);

    const bucketSize = Math.max(
      1,
      Math.ceil(totalDays / bucketCount),
    );

    const points = [];

    for (
      let bucketIndex = 0;
      bucketIndex < bucketCount;
      bucketIndex += 1
    ) {
      const bucketStart = new Date(
        start.getTime() +
          bucketIndex * bucketSize * DAY,
      );

      let bucketValue = 0;

      for (
        let dayIndex = 0;
        dayIndex < bucketSize;
        dayIndex += 1
      ) {
        const currentDate = new Date(
          bucketStart.getTime() +
            dayIndex * DAY,
        );

        if (currentDate > end) {
          break;
        }

        const dayKey = inputDate(currentDate);

        bucketValue += Number(
          dateMap.get(dayKey) || 0,
        );
      }

      points.push({
        label: new Intl.DateTimeFormat(
          "en-GB",
          {
            day: "2-digit",
            month: "short",
          },
        ).format(bucketStart),

        value: bucketValue,
      });
    }

    return points;
  }, [
    trendPointsData,
    startDate,
    endDate,
    invalidRange,
  ]);

  /**
   * Prefer the backend stock-consumed total, which matches
   * the ChemicalWise page's Total used value.
   */
  const totalUsageQuantity = useMemo(() => {
    if (trendData?.totalUsed !== undefined) {
      return Number(trendData.totalUsed || 0);
    }

    return trendPointsData.reduce(
      (total, item) =>
        total + Number(item.totalQuantity || 0),
      0,
    );
  }, [trendData?.totalUsed, trendPointsData]);

  const selectionIsLoading =
    trendType === "chemical"
      ? isLoadingChemicals
      : isLoadingBatches;

  const selectionHasError =
    trendType === "chemical"
      ? isChemicalsError
      : isBatchesError;

  const handleTrendTypeChange = (event) => {
    setTrendType(event.target.value);

    // Remove the previous chemical/batch selection
    setTrendEntity("");
  };

  return (
    <article
      className={`${PANEL} overflow-hidden xl:col-span-2`}
    >
      <SectionHeader
        icon={Activity}
        title={
          trendType === "chemical"
            ? "Chemical Usage Trend"
            : "Batch Usage Trend"
        }
        text="Issued quantity for the selected reporting period."
        to="/reports/usage"
        action="View report"
      />

      <div className="p-4 sm:p-5">
        <div className="mb-5 grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              View Usage By
            </span>

            <select
              value={trendType}
              onChange={handleTrendTypeChange}
              className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            >
              <option value="chemical">
                Chemical-wise
              </option>

              <option value="batch">
                Batch-wise
              </option>
            </select>
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              {trendType === "chemical"
                ? "Select Chemical"
                : "Select Batch"}
            </span>

            <select
              value={trendEntity}
              onChange={(event) =>
                setTrendEntity(event.target.value)
              }
              disabled={
                selectionIsLoading ||
                selectionHasError
              }
              className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-60 focus:border-[var(--color-accent)]"
            >
              <option value="">
                {selectionIsLoading
                  ? "Loading..."
                  : selectionHasError
                    ? "Unable to load options"
                    : trendType === "chemical"
                      ? "Choose a chemical"
                      : "Choose a batch"}
              </option>

              {trendType === "chemical"
                ? chemicalsForSelect.map(
                    (chemical) => (
                      <option
                        key={
                          chemical.id ||
                          chemical.chemicalCode
                        }
                        value={
                          chemical.chemicalCode
                        }
                      >
                        {chemical.canonicalName} (
                        {chemical.chemicalCode})
                      </option>
                    ),
                  )
                : batchesForSelect.map(
                    (batch) => {
                      const chemicalCode =
                        batch.chemical
                          ?.chemicalCode ||
                        batch.chemicalCode ||
                        "";

                      const chemicalName =
                        batch.chemical
                          ?.canonicalName ||
                        batch.chemicalName ||
                        "Unknown Chemical";

                      const batchValue = `${chemicalCode}::${batch.batchNumber}`;

                      return (
                        <option
                          key={
                            batch.id ||
                            batchValue
                          }
                          value={batchValue}
                        >
                          {chemicalName} -{" "}
                          {batch.batchNumber}
                        </option>
                      );
                    },
                  )}
            </select>
          </label>
        </div>

        {invalidRange ? (
          <EmptyState>
            Start date cannot be later than end date.
          </EmptyState>
        ) : !trendEntity ? (
          <EmptyState>
            Select a chemical or batch to view its
            usage trend.
          </EmptyState>
        ) : isLoadingTrend || isFetchingTrend ? (
          <div className="flex min-h-44 items-center justify-center">
            <Loader2 className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : isTrendError ? (
          <EmptyState>
            {trendError?.response?.data?.message ||
              "Unable to load the usage trend."}
          </EmptyState>
        ) : hasTrendResponse ? (
          <>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                  Selected{" "}
                  {trendType === "chemical"
                    ? "Chemical"
                    : "Batch"}
                </p>

                <p className="mt-1 truncate text-sm font-bold text-[var(--color-text-primary)]">
                  {selectedTrendLabel}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                  Total Used
                </p>

                <p className="mt-1 text-2xl font-extrabold text-[var(--color-primary)]">
                  {formatNumber(totalUsageQuantity)}
                  {trendUnit
                    ? ` ${trendUnit}`
                    : ""}
                </p>
              </div>
            </div>

            {trendPoints.length === 0 ? (
              <EmptyState>
                No usage was recorded for the selected{" "}
                {trendType} during this date range.
              </EmptyState>
            ) : (
              <TrendChart
                points={trendPoints}
                unit={trendUnit}
              />
            )}
          </>
        ) : null}
      </div>
    </article>
  );
};

export default ChemicalUsageTrend;
