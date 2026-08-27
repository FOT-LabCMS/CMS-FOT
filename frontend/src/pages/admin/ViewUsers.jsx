import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  IdCard,
  Loader2,
  Mail,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundX,
  Users,
  X,
  XCircle,
  Key,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import appConfig from "../../config/appConfig";

const ROLE_FILTERS = ["ALL", "LECTURER", "TECHNICAL_OFFICER", "ADMIN"];

const formatRole = (role) =>
  role
    ?.toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "—";

const formatLastLogin = (value) => {
  if (!value) return "Never logged in";
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const StatusBadge = ({ isActive }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
      isActive
        ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
        : "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
    }`}
  >
    {isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
    {isActive ? "Active" : "Inactive"}
  </span>
);

const RoleBadge = ({ role }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-tint)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)]">
    <ShieldCheck size={13} />
    {formatRole(role)}
  </span>
);

const ViewUsers = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setLoadError("");
        const response = await api.get("/users/viewusers");
        setUsers(response.data?.users || response.data || []);
      } catch (error) {
        setLoadError(
          error.response?.data?.error ||
            error.response?.data?.message ||
            "Unable to load users. Please try again.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        user.fullName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.institutionalId?.toLowerCase().includes(term);
      return matchesRole && matchesSearch;
    });
  }, [users, searchTerm, roleFilter]);

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    if (!adminPassword.trim()) {
      setDeleteError("Please enter your password to confirm.");
      return;
    }
    try {
      setIsDeleting(true);
      setDeleteError("");
      await api.delete(`/users/deleteuser/${userToDelete.id}`, {
        data: { password: adminPassword },
      });
      const response = await api.get("/users/viewusers");
      setUsers(response.data?.users || response.data || []);
      setUserToDelete(null);
      setAdminPassword("");
    } catch (error) {
      setDeleteError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to delete user. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">
          {/* Page header */}
          <header className="mb-6 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[var(--color-primary-light)] opacity-30" />
              <div className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-[var(--color-accent)] opacity-10" />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="mb-5 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
                >
                  <ArrowLeft size={17} />
                  Back
                </button>

                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                        <Users size={14} />
                        User Management
                      </span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                      System Users
                    </h1>
                  </div>

                  <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)]">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-light)]">
                        Total accounts
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--color-text-inverse)]">
                        {isLoading ? "—" : users.length} user
                        {users.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Toolbar */}
          <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or institutional ID..."
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="relative sm:w-56">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full appearance-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-4 pr-10 text-sm font-medium text-[var(--color-text-primary)] color-transition focus:border-[var(--color-primary)]"
                >
                  {ROLE_FILTERS.map((r) => (
                    <option key={r} value={r}>
                      {r === "ALL" ? "All roles" : formatRole(r)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
              </div>
            </div>
          </section>

          {/* Load error */}
          {loadError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-surface)] p-4"
            >
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-[var(--color-danger)]"
              />
              <p className="text-sm font-semibold text-[var(--color-danger)]">
                {loadError}
              </p>
            </div>
          )}

          {/* Loading state */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-16 shadow-[var(--shadow-sm)]">
              <Loader2
                size={28}
                className="animate-spin text-[var(--color-primary)]"
              />
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                Loading users...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-16 text-center">
              <UserRoundX
                size={32}
                className="text-[var(--color-text-muted)]"
              />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                No users found
              </p>
              <p className="max-w-sm text-xs text-[var(--color-text-muted)]">
                Try adjusting your search or role filter, or add a new user to
                get started.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <section className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
                        Institutional ID
                      </th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
                        Full name
                      </th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
                        Email
                      </th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
                        Role
                      </th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
                        Status
                      </th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
                        Last login
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="color-transition hover:bg-[var(--color-surface-muted)]"
                      >
                        <td className="px-5 py-4 text-sm font-bold text-[var(--color-primary)]">
                          {user.institutionalId}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-[var(--color-text-primary)]">
                          {user.fullName}
                        </td>
                        <td className="px-5 py-4 text-sm text-[var(--color-text-secondary)]">
                          {user.email}
                        </td>
                        <td className="px-5 py-4">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge isActive={user.isActive} />
                        </td>
                        <td className="px-5 py-4 text-sm text-[var(--color-text-secondary)]">
                          {formatLastLogin(user.lastLoginAt)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setUserToDelete(user)}
                            aria-label={`Delete ${user.fullName}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-danger)] color-transition hover:border-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* Mobile cards */}
              <section className="space-y-3 md:hidden">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                          {user.fullName}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
                          <IdCard size={13} />
                          {user.institutionalId}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUserToDelete(user)}
                        aria-label={`Delete ${user.fullName}`}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-danger)] color-transition hover:border-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                      <Mail
                        size={13}
                        className="shrink-0 text-[var(--color-text-muted)]"
                      />
                      <span className="truncate">{user.email}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <RoleBadge role={user.role} />
                      <StatusBadge isActive={user.isActive} />
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                      <Clock size={13} />
                      {formatLastLogin(user.lastLoginAt)}
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}
        </div>
      </main>

      {/* Delete confirmation modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-[var(--color-primary-dark)]/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setUserToDelete(null)}
          />

          <div className="relative w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)]">
            <button
              type="button"
              onClick={() => {
                if (!isDeleting) {
                  setUserToDelete(null);
                  setAdminPassword("");
                  setDeleteError("");
                }
              }}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] color-transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
            >
              <X size={16} />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
              <Trash2 size={22} />
            </div>

            <h3 className="mt-4 text-lg font-bold text-[var(--color-text-primary)]">
              Delete this user?
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[var(--color-text-primary)]">
                {userToDelete.fullName}
              </span>{" "}
              ({userToDelete.institutionalId}) will lose access to {appConfig.appName}
              immediately. This action cannot be undone.
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-primary)]">
                Confirm your password
              </label>
              <div className="relative">
                <Key
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (deleteError) setDeleteError("");
                  }}
                  placeholder="Enter your password"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {deleteError && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[var(--color-danger)]">
                <AlertTriangle size={14} />
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setUserToDelete(null);
                  setAdminPassword("");
                  setDeleteError("");
                }}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] color-transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-danger)] px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-sm)] color-transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete user
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewUsers;
