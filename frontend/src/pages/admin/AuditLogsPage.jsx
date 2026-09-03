import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axiosInstance";
import { format, parseISO } from "date-fns";
import {
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  AlertTriangle,
  Eye,
  X,
  User,
  Clock,
  Globe,
  Tag,
  Activity,
  FileText,
} from "lucide-react";

// A simple debounce hook to prevent excessive API calls on search
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const formatKey = (key) => {
  if (!key) return "";
  const result = key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim();
  return result
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === "id") return "ID";
      if (lower === "ip") return "IP";
      if (lower === "url") return "URL";
      if (lower === "qr") return "QR";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

const isPlainObject = (val) => {
  return val !== null && typeof val === "object" && !Array.isArray(val);
};

const getActionBadgeClass = (action = "") => {
  const upper = action.toUpperCase();
  if (upper.includes("CREATE") || upper.includes("SUCCESS")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-300";
  }
  if (upper.includes("DELETE") || upper.includes("FAILURE") || upper.includes("DEACTIVATE") || upper.includes("DISPOSE")) {
    return "bg-rose-50 text-rose-700 border-rose-300";
  }
  if (upper.includes("UPDATE") || upper.includes("CHANGE") || upper.includes("EDIT")) {
    return "bg-amber-50 text-amber-700 border-amber-300";
  }
  if (upper.includes("RELEASE") || upper.includes("RETURN")) {
    return "bg-indigo-50 text-indigo-700 border-indigo-300";
  }
  return "bg-[var(--color-primary-tint)] text-[var(--color-primary)] border-[var(--color-border)]";
};

const renderValue = (val) => {
  if (val === null || val === undefined) {
    return <span className="text-xs text-[var(--color-text-muted)] italic">None</span>;
  }
  if (typeof val === "boolean") {
    return val ? (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
        Yes
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 border border-gray-300">
        No
      </span>
    );
  }
  if (typeof val === "number") {
    return <span className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">{val.toLocaleString()}</span>;
  }
  if (typeof val === "string") {
    // Check if it is an ISO date string
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(val) && val.length >= 10) {
      try {
        const parsed = parseISO(val);
        if (!isNaN(parsed.getTime())) {
          return (
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {format(parsed, "MMM d, yyyy, h:mm a")}
            </span>
          );
        }
      } catch {
        // fallback
      }
    }
    // Check if UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
      return (
        <span className="rounded bg-[var(--color-surface-muted)] px-2 py-0.5 font-mono text-xs text-[var(--color-text-secondary)] border border-[var(--color-border)]">
          {val}
        </span>
      );
    }
    return <span className="text-sm font-medium text-[var(--color-text-primary)] break-words">{val}</span>;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) {
      return <span className="text-xs text-[var(--color-text-muted)] italic">Empty list</span>;
    }
    const allPrimitives = val.every((item) => typeof item !== "object" || item === null);
    if (allPrimitives) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {val.map((item, idx) => (
            <span
              key={idx}
              className="rounded-md bg-[var(--color-surface-muted)] px-2.5 py-0.5 font-medium text-xs text-[var(--color-text-primary)] border border-[var(--color-border)]"
            >
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-2 w-full">
        {val.map((item, idx) => (
          <div key={idx} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Item #{idx + 1}
            </div>
            {isPlainObject(item) ? (
              <RenderObjectEntries data={item} />
            ) : (
              renderValue(item)
            )}
          </div>
        ))}
      </div>
    );
  }
  if (isPlainObject(val)) {
    return <RenderObjectEntries data={val} />;
  }
  return <span className="text-sm">{String(val)}</span>;
};

const RenderObjectEntries = ({ data }) => {
  if (!data || typeof data !== "object") return null;

  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)] italic">No fields recorded.</p>;
  }

  const primitiveEntries = entries.filter(([, v]) => !isPlainObject(v) && !(Array.isArray(v) && v.some(x => isPlainObject(x))));
  const complexEntries = entries.filter(([, v]) => isPlainObject(v) || (Array.isArray(v) && v.some(x => isPlainObject(x))));

  return (
    <div className="space-y-3.5 w-full">
      {primitiveEntries.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <div className="divide-y divide-[var(--color-border)]">
            {primitiveEntries.map(([k, v], idx) => (
              <div
                key={k}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 ${
                  idx % 2 === 0 ? "bg-[var(--color-surface)]" : "bg-[var(--color-surface-muted)]/40"
                }`}
              >
                <span className="text-xs font-bold text-[var(--color-text-secondary)] sm:w-1/3 shrink-0">
                  {formatKey(k)}
                </span>
                <div className="text-sm font-medium text-[var(--color-text-primary)] sm:w-2/3 break-words text-left sm:text-right">
                  {renderValue(v)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {complexEntries.map(([k, v]) => (
        <div
          key={k}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm"
        >
          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
              {formatKey(k)}
            </h4>
          </div>
          <div className="p-3 sm:p-4">
            {renderValue(v)}
          </div>
        </div>
      ))}
    </div>
  );
};

const PageHeader = () => (
  <div className="mb-8 flex items-center gap-4">
    <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
      <ClipboardList size={32} />
    </div>
    <div>
      <h1 className="font-display text-4xl font-bold text-[var(--color-text-primary)]">
        Audit Logs
      </h1>
      <p className="mt-1 text-base text-[var(--color-text-secondary)]">
        Track all system activities and user actions.
      </p>
    </div>
  </div>
);

const LogDetailsModal = ({ log, onClose }) => {
  if (!log) return null;

  let parsedDetails = log.details;
  if (typeof parsedDetails === "string") {
    try {
      parsedDetails = JSON.parse(parsedDetails);
    } catch {
      // keep as string
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full max-w-2xl sm:max-w-3xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)] shadow-sm">
              <ClipboardList size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)] leading-tight">
                Audit Log Details
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Comprehensive record of system event and parameters
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                <User size={14} className="text-[var(--color-primary)]" />
                <span>User / Actor</span>
              </div>
              <div className="text-sm font-bold text-[var(--color-text-primary)]">
                {log.userName || "System"}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Role: <span className="font-semibold">{log.user?.role || "SYSTEM"}</span>
              </div>
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                <Activity size={14} className="text-[var(--color-primary)]" />
                <span>Action Performed</span>
              </div>
              <div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${getActionBadgeClass(log.actionType)}`}>
                  {log.actionType?.replace(/_/g, " ")}
                </span>
              </div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-1 flex items-center gap-1">
                <Clock size={12} className="text-[var(--color-text-muted)]" />
                <span>{format(parseISO(log.createdAt), "MMM d, yyyy, h:mm:ss a")}</span>
              </div>
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                <Tag size={14} className="text-[var(--color-primary)]" />
                <span>Target Entity</span>
              </div>
              <div className="text-sm font-bold text-[var(--color-text-primary)]">
                {log.entityType || "N/A"}
              </div>
              {log.entityId && (
                <div className="text-xs font-mono text-[var(--color-text-muted)] mt-0.5 truncate" title={log.entityId}>
                  ID: {log.entityId}
                </div>
              )}
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                <Globe size={14} className="text-[var(--color-primary)]" />
                <span>Network & Client IP</span>
              </div>
              <div className="text-sm font-bold text-[var(--color-text-primary)] font-mono">
                {log.ipAddress || "N/A"}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Client network identifier
              </div>
            </div>
          </div>

          {/* Event Details Section */}
          <div>
            <div className="mb-3 flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[var(--color-primary)]" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                  Recorded Event Details
                </h4>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                Structured activity payload
              </span>
            </div>

            {parsedDetails && typeof parsedDetails === "object" && Object.keys(parsedDetails).length > 0 ? (
              <RenderObjectEntries data={parsedDetails} />
            ) : parsedDetails && typeof parsedDetails !== "object" ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-primary)]">
                {String(parsedDetails)}
              </div>
            ) : (
              <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-6 text-center text-xs text-[var(--color-text-muted)]">
                No additional payload data recorded for this action.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-3.5 flex items-center justify-between">
          <div className="text-xs text-[var(--color-text-muted)] font-mono truncate max-w-xs" title={log.id}>
            Log ID: {log.id}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white color-transition hover:bg-[var(--color-primary-light)] shadow-sm"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

const AuditLogsPage = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: "" });
  const [selectedLog, setSelectedLog] = useState(null);

  const debouncedSearch = useDebounce(filters.search, 500);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("limit", 10);
    if (debouncedSearch) {
      params.append("search", debouncedSearch);
    }
    return params;
  }, [page, debouncedSearch]);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["auditLogs", queryParams.toString()],
    queryFn: () => api.get(`/audit-logs?${queryParams.toString()}`),
    select: (res) => res.data,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  const handleSearchChange = (e) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader />

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] sm:p-6">
        <div className="mb-4">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by user, IP, or details..."
              value={filters.search}
              onChange={handleSearchChange}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] py-2.5 pl-11 pr-4 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)]">
            <thead className="bg-[var(--color-surface-muted)]">
              <tr>
                {["User", "Action", "Target", "IP Address", "Timestamp", "Details"].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
              {isLoading ? (
                <tr><td colSpan="6" className="py-16 text-center"><div className="flex items-center justify-center gap-2 text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={20} /><span>Loading logs...</span></div></td></tr>
              ) : isError ? (
                <tr><td colSpan="6" className="py-16 text-center"><div className="flex flex-col items-center justify-center gap-2 text-[var(--color-danger)]"><AlertTriangle size={32} /><span className="font-semibold">Failed to load logs</span><p className="text-sm">{error.message}</p></div></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="6" className="py-16 text-center text-[var(--color-text-muted)]">No audit logs found.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--color-surface-muted)]">
                    <td className="whitespace-nowrap px-4 py-3"><div className="text-sm font-medium text-[var(--color-text-primary)]">{log.userName || "System"}</div><div className="text-xs text-[var(--color-text-muted)]">{log.user?.role || "SYSTEM"}</div></td>
                    <td className="whitespace-nowrap px-4 py-3"><span className="inline-flex rounded-full bg-[var(--color-primary-tint)] px-2 py-1 text-xs font-semibold leading-5 text-[var(--color-primary)]">{log.actionType.replace(/_/g, " ")}</span></td>
                    <td className="px-4 py-3"><div className="text-sm text-[var(--color-text-primary)]">{log.entityType || "N/A"}</div><div className="truncate text-xs text-[var(--color-text-muted)]" title={log.entityId}>ID: {log.entityId ? `...${log.entityId.slice(-12)}` : 'N/A'}</div></td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--color-text-secondary)]">{log.ipAddress || "N/A"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--color-text-secondary)]">{format(parseISO(log.createdAt), "MMM d, yyyy, h:mm:ss a")}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      {log.details && (
                        <button onClick={() => setSelectedLog(log)} className="text-[var(--color-primary)] hover:text-[var(--color-primary-light)]" title="View Details"><Eye size={18} /></button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-muted)]">
              Page {pagination.currentPage} of {pagination.totalPages}
              {isFetching && !isLoading && (
                <LoaderCircle className="ml-2 inline animate-spin" size={14} />
              )}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {selectedLog && (
        <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
};

export default AuditLogsPage;