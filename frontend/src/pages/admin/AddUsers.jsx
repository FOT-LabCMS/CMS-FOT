import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  IdCard,
  Info,
  Loader2,
  Lock,
  Mail,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserPlus,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import api from "../../api/axiosInstance";

const INITIAL_FORM = {
  institutionalId: "",
  fullName: "",
  email: "",
  password: "",
  role: "",
};

const ROLE_OPTIONS = ["LECTURER", "TECHNICAL_OFFICER", "ADMIN", "COMMON"];

const InputLabel = ({ children, required = false, description, htmlFor }) => (
  <div className="mb-2">
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)]"
    >
      {children}
      {required && (
        <span className="text-[var(--color-danger)]" aria-hidden="true">
          *
        </span>
      )}
    </label>
    {description && (
      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
        {description}
      </p>
    )}
  </div>
);

const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="mb-6 flex items-start gap-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
      <Icon size={21} strokeWidth={2.1} />
    </div>
    <div>
      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
        {description}
      </p>
    </div>
  </div>
);

const ErrorMessage = ({ message }) => {
  if (!message) return null;
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--color-danger)]">
      <AlertTriangle size={14} />
      {message}
    </p>
  );
};

const AddUsers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  const handleChange = (field) => (e) => {
    let value = e.target.value;
    if (field === "institutionalId") value = value.toUpperCase();

    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setSubmitMessage(null);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.institutionalId.trim()) {
      nextErrors.institutionalId = "Institutional ID is required.";
    } else if (!/^(R\d{6}|COM\d{4})$/.test(form.institutionalId)) {
      nextErrors.institutionalId = "Format must be R123456 or COM1234.";
    }

    if (!form.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email address is required.";
    }

    if (!form.role) {
      nextErrors.role = "Select a role for this user.";
    }

    if (!form.password.trim()) {
      nextErrors.password = "A temporary password is required.";
    } else if (form.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      setSubmitMessage({
        type: "error",
        text: "Please correct the highlighted fields before saving.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitMessage(null);

      const response = await api.post("/users/register", { ...form });

      if (!response.data?.success && response.status !== 201) {
        throw new Error(response.data?.message || "Unable to create user.");
      }

      setSubmitMessage({
        type: "success",
        text: "User created successfully! Redirecting shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] });

      setTimeout(() => {
        navigate("/admin/users/view");
      }, 1500);
    } catch (error) {
      setSubmitMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Failed to create user.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setSubmitMessage(null);
    setShowPassword(false);
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
                        <UserPlus size={14} />
                        User Management
                      </span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                      Add New User
                    </h1>
                  </div>

                  <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)]">
                      <Info size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-light)]">
                        Required fields
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--color-text-inverse)]">
                        Fields marked with * are mandatory
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                {/* Account details section */}
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
                  <SectionHeader
                    icon={User}
                    title="Account details"
                    description="Basic identity and contact information for this user."
                  />

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <InputLabel
                        htmlFor="institutionalId"
                        required
                        description="Unique staff/student ID, format R123456."
                      >
                        Institutional ID
                      </InputLabel>
                      <div className="relative">
                        <IdCard
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                        />
                        <input
                          id="institutionalId"
                          type="text"
                          value={form.institutionalId}
                          onChange={handleChange("institutionalId")}
                          placeholder="e.g. R123456"
                          autoComplete="off"
                          className={`w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] py-3 pl-10 pr-4 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition ${
                            errors.institutionalId
                              ? "border-[var(--color-danger)]"
                              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                          }`}
                        />
                      </div>
                      <ErrorMessage message={errors.institutionalId} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="fullName"
                        required
                        description="Displayed across the system and reports."
                      >
                        Full name
                      </InputLabel>
                      <div className="relative">
                        <User
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                        />
                        <input
                          id="fullName"
                          type="text"
                          value={form.fullName}
                          onChange={handleChange("fullName")}
                          placeholder="e.g. John Smith"
                          autoComplete="off"
                          className={`w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] py-3 pl-10 pr-4 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition ${
                            errors.fullName
                              ? "border-[var(--color-danger)]"
                              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                          }`}
                        />
                      </div>
                      <ErrorMessage message={errors.fullName} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="email"
                        required
                        description="Used for notifications and password recovery."
                      >
                        Email address
                      </InputLabel>
                      <div className="relative">
                        <Mail
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                        />
                        <input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange("email")}
                          placeholder="john.smith@example.com"
                          autoComplete="off"
                          className={`w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] py-3 pl-10 pr-4 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition ${
                            errors.email
                              ? "border-[var(--color-danger)]"
                              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                          }`}
                        />
                      </div>
                      <ErrorMessage message={errors.email} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="role"
                        required
                        description="Determines what this account can access."
                      >
                        Role
                      </InputLabel>
                      <div className="relative">
                        <ShieldCheck
                          size={18}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                        />
                        <select
                          id="role"
                          value={form.role}
                          onChange={handleChange("role")}
                          className={`w-full appearance-none rounded-[var(--radius-md)] border bg-[var(--color-surface)] py-3 pl-10 pr-10 text-sm font-medium text-[var(--color-text-primary)] color-transition ${
                            errors.role
                              ? "border-[var(--color-danger)]"
                              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                          }`}
                        >
                          <option value="" disabled>
                            Select role
                          </option>
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r
                                .toLowerCase()
                                .split("_")
                                .map(
                                  (w) => w.charAt(0).toUpperCase() + w.slice(1),
                                )
                                .join(" ")}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={18}
                          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                        />
                      </div>
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-accent-dark)] bg-amber-50/70 dark:bg-amber-950/15 px-2 py-1 rounded border border-amber-200/50 text-[11px]">
                          <Info size={12} className="shrink-0" />
                          Refer the Access Privileges Guide before select a
                          role.
                        </span>
                      </div>
                      <ErrorMessage message={errors.role} />
                    </div>
                  </div>
                </section>

                {/* Security section */}
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
                  <SectionHeader
                    icon={Lock}
                    title="Security"
                    description="Set a temporary password. The user will be required to change it on first login."
                  />

                  <div className="max-w-md">
                    <InputLabel
                      htmlFor="password"
                      required
                      description="Min 6 characters, include a number and a symbol."
                    >
                      Temporary password
                    </InputLabel>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                      />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange("password")}
                        placeholder="e.g. Password@123"
                        autoComplete="new-password"
                        className={`w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] py-3 pl-10 pr-11 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition ${
                          errors.password
                            ? "border-[var(--color-danger)]"
                            : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                    <ErrorMessage message={errors.password} />
                  </div>
                </section>
              </div>

              {/* Right summary panel */}
              <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                      <User size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                        User preview
                      </h2>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Live form summary
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[var(--radius-md)] bg-[var(--color-primary-dark)] p-4">
                    <span className="inline-flex rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary-dark)]">
                      {form.institutionalId.trim() || "NO ID"}
                    </span>

                    <h3 className="mt-4 text-lg font-bold text-[var(--color-text-inverse)]">
                      {form.fullName.trim() || "Unnamed user"}
                    </h3>

                    <p className="mt-2 text-sm text-[var(--color-text-inverse)] opacity-75">
                      {form.email.trim() || "Email not entered"}
                    </p>
                  </div>

                  <dl className="mt-5 space-y-4">
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                      <dt className="text-sm text-[var(--color-text-secondary)]">
                        Role
                      </dt>
                      <dd className="text-sm font-bold text-[var(--color-text-primary)]">
                        {form.role || "—"}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-sm text-[var(--color-text-secondary)]">
                        Password set
                      </dt>
                      <dd className="text-sm font-bold text-[var(--color-text-primary)]">
                        {form.password ? "Yes" : "—"}
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Access Privileges Guide */}
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
                  <div className="mb-4 flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                      <ShieldCheck size={18} className="stroke-[2.25]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                        Access Privileges Guide
                      </h3>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        System access overview for roles
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Admin */}
                    <div className="group flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-emerald-100 bg-emerald-50/20 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-800">
                          <Shield size={13} className="stroke-[2.5] shrink-0" />
                          <span className="text-[11px] font-bold tracking-wide uppercase">
                            Admin
                          </span>
                        </div>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 uppercase tracking-wider">
                          Full Control
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)] font-medium">
                        All functional privileges. Complete control over user
                        management, inventory audits, and system configuration.
                      </p>
                    </div>

                    {/* Technical Officer */}
                    <div className="group flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-amber-100 bg-amber-50/20 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50/40 hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-800">
                          <Wrench size={13} className="stroke-[2.5] shrink-0" />
                          <span className="text-[11px] font-bold tracking-wide uppercase">
                            Technical Officer
                          </span>
                        </div>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-100/80 text-amber-800 uppercase tracking-wider">
                          Operations
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)] font-medium">
                        Full operational privileges (inventory management,
                        storage updates). Excludes system user account
                        management.
                      </p>
                    </div>

                    {/* Lecturer */}
                    <div className="group flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-slate-200 bg-slate-50/30 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50/60 hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Eye size={13} className="stroke-[2.5] shrink-0" />
                          <span className="text-[11px] font-bold tracking-wide uppercase">
                            Lecturer
                          </span>
                        </div>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                          View Only
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)] font-medium">
                        Restricted to checking chemical availability and stock
                        quantities. No other system permissions.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
                  <div className="flex items-start gap-3">
                    <ShieldAlert
                      size={21}
                      className="mt-0.5 shrink-0 text-[var(--color-warning)]"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                        Account only
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                        Department, storage permissions, and other access
                        settings should be managed separately after the user
                        account is created.
                      </p>
                    </div>
                  </div>
                </section>
              </aside>
            </div>

            {/* Submit message */}
            {submitMessage && (
              <div
                role="alert"
                className={`mt-6 flex items-start gap-3 rounded-[var(--radius-md)] border p-4 ${
                  submitMessage.type === "success"
                    ? "border-[var(--color-success)] bg-[var(--color-primary-tint)]"
                    : "border-[var(--color-danger)] bg-[var(--color-surface)]"
                }`}
              >
                {submitMessage.type === "success" ? (
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-[var(--color-success)]"
                  />
                ) : (
                  <AlertTriangle
                    size={20}
                    className="mt-0.5 shrink-0 text-[var(--color-danger)]"
                  />
                )}
                <p
                  className={`text-sm font-semibold ${
                    submitMessage.type === "success"
                      ? "text-[var(--color-success)]"
                      : "text-[var(--color-danger)]"
                  }`}
                >
                  {submitMessage.text}
                </p>
              </div>
            )}

            {/* Bottom actions */}
            <div className="mt-6 flex flex-col-reverse gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleReset}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold text-[var(--color-text-secondary)] color-transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw size={18} />
                Reset form
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold text-[var(--color-text-primary)] color-transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating user...
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Add user
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AddUsers;
