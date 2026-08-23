import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axiosInstance";
import { format, parseISO } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  AlertTriangle,
  Info,
  TriangleAlert,
  CircleAlert,
} from "lucide-react";

// Helper to get icon and color based on severity
const getSeverityProps = (severity) => {
  switch (severity) {
    case "CRITICAL":
      return {
        Icon: TriangleAlert,
        color: "text-[var(--color-danger)]",
        bgColor: "bg-[var(--color-danger-tint)]",
      };
    case "WARNING":
      return {
        Icon: CircleAlert,
        color: "text-[var(--color-warning)]",
        bgColor: "bg-[var(--color-warning-tint)]",
      };
    default: // INFO
      return {
        Icon: Info,
        color: "text-[var(--color-info)]",
        bgColor: "bg-[var(--color-info-tint)]",
      };
  }
};

const PageHeader = () => (
  <div className="mb-8 flex items-center gap-4">
    <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
      <Bell size={32} />
    </div>
    <div>
      <h1 className="font-display text-4xl font-bold text-[var(--color-text-primary)]">
        Notifications
      </h1>
      <p className="mt-1 text-base text-[var(--color-text-secondary)]">
        View alerts and updates from the system.
      </p>
    </div>
  </div>
);

const NotificationsPage = () => {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all"); // 'all' or 'unread'
  const queryClient = useQueryClient();

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("limit", 10);
    params.append("filter", filter);
    return params;
  }, [page, filter]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["notifications", queryParams.toString()],
    queryFn: () => api.get(`/notifications?${queryParams.toString()}`),
    select: (res) => res.data,
    placeholderData: (previousData) => previousData,
  });

  const notifications = data?.data || [];
  const pagination = data?.pagination;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] });
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader />

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-1">
            <button onClick={() => { setFilter("all"); setPage(1); }} className={`px-4 py-1.5 text-sm font-semibold rounded-[var(--radius-sm)] ${filter === 'all' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>All</button>
            <button onClick={() => { setFilter("unread"); setPage(1); }} className={`px-4 py-1.5 text-sm font-semibold rounded-[var(--radius-sm)] ${filter === 'unread' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>Unread</button>
          </div>

          <button onClick={() => markAllAsReadMutation.mutate()} disabled={markAllAsReadMutation.isPending} className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-tint)] disabled:cursor-not-allowed disabled:opacity-50">
            <CheckCheck size={18} />
            <span>Mark all as read</span>
          </button>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="py-16 text-center"><div className="flex items-center justify-center gap-2 text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={20} /><span>Loading notifications...</span></div></div>
          ) : isError ? (
            <div className="py-16 text-center"><div className="flex flex-col items-center justify-center gap-2 text-[var(--color-danger)]"><AlertTriangle size={32} /><span className="font-semibold">Failed to load notifications</span><p className="text-sm">{error.message}</p></div></div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-[var(--color-text-muted)]">You have no notifications.</div>
          ) : (
            notifications.map((notification) => {
              const { Icon, color, bgColor } = getSeverityProps(notification.severity);
              return (
                <div key={notification.id} className={`flex items-start gap-4 rounded-[var(--radius-md)] border p-4 ${notification.isRead ? 'border-transparent bg-[var(--color-surface-muted)]' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bgColor} ${color}`}><Icon size={22} /></div>
                  <div className="flex-1">
                    <p className={`font-medium ${notification.isRead ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>{notification.message}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{format(parseISO(notification.createdAt), "MMM d, yyyy, h:mm a")}</p>
                  </div>
                  {!notification.isRead && (
                    <button onClick={() => markAsReadMutation.mutate(notification.id)} disabled={markAsReadMutation.isPending} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]" title="Mark as read"><Check size={18} /></button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-muted)]">Page {pagination.currentPage} of {pagination.totalPages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;