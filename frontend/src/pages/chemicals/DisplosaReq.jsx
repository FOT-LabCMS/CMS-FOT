import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Beaker,
  Boxes,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  History,
  Info,
  Loader2,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";

const INITIAL_FORM = {
  binCardNumber: "",
  batchNumber: "",
  dateReleased: "",
  purpose: "",
  stuRegisterNum: "",
  userName: "",
  supervisorName: "",
  remark: "",
};

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

const SearchableSelect = ({
  icon: Icon,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  loading,
  error,
  emptyText = "No results found.",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((o) =>
    `${o.label} ${o.sublabel || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center gap-2 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-4 py-3 text-left text-sm font-medium color-transition disabled:cursor-not-allowed disabled:opacity-60 ${
          error
            ? "border-[var(--color-danger)]"
            : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
        }`}
      >
        <Icon size={18} className="shrink-0 text-[var(--color-text-muted)]" />
        <span
          className={`min-w-0 flex-1 truncate ${
            selectedOption
              ? "text-[var(--color-text-primary)]"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          {loading
            ? "Loading..."
            : selectedOption
              ? selectedOption.label
              : placeholder}
        </span>
        {loading ? (
          <Loader2
            size={16}
            className="shrink-0 animate-spin text-[var(--color-text-muted)]"
          />
        ) : (
          <ChevronDown
            size={16}
            className="shrink-0 text-[var(--color-text-muted)]"
          />
        )}
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
          <div className="relative border-b border-[var(--color-border)] p-2">
            <Search
              size={15}
              className="absolute left-4.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search..."
              className="w-full rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] py-2 pl-8 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                {emptyText}
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm color-transition hover:bg-[var(--color-primary-tint)] ${
                    option.value === value
                      ? "bg-[var(--color-primary-tint)] font-semibold text-[var(--color-primary)]"
                      : "text-[var(--color-text-primary)]"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.sublabel && (
                    <span className="truncate text-xs text-[var(--color-text-muted)]">
                      {option.sublabel}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
const DisplosaReq = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  const [chemicalOptions, setChemicalOptions] = useState([]);
  const [isFormDataLoading, setIsFormDataLoading] = useState(true);
  const [formDataError, setFormDataError] = useState("");

  const [batchOptions, setBatchOptions] = useState([]);
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        setIsFormDataLoading(true);
        setFormDataError("");
        const response = await api.get("/dispose/getformdata");
        const data = response.data;

        setChemicalOptions(
          (data.chemicals || []).map((c) => ({
            value: c.binCardNumber,
            label: c.canonicalName,
            sublabel: c.binCardNumber,
          })),
        );
      } catch (error) {
        setFormDataError(
          error.response?.data?.error ||
            error.response?.data?.message ||
            "Unable to load form data. Please refresh.",
        );
      } finally {
        setIsFormDataLoading(false);
      }
    };

    fetchFormData();
  }, []);

  useEffect(() => {
    if (!form.binCardNumber) {
      setBatchOptions([]);
      return;
    }

    const fetchBatches = async () => {
      try {
        setIsBatchLoading(true);
        const response = await api.get(
          `/dispose/getbatchbybinCardNumber/${encodeURIComponent(form.binCardNumber)}`,
        );
        const data = response.data;

        // Sort batches: earliest expiry date first (soonest to expire).
        // Batches without an expiry date are pushed to the end.
        const sortedBatches = [...(data.batches || [])].sort((a, b) => {
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate) - new Date(b.expiryDate);
        });

        setBatchOptions(
          sortedBatches.map((b) => ({
            value: b.batchNumber,
            label: b.batchNumber,
            sublabel: (() => {
              const qty = parseFloat(b.currentQuantity);
              const unit = b.chemical?.baseUnit ?? "";
              const formatted = qty % 1 === 0 ? `${qty.toFixed(0)}` : `${qty}`;
              return `${formatted}${unit ? ` ${unit}` : ""} available${b.expiryDate ? ` · Expires ${b.expiryDate}` : ""}`;
            })(),
          })),
        );
      } catch (error) {
        setBatchOptions([]);
        setErrors((prev) => ({
          ...prev,
          batchNumber: "Unable to load batches for this chemical.",
        }));
      } finally {
        setIsBatchLoading(false);
      }
    };

    fetchBatches();
  }, [form.binCardNumber]);

  const handleChemicalChange = (value) => {
    setForm((prev) => ({ ...prev, binCardNumber: value, batchNumber: "" }));
    setErrors((prev) => ({ ...prev, binCardNumber: "", batchNumber: "" }));
    setSubmitMessage(null);
  };

  const handleBatchChange = (value) => {
    setForm((prev) => ({ ...prev, batchNumber: value }));
    setErrors((prev) => ({ ...prev, batchNumber: "" }));
    setSubmitMessage(null);
  };

  const handleFieldChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setSubmitMessage(null);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.binCardNumber) nextErrors.binCardNumber = "Select a chemical.";
    if (!form.batchNumber) nextErrors.batchNumber = "Select a batch number.";
    if (!form.dateReleased)
      nextErrors.dateReleased = "Release date is required.";
    if (!form.purpose.trim())
      nextErrors.purpose = "Purpose of release is required.";
    if (!form.stuRegisterNum.trim())
      nextErrors.stuRegisterNum = "Student registration number is required.";
    if (!form.userName.trim()) nextErrors.userName = "User name is required.";
    if (!form.supervisorName.trim())
      nextErrors.supervisorName = "Supervisor name is required.";

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

      const response = await api.post("/dispose/createreleaserecord", {
        ...form,
      });

      if (response.data?.success === false) {
        throw new Error(
          response.data?.message || "Unable to create release record.",
        );
      }

      setSubmitMessage({
        type: "success",
        text: "Release record created successfully!",
      });
    } catch (error) {
      setSubmitMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Failed to create release record.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setSubmitMessage(null);
    setBatchOptions([]);
  };

  const selectedChemicalLabel =
    chemicalOptions.find((c) => c.value === form.binCardNumber)?.label ||
    "No chemical selected";
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
                <div className="mb-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
                  >
                    <ArrowLeft size={17} />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/reports/usage")}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-accent-light)]"
                  >
                    <History size={15} />
                    Release History
                  </button>
                </div>

                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                        <Boxes size={14} />
                        Release Records
                      </span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                      Create Release Record
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

          {formDataError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-surface)] p-4"
            >
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-[var(--color-danger)]"
              />
              <p className="text-sm font-semibold text-[var(--color-danger)]">
                {formDataError}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                {/* Chemical & batch section */}
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
                  <SectionHeader
                    icon={Beaker}
                    title="Chemical & batch"
                    description="Select which chemical and batch are being released."
                  />

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <InputLabel
                        htmlFor="binCardNumber"
                        required
                        description="Loaded from the chemical inventory."
                      >
                        Chemical
                      </InputLabel>
                      <SearchableSelect
                        icon={Beaker}
                        options={chemicalOptions}
                        value={form.binCardNumber}
                        onChange={handleChemicalChange}
                        placeholder="Select a chemical"
                        loading={isFormDataLoading}
                        error={errors.binCardNumber}
                        emptyText="No chemicals found."
                      />
                      <ErrorMessage message={errors.binCardNumber} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="batchNumber"
                        required
                        description={
                          form.binCardNumber
                            ? "Batch numbers available for the selected chemical."
                            : "Select a chemical first."
                        }
                      >
                        Batch Number
                      </InputLabel>
                      <SearchableSelect
                        icon={Boxes}
                        options={batchOptions}
                        value={form.batchNumber}
                        onChange={handleBatchChange}
                        placeholder="Select a batch number"
                        disabled={!form.binCardNumber}
                        loading={isBatchLoading}
                        error={errors.batchNumber}
                        emptyText="No batches available for this chemical."
                      />
                      <ErrorMessage message={errors.batchNumber} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="dateReleased"
                        required
                        description="Date the chemical leaves storage."
                      >
                        Date released
                      </InputLabel>
                      <div className="relative">
                        <Calendar
                          size={18}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                        />
                        <input
                          id="dateReleased"
                          type="date"
                          value={form.dateReleased}
                          onChange={handleFieldChange("dateReleased")}
                          className={`w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] py-3 pl-10 pr-4 text-sm font-medium text-[var(--color-text-primary)] color-transition ${
                            errors.dateReleased
                              ? "border-[var(--color-danger)]"
                              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                          }`}
                        />
                      </div>
                      <ErrorMessage message={errors.dateReleased} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="stuRegisterNum"
                        required
                        description="The registration number of the student this release is issued to."
                      >
                        Student Registration Number
                      </InputLabel>
                      <div className="relative">
                        <User
                          size={18}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                        />
                        <input
                          id="stuRegisterNum  "
                          type="text"
                          value={form.stuRegisterNum}
                          onChange={handleFieldChange("stuRegisterNum")}
                          placeholder="Enter student registration number"
                          className={`w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] py-3 pl-10 pr-4 text-sm font-medium text-[var(--color-text-primary)] color-transition placeholder:text-[var(--color-text-muted)] ${
                            errors.stuRegisterNum
                              ? "border-[var(--color-danger)]"
                              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                          }`}
                        />
                      </div>
                      <ErrorMessage message={errors.stuRegisterNum} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="userName"
                        required
                        description="The name of the student."
                      >
                        User Name
                      </InputLabel>
                      <div className="relative">
                        <User
                          size={18}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                        />
                        <input
                          id="userName"
                          type="text"
                          value={form.userName}
                          onChange={handleFieldChange("userName")}
                          placeholder="Enter user name"
                          className={`w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] py-3 pl-10 pr-4 text-sm font-medium text-[var(--color-text-primary)] color-transition placeholder:text-[var(--color-text-muted)] ${
                            errors.userName
                              ? "border-[var(--color-danger)]"
                              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                          }`}
                        />
                      </div>
                      <ErrorMessage message={errors.userName} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="supervisorName"
                        required
                        description="The name of the supervisor authorising this release."
                      >
                        Supervisor Name
                      </InputLabel>
                      <div className="relative">
                        <User
                          size={18}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                        />
                        <input
                          id="supervisorName"
                          type="text"
                          value={form.supervisorName}
                          onChange={handleFieldChange("supervisorName")}
                          placeholder="Enter supervisor name"
                          className={`w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] py-3 pl-10 pr-4 text-sm font-medium text-[var(--color-text-primary)] color-transition placeholder:text-[var(--color-text-muted)] ${
                            errors.supervisorName
                              ? "border-[var(--color-danger)]"
                              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                          }`}
                        />
                      </div>
                      <ErrorMessage message={errors.supervisorName} />
                    </div>
                  </div>
                </section>

                {/* Release details section */}
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
                  <SectionHeader
                    icon={ClipboardList}
                    title="Release details"
                    description="Reason for the release and any additional notes."
                  />

                  <div className="space-y-5">
                    <div>
                      <InputLabel
                        htmlFor="purpose"
                        required
                        description="What the chemical will be used for."
                      >
                        Purpose
                      </InputLabel>
                      <textarea
                        id="purpose"
                        rows={3}
                        value={form.purpose}
                        onChange={handleFieldChange("purpose")}
                        placeholder="e.g. Titration practical for CHEM 2103"
                        className={`w-full resize-y rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-4 py-3 text-sm leading-6 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition ${
                          errors.purpose
                            ? "border-[var(--color-danger)]"
                            : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                        }`}
                      />
                      <ErrorMessage message={errors.purpose} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="remark"
                        description="Optional notes for the audit trail."
                      >
                        Remark
                      </InputLabel>
                      <div className="relative">
                        <FileText
                          size={18}
                          className="pointer-events-none absolute left-3.5 top-3.5 text-[var(--color-text-muted)]"
                        />
                        <textarea
                          id="remark"
                          rows={2}
                          value={form.remark}
                          onChange={handleFieldChange("remark")}
                          placeholder="Optional"
                          className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-4 text-sm leading-6 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)]"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right summary panel */}
              <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                      <ClipboardList size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                        Release preview
                      </h2>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Live form summary
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[var(--radius-md)] bg-[var(--color-primary-dark)] p-4">
                    <span className="inline-flex rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary-dark)]">
                      {form.batchNumber || "NO BATCH"}
                    </span>

                    <h3 className="mt-4 text-lg font-bold text-[var(--color-text-inverse)]">
                      {selectedChemicalLabel}
                    </h3>

                    <p className="mt-2 text-sm text-[var(--color-text-inverse)] opacity-75">
                      {form.userName || "Requester not selected"}
                    </p>
                  </div>

                  <dl className="mt-5 space-y-4">
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                      <dt className="text-sm text-[var(--color-text-secondary)]">
                        Date released
                      </dt>
                      <dd className="text-sm font-bold text-[var(--color-text-primary)]">
                        {form.dateReleased || "—"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-sm text-[var(--color-text-secondary)]">
                        Purpose
                      </dt>
                      <dd className="max-w-[55%] truncate text-right text-sm font-bold text-[var(--color-text-primary)]">
                        {form.purpose.trim() || "—"}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
                  <div className="flex items-start gap-3">
                    <ShieldAlert
                      size={21}
                      className="mt-0.5 shrink-0 text-[var(--color-warning)]"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                        Staff only
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                        This page is only accessible to technical officers and
                        admins. Students never see or fill this form directly —
                        it records releases against their requests.
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
                      Saving record...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Create release record
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

export default DisplosaReq;
