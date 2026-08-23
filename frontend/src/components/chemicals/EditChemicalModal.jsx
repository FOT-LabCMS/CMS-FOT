import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Beaker,
  CheckCircle2,
  ChevronDown,
  FileText,
  FlaskConical,
  Info,
  Loader2,
  Paperclip,
  Plus,
  Save,
  ShieldAlert,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import api from "../../api/axiosInstance";

const STOCK_DIMENSION_OPTIONS = [
  {
    value: "MASS",
    label: "Mass",
    suggestedUnit: "g",
  },
  {
    value: "VOLUME",
    label: "Volume",
    suggestedUnit: "mL",
  },
  {
    value: "COUNT",
    label: "Count",
    suggestedUnit: "unit",
  },
];

const PHYSICAL_STATE_OPTIONS = [
  { value: "SOLID", label: "Solid" },
  { value: "LIQUID", label: "Liquid" },
  { value: "GAS", label: "Gas" },
  { value: "OTHER", label: "Other" },
];

const HAZARD_CATEGORY_OPTIONS = [
  { value: "NONE", label: "None / Not classified" },
  { value: "FLAMMABLE", label: "Flammable" },
  { value: "CORROSIVE", label: "Corrosive" },
  { value: "TOXIC", label: "Toxic" },
  { value: "OXIDIZER", label: "Oxidizer" },
  { value: "EXPLOSIVE", label: "Explosive" },
  { value: "IRRITANT", label: "Irritant" },
  { value: "ENVIRONMENTAL", label: "Environmental hazard" },
  { value: "COMPRESSED_GAS", label: "Compressed gas" },
  { value: "HEALTH_HAZARD", label: "Health hazard" },
  { value: "OTHER", label: "Other hazard" },
];

const BASE_UNIT_OPTIONS = {
  MASS: ["mg", "g", "kg"],
  VOLUME: ["µL", "mL", "L"],
  COUNT: ["unit"],
};

const DENSITY_UNIT_OPTIONS = [
  "g/cm³",
  "g/mL",
  "kg/L",
  "kg/m³",
];

const InputLabel = ({
  children,
  required = false,
  description,
  htmlFor,
}) => (
  <div className="mb-2">
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)]"
    >
      {children}

      {required && (
        <span className="text-[var(--color-danger)]">*</span>
      )}
    </label>

    {description && (
      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
        {description}
      </p>
    )}
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

const SectionTitle = ({ icon: Icon, title, description }) => (
  <div className="mb-5 flex items-start gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
      <Icon size={19} />
    </div>

    <div>
      <h3 className="text-base font-bold text-[var(--color-text-primary)]">
        {title}
      </h3>

      {description && (
        <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
          {description}
        </p>
      )}
    </div>
  </div>
);

const commonInputClass = `
  w-full
  rounded-[var(--radius-md)]
  border border-[var(--color-border)]
  bg-[var(--color-surface)]
  px-4 py-3
  text-sm font-medium
  text-[var(--color-text-primary)]
  placeholder:text-[var(--color-text-muted)]
  color-transition
  focus:border-[var(--color-primary)]
`;

const EditChemicalModal = ({
  chemical,
  onClose,
  onSuccess,
}) => {
  const modalRef = useRef(null);

  const [formData, setFormData] = useState({
    chemicalCode: "",
    canonicalName: "",
    stockDimension: "VOLUME",
    baseUnit: "mL",
    casNumber: "",
    formula: "",
    physicalState: "LIQUID",
    hazardCategory: "NONE",
    synonyms: [""],
    densityValue: "",
    densityUnit: "g/cm³",
    safetySummary: "",
    sdsRevisionDate: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);
  const [sdsFile, setSdsFile] = useState(null);

  useEffect(() => {
    if (!chemical) return;

    setFormData({
      chemicalCode: chemical.chemicalCode || "",
      canonicalName: chemical.canonicalName || "",
      stockDimension:
        chemical.stockDimension || "VOLUME",
      baseUnit: chemical.baseUnit || "mL",
      casNumber: chemical.casNumber || "",
      formula: chemical.formula || "",
      physicalState:
        chemical.physicalState || "LIQUID",
      hazardCategory:
        chemical.hazardCategory || "NONE",
      synonyms:
        Array.isArray(chemical.synonyms) &&
        chemical.synonyms.length > 0
          ? chemical.synonyms
          : [""],
      densityValue: chemical.densityValue ?? "",
      densityUnit:
        chemical.densityUnit || "g/cm³",
      safetySummary:
        chemical.safetySummary || "",
      sdsRevisionDate:
        chemical.sdsRevisionDate || "",
    });

    setErrors({});
    setSubmitMessage(null);
    setSdsFile(null);
  }, [chemical]);

  useEffect(() => {
    if (!chemical) return undefined;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [chemical, isSubmitting, onClose]);

  const availableBaseUnits = useMemo(
    () =>
      BASE_UNIT_OPTIONS[
        formData.stockDimension
      ] || BASE_UNIT_OPTIONS.VOLUME,
    [formData.stockDimension]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setSubmitMessage(null);
  };

  const handleStockDimensionChange = (event) => {
    const selectedDimension = event.target.value;

    const selectedOption =
      STOCK_DIMENSION_OPTIONS.find(
        (option) =>
          option.value === selectedDimension
      );

    setFormData((previous) => ({
      ...previous,
      stockDimension: selectedDimension,
      baseUnit:
        selectedOption?.suggestedUnit || "",
    }));

    setErrors((previous) => ({
      ...previous,
      stockDimension: "",
      baseUnit: "",
    }));
  };

  const handleSynonymChange = (index, value) => {
    setFormData((previous) => {
      const updatedSynonyms = [
        ...previous.synonyms,
      ];

      updatedSynonyms[index] = value;

      return {
        ...previous,
        synonyms: updatedSynonyms,
      };
    });
  };

  const addSynonym = () => {
    setFormData((previous) => ({
      ...previous,
      synonyms: [...previous.synonyms, ""],
    }));
  };

  const removeSynonym = (index) => {
    setFormData((previous) => {
      const updatedSynonyms =
        previous.synonyms.filter(
          (_, synonymIndex) =>
            synonymIndex !== index
        );

      return {
        ...previous,
        synonyms:
          updatedSynonyms.length > 0
            ? updatedSynonyms
            : [""],
      };
    });
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const maximumSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(selectedFile.type)) {
      setErrors((previous) => ({
        ...previous,
        sdsFile:
          "Only PDF, DOC and DOCX files are allowed.",
      }));

      event.target.value = "";
      return;
    }

    if (selectedFile.size > maximumSize) {
      setErrors((previous) => ({
        ...previous,
        sdsFile:
          "The SDS document must not exceed 10 MB.",
      }));

      event.target.value = "";
      return;
    }

    setSdsFile(selectedFile);

    setErrors((previous) => ({
      ...previous,
      sdsFile: "",
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.canonicalName.trim()) {
      nextErrors.canonicalName =
        "Canonical chemical name is required.";
    }

    if (!formData.stockDimension) {
      nextErrors.stockDimension =
        "Stock dimension is required.";
    }

    if (!formData.baseUnit.trim()) {
      nextErrors.baseUnit =
        "Base unit is required.";
    }

    if (
      formData.densityValue !== "" &&
      Number(formData.densityValue) < 0
    ) {
      nextErrors.densityValue =
        "Density value cannot be negative.";
    }

    if (
      formData.densityValue !== "" &&
      !formData.densityUnit.trim()
    ) {
      nextErrors.densityUnit =
        "Density unit is required.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    canonicalName:
      formData.canonicalName.trim(),

    stockDimension:
      formData.stockDimension,

    baseUnit: formData.baseUnit.trim(),

    casNumber:
      formData.casNumber.trim() || null,

    formula:
      formData.formula.trim() || null,

    physicalState:
      formData.physicalState || null,

    hazardCategory:
      formData.hazardCategory || "NONE",

    synonyms: formData.synonyms
      .map((synonym) => synonym.trim())
      .filter(Boolean),

    densityValue:
      formData.densityValue === ""
        ? null
        : Number(formData.densityValue),

    densityUnit:
      formData.densityValue === ""
        ? null
        : formData.densityUnit.trim(),

    safetySummary:
      formData.safetySummary.trim() || null,

    sdsRevisionDate:
      formData.sdsRevisionDate || null,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      setSubmitMessage({
        type: "error",
        text: "Please correct the highlighted fields.",
      });

      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitMessage(null);

      const payload = buildPayload();
      let requestBody = payload;
      let requestConfig = {};

      if (sdsFile) {
        const multipartData = new FormData();

        Object.entries(payload).forEach(
          ([key, value]) => {
            if (
              value === null ||
              value === undefined
            ) {
              return;
            }

            if (Array.isArray(value)) {
              multipartData.append(
                key,
                JSON.stringify(value)
              );
            } else {
              multipartData.append(key, value);
            }
          }
        );

        multipartData.append("sdsFile", sdsFile);

        requestBody = multipartData;

        requestConfig = {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        };
      }

      const response = await api.put(
        `/chemicals/${chemical.id}`,
        requestBody,
        requestConfig
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Unable to update chemical."
        );
      }

      setSubmitMessage({
        type: "success",
        text: "Chemical updated successfully.",
      });

      window.setTimeout(() => {
        onSuccess(response.data.chemical);
      }, 600);
    } catch (error) {
      setSubmitMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.message ||
          "Unable to update the chemical.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (event) => {
    if (
      event.target === event.currentTarget &&
      !isSubmitting
    ) {
      onClose();
    }
  };

  if (!chemical) return null;

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        overflow-hidden
        bg-[var(--color-primary-dark)]/70
        p-3 backdrop-blur-sm
        sm:p-6
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-chemical-title"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="
          flex max-h-[calc(100dvh-24px)] w-full
          max-w-4xl flex-col
          overflow-hidden
          rounded-[var(--radius-lg)]
          border border-[var(--color-border)]
          bg-[var(--color-surface)]
          shadow-[var(--shadow-lg)]
          sm:max-h-[calc(100dvh-48px)]
        "
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        {/* Header */}
        <header
          className="
            flex shrink-0 items-center justify-between
            border-b border-[var(--color-border)]
            bg-[var(--color-surface)]
            px-4 py-4
            sm:px-6
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-[var(--radius-md)]
                bg-[var(--color-primary)]
                text-[var(--color-accent-light)]
              "
            >
              <Beaker size={22} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="edit-chemical-title"
                  className="
                    truncate text-lg font-bold
                    text-[var(--color-text-primary)]
                    sm:text-xl
                  "
                >
                  Edit Chemical
                </h2>

                <span
                  className="
                    rounded-full
                    bg-[var(--color-primary-tint)]
                    px-2.5 py-1
                    text-[10px] font-bold uppercase
                    tracking-wide
                    text-[var(--color-primary)]
                  "
                >
                  {formData.chemicalCode}
                </span>
              </div>

              <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)] sm:text-sm">
                Update chemical master information
                and its current SDS document.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close edit chemical modal"
            className="
              ml-3 flex h-10 w-10 shrink-0
              items-center justify-center
              rounded-full
              text-[var(--color-text-muted)]
              color-transition
              hover:bg-[var(--color-surface-muted)]
              hover:text-[var(--color-danger)]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <X size={21} />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-bg)] px-4 py-5 sm:px-6 sm:py-6">
            <div className="space-y-5">
              {/* Identity */}
              <section
                className="
                  rounded-[var(--radius-lg)]
                  border border-[var(--color-border)]
                  bg-[var(--color-surface)]
                  p-4 shadow-[var(--shadow-sm)]
                  sm:p-5
                "
              >
                <SectionTitle
                  icon={FlaskConical}
                  title="Chemical identity"
                  description="Update the standard identifying information."
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <InputLabel htmlFor="chemicalCode">
                      Chemical code
                    </InputLabel>

                    <input
                      id="chemicalCode"
                      value={formData.chemicalCode}
                      disabled
                      className="
                        w-full cursor-not-allowed
                        rounded-[var(--radius-md)]
                        border border-[var(--color-border)]
                        bg-[var(--color-surface-muted)]
                        px-4 py-3
                        text-sm font-semibold
                        text-[var(--color-text-muted)]
                      "
                    />

                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                      The unique chemical code cannot be changed.
                    </p>
                  </div>

                  <div>
                    <InputLabel
                      htmlFor="canonicalName"
                      required
                    >
                      Canonical name
                    </InputLabel>

                    <input
                      id="canonicalName"
                      name="canonicalName"
                      type="text"
                      value={formData.canonicalName}
                      onChange={handleChange}
                      placeholder="e.g. Hydrochloric Acid"
                      className={`
                        ${commonInputClass}
                        ${
                          errors.canonicalName
                            ? "border-[var(--color-danger)]"
                            : ""
                        }
                      `}
                    />

                    <ErrorMessage
                      message={errors.canonicalName}
                    />
                  </div>

                  <div>
                    <InputLabel htmlFor="casNumber">
                      CAS number
                    </InputLabel>

                    <input
                      id="casNumber"
                      name="casNumber"
                      type="text"
                      value={formData.casNumber}
                      onChange={handleChange}
                      placeholder="e.g. 7647-01-0"
                      className={commonInputClass}
                    />
                  </div>

                  <div>
                    <InputLabel htmlFor="formula">
                      Chemical formula
                    </InputLabel>

                    <input
                      id="formula"
                      name="formula"
                      type="text"
                      value={formData.formula}
                      onChange={handleChange}
                      placeholder="e.g. HCl"
                      className={commonInputClass}
                    />
                  </div>

                  <div>
                    <InputLabel htmlFor="physicalState">
                      Physical state
                    </InputLabel>

                    <div className="relative">
                      <select
                        id="physicalState"
                        name="physicalState"
                        value={formData.physicalState}
                        onChange={handleChange}
                        className={`${commonInputClass} appearance-none pr-10`}
                      >
                        {PHYSICAL_STATE_OPTIONS.map(
                          (option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          )
                        )}
                      </select>

                      <ChevronDown
                        size={18}
                        className="
                          pointer-events-none
                          absolute right-3 top-1/2
                          -translate-y-1/2
                          text-[var(--color-text-muted)]
                        "
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <InputLabel
                    description="Alternative names used for searching."
                  >
                    Synonyms
                  </InputLabel>

                  <div className="space-y-3">
                    {formData.synonyms.map(
                      (synonym, index) => (
                        <div
                          key={`${index}-${synonym}`}
                          className="flex items-center gap-2"
                        >
                          <div className="relative flex-1">
                            <Tag
                              size={16}
                              className="
                                absolute left-3 top-1/2
                                -translate-y-1/2
                                text-[var(--color-text-muted)]
                              "
                            />

                            <input
                              type="text"
                              value={synonym}
                              onChange={(event) =>
                                handleSynonymChange(
                                  index,
                                  event.target.value
                                )
                              }
                              placeholder="Enter a synonym"
                              className={`${commonInputClass} pl-10`}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeSynonym(index)
                            }
                            className="
                              flex h-11 w-11 shrink-0
                              items-center justify-center
                              rounded-[var(--radius-md)]
                              border border-[var(--color-border)]
                              text-[var(--color-danger)]
                              color-transition
                              hover:border-[var(--color-danger)]
                              hover:bg-[var(--color-surface-muted)]
                            "
                            aria-label={`Remove synonym ${
                              index + 1
                            }`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={addSynonym}
                    className="
                      mt-3 inline-flex items-center gap-2
                      rounded-[var(--radius-md)]
                      border border-[var(--color-primary)]
                      bg-[var(--color-primary-tint)]
                      px-4 py-2.5
                      text-sm font-semibold
                      text-[var(--color-primary)]
                      color-transition
                      hover:bg-[var(--color-surface-muted)]
                    "
                  >
                    <Plus size={17} />
                    Add synonym
                  </button>
                </div>
              </section>

              {/* Stock measurement */}
              <section
                className="
                  rounded-[var(--radius-lg)]
                  border border-[var(--color-border)]
                  bg-[var(--color-surface)]
                  p-4 shadow-[var(--shadow-sm)]
                  sm:p-5
                "
              >
                <SectionTitle
                  icon={Beaker}
                  title="Stock measurement"
                  description="Configure how this chemical is measured."
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <InputLabel
                      htmlFor="stockDimension"
                      required
                    >
                      Stock dimension
                    </InputLabel>

                    <div className="relative">
                      <select
                        id="stockDimension"
                        name="stockDimension"
                        value={formData.stockDimension}
                        onChange={
                          handleStockDimensionChange
                        }
                        className={`${commonInputClass} appearance-none pr-10`}
                      >
                        {STOCK_DIMENSION_OPTIONS.map(
                          (option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          )
                        )}
                      </select>

                      <ChevronDown
                        size={18}
                        className="
                          pointer-events-none
                          absolute right-3 top-1/2
                          -translate-y-1/2
                          text-[var(--color-text-muted)]
                        "
                      />
                    </div>

                    <ErrorMessage
                      message={errors.stockDimension}
                    />
                  </div>

                  <div>
                    <InputLabel
                      htmlFor="baseUnit"
                      required
                    >
                      Base unit
                    </InputLabel>

                    <div className="relative">
                      <select
                        id="baseUnit"
                        name="baseUnit"
                        value={formData.baseUnit}
                        onChange={handleChange}
                        className={`
                          ${commonInputClass}
                          appearance-none pr-10
                          ${
                            errors.baseUnit
                              ? "border-[var(--color-danger)]"
                              : ""
                          }
                        `}
                      >
                        {availableBaseUnits.map(
                          (unit) => (
                            <option
                              key={unit}
                              value={unit}
                            >
                              {unit}
                            </option>
                          )
                        )}
                      </select>

                      <ChevronDown
                        size={18}
                        className="
                          pointer-events-none
                          absolute right-3 top-1/2
                          -translate-y-1/2
                          text-[var(--color-text-muted)]
                        "
                      />
                    </div>

                    <ErrorMessage
                      message={errors.baseUnit}
                    />
                  </div>

                  <div>
                    <InputLabel htmlFor="densityValue">
                      Density value
                    </InputLabel>

                    <input
                      id="densityValue"
                      name="densityValue"
                      type="number"
                      min="0"
                      step="0.0001"
                      value={formData.densityValue}
                      onChange={handleChange}
                      placeholder="e.g. 1.18"
                      className={`
                        ${commonInputClass}
                        ${
                          errors.densityValue
                            ? "border-[var(--color-danger)]"
                            : ""
                        }
                      `}
                    />

                    <ErrorMessage
                      message={errors.densityValue}
                    />
                  </div>

                  <div>
                    <InputLabel htmlFor="densityUnit">
                      Density unit
                    </InputLabel>

                    <div className="relative">
                      <select
                        id="densityUnit"
                        name="densityUnit"
                        value={formData.densityUnit}
                        onChange={handleChange}
                        disabled={
                          formData.densityValue === ""
                        }
                        className={`
                          ${commonInputClass}
                          appearance-none pr-10
                          disabled:cursor-not-allowed
                          disabled:bg-[var(--color-surface-muted)]
                          disabled:text-[var(--color-text-muted)]
                        `}
                      >
                        {DENSITY_UNIT_OPTIONS.map(
                          (unit) => (
                            <option
                              key={unit}
                              value={unit}
                            >
                              {unit}
                            </option>
                          )
                        )}
                      </select>

                      <ChevronDown
                        size={18}
                        className="
                          pointer-events-none
                          absolute right-3 top-1/2
                          -translate-y-1/2
                          text-[var(--color-text-muted)]
                        "
                      />
                    </div>

                    <ErrorMessage
                      message={errors.densityUnit}
                    />
                  </div>
                </div>
              </section>

              {/* Safety and SDS */}
              <section
                className="
                  rounded-[var(--radius-lg)]
                  border border-[var(--color-border)]
                  bg-[var(--color-surface)]
                  p-4 shadow-[var(--shadow-sm)]
                  sm:p-5
                "
              >
                <SectionTitle
                  icon={ShieldAlert}
                  title="Safety and SDS"
                  description="Update the quick safety summary or replace the current SDS."
                />

                <div className="mb-5">
                  <InputLabel
                    htmlFor="hazardCategory"
                    description="Select the primary hazard category for this chemical."
                  >
                    Hazard category
                  </InputLabel>

                  <div className="relative">
                    <select
                      id="hazardCategory"
                      name="hazardCategory"
                      value={formData.hazardCategory}
                      onChange={handleChange}
                      className={`${commonInputClass} appearance-none pr-10`}
                    >
                      {HAZARD_CATEGORY_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown
                      size={18}
                      className="
                        pointer-events-none
                        absolute right-3 top-1/2
                        -translate-y-1/2
                        text-[var(--color-text-muted)]
                      "
                    />
                  </div>
                </div>

                <div>
                  <InputLabel htmlFor="safetySummary">
                    Safety summary
                  </InputLabel>

                  <textarea
                    id="safetySummary"
                    name="safetySummary"
                    rows={5}
                    value={formData.safetySummary}
                    onChange={handleChange}
                    placeholder="Enter the main safety warnings and handling precautions."
                    className={`${commonInputClass} resize-y leading-6`}
                  />
                </div>

                <div className="mt-5">
                  <div className="mb-5">
                    <InputLabel
                      htmlFor="sdsRevisionDateEdit"
                      description="Use the revision or issue date printed on the SDS document."
                    >
                      SDS revision date
                    </InputLabel>

                    <input
                      id="sdsRevisionDateEdit"
                      name="sdsRevisionDate"
                      type="date"
                      value={formData.sdsRevisionDate}
                      onChange={handleChange}
                      className={commonInputClass}
                    />
                  </div>

                  <InputLabel
                    htmlFor="sdsFileEdit"
                    description="PDF, DOC or DOCX. Maximum file size 10 MB."
                  >
                    Replace SDS document
                  </InputLabel>

                  {chemical.sdsOriginalFilename &&
                    !sdsFile && (
                      <div
                        className="
                          mb-3 flex items-center gap-3
                          rounded-[var(--radius-md)]
                          border border-[var(--color-border)]
                          bg-[var(--color-surface-muted)]
                          p-3
                        "
                      >
                        <FileText
                          size={21}
                          className="shrink-0 text-[var(--color-success)]"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Current SDS
                          </p>

                          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                            {
                              chemical.sdsOriginalFilename
                            }
                          </p>
                        </div>
                      </div>
                    )}

                  {sdsFile ? (
                    <div
                      className="
                        flex items-center gap-3
                        rounded-[var(--radius-md)]
                        border border-[var(--color-primary)]
                        bg-[var(--color-primary-tint)]
                        p-3
                      "
                    >
                      <Paperclip
                        size={21}
                        className="shrink-0 text-[var(--color-primary)]"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                          {sdsFile.name}
                        </p>

                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                          {(
                            sdsFile.size /
                            (1024 * 1024)
                          ).toFixed(2)}{" "}
                          MB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSdsFile(null)}
                        className="
                          flex h-9 w-9 shrink-0
                          items-center justify-center
                          rounded-full
                          text-[var(--color-danger)]
                          color-transition
                          hover:bg-[var(--color-surface)]
                        "
                        aria-label="Remove selected SDS file"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="sdsFileEdit"
                      className={`
                        flex cursor-pointer
                        flex-col items-center justify-center
                        gap-2 rounded-[var(--radius-md)]
                        border-2 border-dashed
                        px-4 py-7 text-center
                        color-transition
                        ${
                          errors.sdsFile
                            ? "border-[var(--color-danger)]"
                            : "border-[var(--color-border-strong)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-tint)]"
                        }
                      `}
                    >
                      <UploadCloud
                        size={30}
                        className="text-[var(--color-primary)]"
                      />

                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                        Select a replacement SDS
                      </span>

                      <span className="text-xs text-[var(--color-text-muted)]">
                        Click to browse your files
                      </span>

                      <input
                        id="sdsFileEdit"
                        name="sdsFile"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                  )}

                  <ErrorMessage
                    message={errors.sdsFile}
                  />
                </div>

                <div
                  className="
                    mt-4 flex items-start gap-2
                    rounded-[var(--radius-md)]
                    bg-[var(--color-surface-muted)]
                    p-3
                  "
                >
                  <Info
                    size={17}
                    className="mt-0.5 shrink-0 text-[var(--color-info)]"
                  />

                  <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
                    Replacing the SDS updates the current
                    document associated with this chemical.
                  </p>
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}
          <footer
            className="
              shrink-0
              border-t border-[var(--color-border)]
              bg-[var(--color-surface)]
              px-4 py-4
              sm:px-6
            "
          >
            {submitMessage && (
              <div
                role="alert"
                className={`
                  mb-4 flex items-start gap-3
                  rounded-[var(--radius-md)]
                  border p-3
                  ${
                    submitMessage.type === "success"
                      ? "border-[var(--color-success)] bg-[var(--color-primary-tint)] text-[var(--color-success)]"
                      : "border-[var(--color-danger)] bg-[var(--color-surface-muted)] text-[var(--color-danger)]"
                  }
                `}
              >
                {submitMessage.type === "success" ? (
                  <CheckCircle2
                    size={19}
                    className="mt-0.5 shrink-0"
                  />
                ) : (
                  <AlertTriangle
                    size={19}
                    className="mt-0.5 shrink-0"
                  />
                )}

                <p className="text-sm font-semibold">
                  {submitMessage.text}
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="
                  inline-flex w-full items-center
                  justify-center
                  rounded-[var(--radius-md)]
                  border border-[var(--color-border-strong)]
                  bg-[var(--color-surface)]
                  px-5 py-3
                  text-sm font-semibold
                  text-[var(--color-text-primary)]
                  color-transition
                  hover:bg-[var(--color-surface-muted)]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  sm:w-auto
                "
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  inline-flex w-full items-center
                  justify-center gap-2
                  rounded-[var(--radius-md)]
                  bg-[var(--color-primary)]
                  px-6 py-3
                  text-sm font-bold
                  text-[var(--color-text-inverse)]
                  shadow-[var(--shadow-sm)]
                  color-transition
                  hover:bg-[var(--color-primary-light)]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  sm:w-auto
                "
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Saving changes...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save changes
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default EditChemicalModal;
