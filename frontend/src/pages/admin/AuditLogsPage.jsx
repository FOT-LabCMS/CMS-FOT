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

  let displayDetails = { ...log.details };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full max-w-2xl rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl font-bold">Log Details</h3>
            <p className="mb-4 text-xs text-[var(--color-text-muted)]">
              ID: {log.id}
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={24} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-4">
          <pre className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
            {JSON.stringify(displayDetails, null, 2)}
          </pre>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2.5 font-semibold text-white color-transition hover:bg-[var(--color-primary-light)]"
        >
          Close
        </button>
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