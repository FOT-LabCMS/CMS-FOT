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
  const [filter, setFilter] = useState("all"); // 'all', 'unread', or 'read'
  const queryClient = useQueryClient();

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("limit", 10);
    params.append("filter", filter);
    return params;
  }, [page, filter]);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["notifications", queryParams.toString()],
    queryFn: () => api.get(`/notifications?${queryParams.toString()}`),
    select: (res) => res.data,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notificationCount"],
    queryFn: () => api.get("/notifications/count"),
    select: (res) => res.data?.count || 0,
    staleTime: 5000,
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
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--color-border)] pb-4">
          {/* Tabs: All / Unread / Read */}
          <div className="flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-1 w-fit">
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setPage(1);
              }}
              className={`px-3.5 py-1.5 text-sm font-semibold rounded-[var(--radius-sm)] transition-all ${
                filter === "all"
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("unread");
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold rounded-[var(--radius-sm)] transition-all ${
                filter === "unread"
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span
                  className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    filter === "unread"
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                  }`}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("read");
                setPage(1);
              }}
              className={`px-3.5 py-1.5 text-sm font-semibold rounded-[var(--radius-sm)] transition-all ${
                filter === "read"
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Read
            </button>
          </div>

          {/* Mark all as read button */}
          <button
            type="button"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || unreadCount === 0}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-tint)] disabled:cursor-not-allowed disabled:opacity-50 self-start sm:self-auto transition-colors"
          >
            {markAllAsReadMutation.isPending ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <CheckCheck size={18} />
            )}
            <span>{markAllAsReadMutation.isPending ? "Marking all..." : "Mark all as read"}</span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="flex items-center justify-center gap-2 text-[var(--color-text-muted)]">
                <LoaderCircle className="animate-spin" size={20} />
                <span>Loading notifications...</span>
              </div>
            </div>
          ) : isError ? (
            <div className="py-16 text-center">
              <div className="flex flex-col items-center justify-center gap-2 text-[var(--color-danger)]">
                <AlertTriangle size={32} />
                <span className="font-semibold">Failed to load notifications</span>
                <p className="text-sm">{error.message}</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-[var(--color-text-muted)]">
              {filter === "unread"
                ? "You have no unread notifications."
                : filter === "read"
                ? "You have no read notifications."
                : "You have no notifications."}
            </div>
          ) : (
            notifications.map((notification) => {
              const { Icon, color, bgColor } = getSeverityProps(notification.severity);
              const isMarkingThis =
                markAsReadMutation.isPending &&
                markAsReadMutation.variables === notification.id;

              return (
                <div
                  key={notification.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 rounded-[var(--radius-md)] border p-4 transition-all ${
                    notification.isRead
                      ? "border-[var(--color-border)]/60 bg-[var(--color-surface-muted)]/40 opacity-85 hover:opacity-100"
                      : "border-l-4 border-l-[var(--color-primary)] border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bgColor} ${color} mt-0.5 sm:mt-0`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-[var(--color-primary)] shrink-0" title="Unread" />
                        )}
                        <p
                          className={`text-sm ${
                            notification.isRead
                              ? "font-medium text-[var(--color-text-secondary)]"
                              : "font-bold text-[var(--color-text-primary)]"
                          }`}
                        >
                          {notification.message}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {format(parseISO(notification.createdAt), "MMM d, yyyy, h:mm a")}
                      </p>
                    </div>
                  </div>

                  {/* Read / Mark As Read Status Action */}
                  <div className="self-end sm:self-center shrink-0">
                    {!notification.isRead ? (
                      <button
                        type="button"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={isMarkingThis}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-tint)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white color-transition shadow-2xs cursor-pointer disabled:opacity-50"
                        title="Mark this notification as read"
                      >
                        {isMarkingThis ? (
                          <LoaderCircle size={13} className="animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                        <span>Mark as read</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <CheckCheck size={13} />
                        <span>Read</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-muted)]">
              Page {pagination.currentPage} of {pagination.totalPages}
              {isFetching && !isLoading && (
                <LoaderCircle className="ml-2 inline animate-spin" size={14} />
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;