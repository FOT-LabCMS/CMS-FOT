import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Beaker,
  CheckCircle2,
  ChevronDown,
  FlaskConical,
  Image as ImageIcon,
  Info,
  Loader2,
  Paperclip,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Import the configured Axios instance
import api from "../../api/axiosInstance";
import { useMutation, useQueryClient } from "@tanstack/react-query";


const INITIAL_FORM = {
  chemicalCode: "",
  canonicalName: "",
  binCardNumber: "",
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
  remarks: "",
  sdsRevisionDate: "",
};

const STOCK_DIMENSION_OPTIONS = [
  {
    value: "MASS",
    label: "Mass",
    description: "Track using weight, such as g or kg",
    suggestedUnit: "g",
  },
  {
    value: "VOLUME",
    label: "Volume",
    description: "Track using volume, such as mL or L",
    suggestedUnit: "mL",
  },
  {
    value: "COUNT",
    label: "Count",
    description: "Track as individual units",
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

const DENSITY_UNIT_OPTIONS = ["g/cm³", "g/mL", "kg/L", "kg/m³"];

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

const CAS_NUMBER_REGEX = /^\d{2,7}-\d{2}-\d$/;

const isValidCasNumber = (casNumber) => {
  if (!CAS_NUMBER_REGEX.test(casNumber)) {
    return false;
  }

  const digits = casNumber.replace(/-/g, "");
  const checkDigit = Number(digits.at(-1));

  const sum = digits
    .slice(0, -1)
    .split("")
    .reverse()
    .reduce(
      (total, digit, index) =>
        total + Number(digit) * (index + 1),
      0,
    );

  return sum % 10 === checkDigit;
};

const AddChemical = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState(null);
  const [isCodeLoading, setIsCodeLoading] = useState(true);
  const [sdsFile, setSdsFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [isCasLoading, setIsCasLoading] = useState(false);
  const [casLookupMessage, setCasLookupMessage] = useState(null);

  const addChemicalMutation = useMutation({
    mutationFn: (payload) => api.post("/chemicals/add-chemical", payload),
    onSuccess: () => {
      // Invalidate the query so ViewChemicals refetches fresh data
      queryClient.invalidateQueries({ queryKey: ['chemicals'] });

      setSubmitMessage({
        type: "success",
        text: "Chemical created successfully! You will be redirected shortly.",
      });

      setTimeout(() => {
        navigate('/chemicals/list');
      }, 1500);
    },
    onError: (error) => {
      setSubmitMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Unable to add the chemical. Please try again.",
      });
    },
  });

  useEffect(() => {
    const fetchNextCode = async () => {
      try {
        setIsCodeLoading(true);
        const response = await api.get("/chemicals/get-next-code");
        if (response.data?.success) {
          setFormData((prev) => ({
            ...prev,
            chemicalCode: response.data.nextCode,
          }));
          // Clear any potential error for chemicalCode
          setErrors((prev) => {
            const { chemicalCode, ...rest } = prev;
            return rest;
          });
        }
      } catch (error) {
        console.error("Failed to fetch next chemical code:", error);
        setErrors((prev) => ({
          ...prev,
          chemicalCode: "Could not auto-generate code. Please refresh.",
        }));
      } finally {
        setIsCodeLoading(false);
      }
    };

    fetchNextCode();
  }, []);

  const lookupChemicalByCas = async () => {
    const casNumber = formData.casNumber.trim();

    setCasLookupMessage(null);

    if (!casNumber) {
      return;
    }

    if (!isValidCasNumber(casNumber)) {
      setErrors((previous) => ({
        ...previous,
        casNumber: "Enter a valid CAS number, for example 7647-01-0.",
      }));

      return;
    }

    try {
      setIsCasLoading(true);

      setErrors((previous) => ({
        ...previous,
        casNumber: "",
      }));

      const response = await api.get(
        `/chemicals/lookup/cas/${encodeURIComponent(casNumber)}`,
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Chemical information was not found.",
        );
      }

      const chemicalData = response.data.chemical;

      setFormData((previous) => ({
        ...previous,

        // Keep existing user-entered values when API does not return a value.
        canonicalName:
          chemicalData.canonicalName || previous.canonicalName,

        formula:
          chemicalData.formula || previous.formula,

        densityValue:
          chemicalData.densityValue !== null &&
          chemicalData.densityValue !== undefined
            ? String(chemicalData.densityValue)
            : previous.densityValue,

        densityUnit:
          chemicalData.densityUnit || previous.densityUnit,
      }));

      if (
        chemicalData.densityValue !== null &&
        chemicalData.densityValue !== undefined
      ) {
        setErrors((previous) => ({
          ...previous,
          densityValue: "",
          densityUnit: "",
        }));

        setCasLookupMessage({
          type: "success",
          text: `Chemical information and density loaded from ${chemicalData.source}.`,
        });
      } else {
        setCasLookupMessage({
          type: "warning",
          text:
            "Chemical information was found, but PubChem did not provide a usable density value. Please enter it manually from the SDS.",
        });
      }
    } catch (error) {
      setCasLookupMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.message ||
          "Unable to retrieve chemical information.",
      });
    } finally {
      setIsCasLoading(false);
    }
  };

  const availableBaseUnits = useMemo(
    () =>
      BASE_UNIT_OPTIONS[formData.stockDimension] || BASE_UNIT_OPTIONS.VOLUME,
    [formData.stockDimension],
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

    const selectedOption = STOCK_DIMENSION_OPTIONS.find(
      (option) => option.value === selectedDimension,
    );

    setFormData((previous) => ({
      ...previous,
      stockDimension: selectedDimension,
      baseUnit: selectedOption?.suggestedUnit || "",
    }));

    setErrors((previous) => ({
      ...previous,
      stockDimension: "",
      baseUnit: "",
    }));

    setSubmitMessage(null);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        sdsFile: "Invalid file type. Please select a PDF or Word document.",
      }));
      return;
    }

    setSdsFile(file);
    setErrors((prev) => ({ ...prev, sdsFile: "" }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        imageFile: "Invalid image format. Allowed formats: JPG, PNG, WEBP, GIF, SVG.",
      }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        imageFile: "Image file size must not exceed 10 MB.",
      }));
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, imageFile: "" }));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleSynonymChange = (index, value) => {
    setFormData((previous) => {
      const updatedSynonyms = [...previous.synonyms];
      updatedSynonyms[index] = value;

      return {
        ...previous,
        synonyms: updatedSynonyms,
      };
    });

    setSubmitMessage(null);
  };

  const addSynonym = () => {
    setFormData((previous) => ({
      ...previous,
      synonyms: [...previous.synonyms, ""],
    }));
  };

  const removeSynonym = (index) => {
    setFormData((previous) => {
      const updatedSynonyms = previous.synonyms.filter(
        (_, synonymIndex) => synonymIndex !== index,
      );

      return {
        ...previous,
        synonyms: updatedSynonyms.length > 0 ? updatedSynonyms : [""],
      };
    });
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.chemicalCode.trim()) {
      nextErrors.chemicalCode = "Chemical code is required.";
    }

    if (!formData.canonicalName.trim()) {
      nextErrors.canonicalName = "Canonical chemical name is required.";
    }

    const BIN_CARD_NUMBER_REGEX = /^BST\d{3}$/;

    if (!formData.binCardNumber.trim()) {
      nextErrors.binCardNumber = "Bin Card Number is required.";
    } else if (
      !BIN_CARD_NUMBER_REGEX.test(formData.binCardNumber.trim().toUpperCase())
    ) {
      nextErrors.binCardNumber =
        "Bin Card Number must follow the format BST followed by exactly 3 digits (e.g. BST001).";
    }

    if (!formData.stockDimension) {
      nextErrors.stockDimension = "Stock dimension is required.";
    }

    if (!formData.baseUnit.trim()) {
      nextErrors.baseUnit = "Base unit is required.";
    }

    if (formData.densityValue !== "" && Number(formData.densityValue) < 0) {
      nextErrors.densityValue = "Density value cannot be negative.";
    }

    if (formData.densityValue !== "" && !formData.densityUnit.trim()) {
      nextErrors.densityUnit =
        "Density unit is required when density is provided.";
    }

    if (
      formData.densityValue === "" &&
      formData.densityUnit.trim() &&
      formData.densityUnit !== "g/cm³"
    ) {
      nextErrors.densityValue =
        "Enter a density value or clear the density unit.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    chemicalCode: formData.chemicalCode.trim(),
    canonicalName: formData.canonicalName.trim(),
    binCardNumber: formData.binCardNumber.trim().toUpperCase(),
    stockDimension: formData.stockDimension,
    baseUnit: formData.baseUnit.trim(),
    casNumber: formData.casNumber.trim() ? formData.casNumber.trim() : null,
    formula: formData.formula.trim() ? formData.formula.trim() : null,
    physicalState: formData.physicalState,
    hazardCategory: formData.hazardCategory,

    synonyms: formData.synonyms
      .map((s) => s.trim())
      .filter(Boolean),

    densityValue:
      formData.densityValue === "" ? null : Number(formData.densityValue),

    densityUnit:
      formData.densityValue === "" ? null : formData.densityUnit.trim(),

    safetySummary: formData.safetySummary.trim() ? formData.safetySummary.trim() : null,
    remarks: formData.remarks.trim() ? formData.remarks.trim() : null,
    sdsRevisionDate: formData.sdsRevisionDate || null,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      setSubmitMessage({
        type: "error",
        text: "Please correct the highlighted fields before saving.",
      });

      return;
    }

    setSubmitMessage(null);

    const formPayload = new FormData();
    const payload = buildPayload();

    // Append all fields from the payload to FormData
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          // Stringify arrays to be sent via FormData
          formPayload.append(key, JSON.stringify(value));
        } else {
          formPayload.append(key, value);
        }
      }
    });

    if (sdsFile) {
      formPayload.append("sdsFile", sdsFile);
    }
    if (imageFile) {
      formPayload.append("imageFile", imageFile);
    }

    addChemicalMutation.mutate(formPayload);
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setErrors({});
    setSubmitMessage(null);
    setSdsFile(null);
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const isSubmitting = addChemicalMutation.isPending;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <main
        className="
          min-h-screen
          px-4 py-5
          sm:px-6
          lg:px-8 lg:py-8
        "
      >
        <div className="mx-auto max-w-7xl">
          {/* Page header */}
          <header className="mb-6 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              <div
                className="
                  pointer-events-none
                  absolute -right-12 -top-16
                  h-52 w-52
                  rounded-full
                  bg-[var(--color-primary-light)]
                  opacity-30
                "
              />

              <div
                className="
                  pointer-events-none
                  absolute -bottom-20 right-32
                  h-40 w-40
                  rounded-full
                  bg-[var(--color-accent)]
                  opacity-10
                "
              />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="
                    mb-5
                    inline-flex items-center gap-2
                    rounded-[var(--radius-sm)]
                    border border-[var(--color-primary-light)]
                    bg-[var(--color-primary)]
                    px-3 py-2
                    text-sm font-semibold
                    text-[var(--color-text-inverse)]
                    color-transition
                    hover:bg-[var(--color-primary-light)]
                  "
                >
                  <ArrowLeft size={17} />
                  Back
                </button>

                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className="
                          inline-flex items-center gap-2
                          rounded-full
                          bg-[var(--color-primary)]
                          px-3 py-1.5
                          text-xs font-bold uppercase tracking-[0.16em]
                          text-[var(--color-accent-light)]
                        "
                      >
                        <FlaskConical size={14} />
                        Chemical Inventory
                      </span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                      Add New Chemical
                    </h1>
                  </div>

                  <div
                    className="
                      flex items-center gap-3
                      rounded-[var(--radius-md)]
                      border border-[var(--color-primary-light)]
                      bg-[var(--color-primary)]
                      p-4
                    "
                  >
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
                {/* Identity section */}
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
                  <SectionHeader
                    icon={Beaker}
                    title="Chemical identity"
                    description="Enter the standard information used to identify and search this chemical."
                  />

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <InputLabel
                        htmlFor="chemicalCode"
                        required
                        description="A unique internal code used in reports and labels."
                      >
                        Chemical code
                      </InputLabel>

                      <div className="relative">
                        {isCodeLoading && (
                          <Loader2
                            size={18}
                            className="
                              absolute right-3 top-1/2
                              -translate-y-1/2
                              animate-spin
                              text-[var(--color-text-muted)]
                            "
                          />
                        )}
                        <input
                          id="chemicalCode"
                          name="chemicalCode"
                          type="text"
                          value={formData.chemicalCode}
                          readOnly
                          placeholder={
                            isCodeLoading ? "Generating code..." : "CHE-000000"
                          }
                          autoComplete="off"
                          className={`
                            w-full
                            rounded-[var(--radius-md)]
                            border
                            bg-[var(--color-surface-muted)]
                            px-4 py-3
                            text-sm font-medium
                            text-[var(--color-text-secondary)]
                            placeholder:text-[var(--color-text-muted)]
                            cursor-not-allowed
                            ${
                              errors.chemicalCode
                                ? "border-[var(--color-danger)]"
                                : "border-[var(--color-border)]"
                            }
                          `}
                        />
                      </div>

                      <ErrorMessage message={errors.chemicalCode} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="canonicalName"
                        required
                        description="The main standardized display name."
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
                        autoComplete="off"
                        className={`
                          w-full
                          rounded-[var(--radius-md)]
                          border
                          bg-[var(--color-surface)]
                          px-4 py-3
                          text-sm font-medium
                          text-[var(--color-text-primary)]
                          placeholder:text-[var(--color-text-muted)]
                          color-transition
                          ${
                            errors.canonicalName
                              ? "border-[var(--color-danger)]"
                              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                          }
                        `}
                      />

                      <ErrorMessage message={errors.canonicalName} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="binCardNumber"
                        required
                        description="The unique batch identifier in BST### format (e.g. BST001)."
                      >
                        Batch Number
                      </InputLabel>

                      <input
                        id="binCardNumber"
                        name="binCardNumber"
                        type="text"
                        value={formData.binCardNumber}
                        onChange={handleChange}
                        placeholder="e.g. BST001"
                        autoComplete="off"
                        maxLength={6}
                        className={`
                          w-full
                          rounded-[var(--radius-md)]
                          border
                          bg-[var(--color-surface)]
                          px-4 py-3
                          text-sm font-medium
                          text-[var(--color-text-primary)]
                          placeholder:text-[var(--color-text-muted)]
                          color-transition
                          ${
                            errors.binCardNumber
                              ? "border-[var(--color-danger)]"
                              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                          }
                        `}
                      />

                      <ErrorMessage message={errors.binCardNumber} />
                    </div>

                    {/* Chemical Bottle Image Upload Section */}
                    <div className="md:col-span-2">
                      <InputLabel
                        htmlFor="imageFileInput"
                        description="Upload a photo or illustration of the chemical bottle / container (optional, max 10MB)."
                      >
                        Chemical Bottle Image
                      </InputLabel>

                      {!imagePreview ? (
                        <label
                          htmlFor="imageFileInput"
                          className={`
                            flex flex-col items-center justify-center gap-3
                            rounded-[var(--radius-lg)] border-2 border-dashed
                            p-6 text-center cursor-pointer color-transition
                            ${
                              errors.imageFile
                                ? "border-[var(--color-danger)] bg-red-500/5"
                                : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-tint)]/20"
                            }
                          `}
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                            <UploadCloud size={24} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                              Click or drag & drop to upload chemical bottle image
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                              Supports PNG, JPG, JPEG, WEBP, GIF, SVG up to 10 MB
                            </p>
                          </div>
                          <input
                            id="imageFileInput"
                            name="imageFile"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                            onChange={handleImageChange}
                            className="sr-only"
                          />
                        </label>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-black/5">
                            <img
                              src={imagePreview}
                              alt="Chemical preview"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 text-center sm:text-left">
                            <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                              {imageFile?.name || "Selected Image"}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                              {imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : ""}
                            </p>
                            <div className="mt-2 flex items-center justify-center sm:justify-start gap-2">
                              <label
                                htmlFor="imageFileInput"
                                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] cursor-pointer color-transition"
                              >
                                Change Image
                                <input
                                  id="imageFileInput"
                                  name="imageFile"
                                  type="file"
                                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                                  onChange={handleImageChange}
                                  className="sr-only"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 color-transition"
                              >
                                <Trash2 size={13} />
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <ErrorMessage message={errors.imageFile} />
                    </div>

                    <div>
                    <InputLabel
                      htmlFor="casNumber"
                      description="Enter a valid CAS number to automatically retrieve chemical information."
                    >
                      CAS number
                    </InputLabel>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative flex-1">
                        <input
                          id="casNumber"
                          name="casNumber"
                          type="text"
                          value={formData.casNumber}
                          onChange={(event) => {
                            handleChange(event);
                            setCasLookupMessage(null);
                          }}
                          onBlur={() => {
                            if (formData.casNumber.trim()) {
                              lookupChemicalByCas();
                            }
                          }}
                          placeholder="e.g. 7647-01-0"
                          autoComplete="off"
                          disabled={isCasLoading}
                          className={`
                            w-full
                            rounded-[var(--radius-md)]
                            border
                            bg-[var(--color-surface)]
                            px-4 py-3
                            pr-11
                            text-sm font-medium
                            text-[var(--color-text-primary)]
                            placeholder:text-[var(--color-text-muted)]
                            color-transition
                            disabled:cursor-wait
                            disabled:opacity-70
                            ${
                              errors.casNumber
                                ? "border-[var(--color-danger)]"
                                : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                            }
                          `}
                        />

                        {isCasLoading && (
                          <Loader2
                            size={18}
                            className="
                              absolute right-3 top-1/2
                              -translate-y-1/2
                              animate-spin
                              text-[var(--color-primary)]
                            "
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={lookupChemicalByCas}
                        disabled={isCasLoading || !formData.casNumber.trim()}
                        className="
                          inline-flex items-center justify-center gap-2
                          rounded-[var(--radius-md)]
                          bg-[var(--color-primary)]
                          px-4 py-3
                          text-sm font-bold
                          text-[var(--color-text-inverse)]
                          color-transition
                          hover:bg-[var(--color-primary-light)]
                          disabled:cursor-not-allowed
                          disabled:opacity-60
                        "
                      >
                        {isCasLoading ? (
                          <>
                            <Loader2 size={17} className="animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Beaker size={17} />
                            Find chemical
                          </>
                        )}
                      </button>
                    </div>

                    <ErrorMessage message={errors.casNumber} />

                    {casLookupMessage && (
                      <div
                        className={`
                          mt-2 rounded-[var(--radius-sm)] border px-3 py-2
                          text-xs font-medium
                          ${
                            casLookupMessage.type === "success"
                              ? "border-[var(--color-success)] text-[var(--color-success)]"
                              : casLookupMessage.type === "warning"
                                ? "border-[var(--color-warning)] text-[var(--color-warning)]"
                                : "border-[var(--color-danger)] text-[var(--color-danger)]"
                          }
                        `}
                      >
                        {casLookupMessage.text}
                      </div>
                    )}
                  </div>

                    <div>
                      <InputLabel
                        htmlFor="formula"
                        description="The molecular or chemical formula."
                      >
                        Chemical formula
                      </InputLabel>

                      <input
                        id="formula"
                        name="formula"
                        type="text"
                        value={formData.formula}
                        onChange={handleChange}
                        placeholder="e.g. HCl"
                        autoComplete="off"
                        className="
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
                        "
                      />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="physicalState"
                        description="The usual physical form of this chemical."
                      >
                        Physical state
                      </InputLabel>

                      <div className="relative">
                        <select
                          id="physicalState"
                          name="physicalState"
                          value={formData.physicalState}
                          onChange={handleChange}
                          className="
                            w-full appearance-none
                            rounded-[var(--radius-md)]
                            border border-[var(--color-border)]
                            bg-[var(--color-surface)]
                            px-4 py-3 pr-10
                            text-sm font-medium
                            text-[var(--color-text-primary)]
                            color-transition
                            focus:border-[var(--color-primary)]
                          "
                        >
                          {PHYSICAL_STATE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
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

                    <div className="md:col-span-2">
                      <InputLabel description="Alternative names used when searching for this chemical.">
                        Synonyms
                      </InputLabel>

                      <div className="space-y-3">
                        {formData.synonyms.map((synonym, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Tag
                                size={17}
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
                                  handleSynonymChange(index, event.target.value)
                                }
                                placeholder={
                                  index === 0
                                    ? "e.g. Muriatic acid"
                                    : "Enter another synonym"
                                }
                                className="
                                    w-full
                                    rounded-[var(--radius-md)]
                                    border border-[var(--color-border)]
                                    bg-[var(--color-surface)]
                                    py-3 pl-10 pr-4
                                    text-sm font-medium
                                    text-[var(--color-text-primary)]
                                    placeholder:text-[var(--color-text-muted)]
                                    color-transition
                                    focus:border-[var(--color-primary)]
                                  "
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeSynonym(index)}
                              aria-label={`Remove synonym ${index + 1}`}
                              className="
                                  flex h-11 w-11 shrink-0
                                  items-center justify-center
                                  rounded-[var(--radius-md)]
                                  border border-[var(--color-border)]
                                  bg-[var(--color-surface)]
                                  text-[var(--color-danger)]
                                  color-transition
                                  hover:border-[var(--color-danger)]
                                  hover:bg-[var(--color-surface-muted)]
                                "
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={addSynonym}
                          className="
                            inline-flex items-center gap-2
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
                          Add another synonym
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Stock measurement section */}
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
                  <SectionHeader
                    icon={FlaskConical}
                    title="Stock measurement"
                    description="Define how quantities of this chemical are measured and summarized."
                  />

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <InputLabel
                        htmlFor="stockDimension"
                        required
                        description="Choose whether stock is tracked by mass, volume or count."
                      >
                        Stock dimension
                      </InputLabel>

                      <div className="relative">
                        <select
                          id="stockDimension"
                          name="stockDimension"
                          value={formData.stockDimension}
                          onChange={handleStockDimensionChange}
                          className={`
                            w-full appearance-none
                            rounded-[var(--radius-md)]
                            border
                            bg-[var(--color-surface)]
                            px-4 py-3 pr-10
                            text-sm font-medium
                            text-[var(--color-text-primary)]
                            color-transition
                            ${
                              errors.stockDimension
                                ? "border-[var(--color-danger)]"
                                : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                            }
                          `}
                        >
                          {STOCK_DIMENSION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
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

                      <ErrorMessage message={errors.stockDimension} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="baseUnit"
                        required
                        description="All inventory totals will be normalized to this unit."
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
                            w-full appearance-none
                            rounded-[var(--radius-md)]
                            border
                            bg-[var(--color-surface)]
                            px-4 py-3 pr-10
                            text-sm font-medium
                            text-[var(--color-text-primary)]
                            color-transition
                            ${
                              errors.baseUnit
                                ? "border-[var(--color-danger)]"
                                : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                            }
                          `}
                        >
                          {availableBaseUnits.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
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

                      <ErrorMessage message={errors.baseUnit} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="densityValue"
                        description="Optional. Used when converting between mass and volume."
                      >
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
                          w-full
                          rounded-[var(--radius-md)]
                          border
                          bg-[var(--color-surface)]
                          px-4 py-3
                          text-sm font-medium
                          text-[var(--color-text-primary)]
                          placeholder:text-[var(--color-text-muted)]
                          color-transition
                          ${
                            errors.densityValue
                              ? "border-[var(--color-danger)]"
                              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                          }
                        `}
                      />

                      <ErrorMessage message={errors.densityValue} />
                    </div>

                    <div>
                      <InputLabel
                        htmlFor="densityUnit"
                        description="Unit used for the density value."
                      >
                        Density unit
                      </InputLabel>

                      <div className="relative">
                        <select
                          id="densityUnit"
                          name="densityUnit"
                          value={formData.densityUnit}
                          onChange={handleChange}
                          className={`
                            w-full appearance-none
                            rounded-[var(--radius-md)]
                            border
                            bg-[var(--color-surface)]
                            px-4 py-3 pr-10
                            text-sm font-medium
                            text-[var(--color-text-primary)]
                            color-transition
                            ${
                              errors.densityUnit
                                ? "border-[var(--color-danger)]"
                                : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                            }
                          `}
                        >
                          {DENSITY_UNIT_OPTIONS.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
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

                      <ErrorMessage message={errors.densityUnit} />
                    </div>
                  </div>
                </section>

                {/* Safety section */}
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
                  <SectionHeader
                    icon={ShieldAlert}
                    title="Safety overview"
                    description="Add a short warning for quick reference. This does not replace the official SDS."
                  />

                  <div className="mb-6">
                    <InputLabel
                      htmlFor="hazardCategory"
                      description="Select the primary hazard category for storage and safety visibility."
                    >
                      Hazard category
                    </InputLabel>

                    <div className="relative">
                      <select
                        id="hazardCategory"
                        name="hazardCategory"
                        value={formData.hazardCategory}
                        onChange={handleChange}
                        className="
                          w-full appearance-none
                          rounded-[var(--radius-md)]
                          border border-[var(--color-border)]
                          bg-[var(--color-surface)]
                          px-4 py-3 pr-10
                          text-sm font-medium
                          text-[var(--color-text-primary)]
                          color-transition
                          focus:border-[var(--color-primary)]
                        "
                      >
                        {HAZARD_CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
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
                    <InputLabel
                      htmlFor="safetySummary"
                      description="Summarize the main hazards and required handling precautions."
                    >
                      Safety summary
                    </InputLabel>

                    <textarea
                      id="safetySummary"
                      name="safetySummary"
                      rows={6}
                      value={formData.safetySummary}
                      onChange={handleChange}
                      placeholder="e.g. Highly corrosive. Causes severe skin burns and eye damage. Use gloves, goggles and a fume hood."
                      className="
                        w-full resize-y
                        rounded-[var(--radius-md)]
                        border border-[var(--color-border)]
                        bg-[var(--color-surface)]
                        px-4 py-3
                        text-sm leading-6
                        text-[var(--color-text-primary)]
                        placeholder:text-[var(--color-text-muted)]
                        color-transition
                        focus:border-[var(--color-primary)]
                      "
                    />

                    <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-3">
                      <Info
                        size={17}
                        className="mt-0.5 shrink-0 text-[var(--color-info)]"
                      />

                      <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
                        Detailed GHS hazards and SDS documents should be managed
                        separately after the chemical record is created.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <InputLabel
                      htmlFor="remarks"
                      description="Special instructions, storage conditions, or confidential remarks (Staff only: Admin & Technical Officers)."
                    >
                      Remarks / Special Notes
                    </InputLabel>

                    <textarea
                      id="remarks"
                      name="remarks"
                      rows={4}
                      value={formData.remarks}
                      onChange={handleChange}
                      placeholder="e.g. Store in flammable cabinet. Keep away from strong oxidizers."
                      className="
                        w-full resize-y
                        rounded-[var(--radius-md)]
                        border border-[var(--color-border)]
                        bg-[var(--color-surface)]
                        px-4 py-3
                        text-sm leading-6
                        text-[var(--color-text-primary)]
                        placeholder:text-[var(--color-text-muted)]
                        color-transition
                        focus:border-[var(--color-primary)]
                      "
                    />
                  </div>

                  <div className="mt-6">
                    <div className="mb-5">
                      <InputLabel
                        htmlFor="sdsRevisionDate"
                        description="Use the revision or issue date printed on the SDS document."
                      >
                        SDS revision date
                      </InputLabel>

                      <input
                        id="sdsRevisionDate"
                        name="sdsRevisionDate"
                        type="date"
                        value={formData.sdsRevisionDate}
                        onChange={handleChange}
                        className="
                          w-full
                          rounded-[var(--radius-md)]
                          border border-[var(--color-border)]
                          bg-[var(--color-surface)]
                          px-4 py-3
                          text-sm font-medium
                          text-[var(--color-text-primary)]
                          color-transition
                          focus:border-[var(--color-primary)]
                        "
                      />
                    </div>

                    <InputLabel
                      htmlFor="sdsFile"
                      description="Upload the Safety Data Sheet (PDF or Word, max 10MB)."
                    >
                      SDS document
                    </InputLabel>

                    {sdsFile ? (
                      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                        <Paperclip
                          size={20}
                          className="shrink-0 text-[var(--color-primary)]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                            {sdsFile.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {(sdsFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSdsFile(null)}
                          aria-label="Remove selected file"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-danger)] color-transition hover:bg-[var(--color-danger)]/10"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="sdsFile"
                        className={`
                          relative flex cursor-pointer flex-col
                          items-center justify-center
                          gap-2 rounded-[var(--radius-md)]
                          border-2 border-dashed
                          p-6 text-center
                          color-transition
                          ${
                            errors.sdsFile
                              ? "border-[var(--color-danger)] text-[var(--color-danger)]"
                              : "border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-tint)] hover:text-[var(--color-primary)]"
                          }
                        `}
                      >
                        <UploadCloud size={32} />
                        <span className="text-sm font-semibold">
                          Click to upload or drag and drop
                        </span>
                        <span className="text-xs">
                          PDF or DOCX (max. 10MB)
                        </span>
                        <input
                          id="sdsFile"
                          name="sdsFile"
                          type="file"
                          onChange={handleFileChange}
                          className="sr-only"
                          accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        />
                      </label>
                    )}
                    <ErrorMessage message={errors.sdsFile} />
                  </div>
                </section>
              </div>

              {/* Right summary panel */}
              <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                      <Beaker size={20} />
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                        Chemical preview
                      </h2>

                      <p className="text-xs text-[var(--color-text-muted)]">
                        Live form summary
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[var(--radius-md)] bg-[var(--color-primary-dark)] p-4">
                    <span className="inline-flex rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary-dark)]">
                      {formData.chemicalCode.trim() || "NO CODE"}
                    </span>

                    <h3 className="mt-4 text-lg font-bold text-[var(--color-text-inverse)]">
                      {formData.canonicalName.trim() || "Unnamed chemical"}
                    </h3>

                    <p className="mt-2 text-sm text-[var(--color-text-inverse)] opacity-75">
                      {formData.formula.trim() || "Formula not entered"}
                    </p>
                  </div>

                  <dl className="mt-5 space-y-4">
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                      <dt className="text-sm text-[var(--color-text-secondary)]">
                        Stock type
                      </dt>

                      <dd className="text-sm font-bold text-[var(--color-text-primary)]">
                        {formData.stockDimension}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                      <dt className="text-sm text-[var(--color-text-secondary)]">
                        Base unit
                      </dt>

                      <dd className="text-sm font-bold text-[var(--color-text-primary)]">
                        {formData.baseUnit || "—"}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                      <dt className="text-sm text-[var(--color-text-secondary)]">
                        Physical state
                      </dt>

                      <dd className="text-sm font-bold text-[var(--color-text-primary)]">
                        {formData.physicalState || "—"}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-sm text-[var(--color-text-secondary)]">
                        Synonyms
                      </dt>

                      <dd className="text-sm font-bold text-[var(--color-text-primary)]">
                        {
                          formData.synonyms.filter((synonym) => synonym.trim())
                            .length
                        }
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
                        Chemical master only
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                        Supplier, Bin Card Number, expiry date, storage location
                        and current quantity should not be saved in this form.
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
                className={`
                  mt-6 flex items-start gap-3
                  rounded-[var(--radius-md)]
                  border p-4
                  ${
                    submitMessage.type === "success"
                      ? "border-[var(--color-success)] bg-[var(--color-primary-tint)]"
                      : "border-[var(--color-danger)] bg-[var(--color-surface)]"
                  }
                `}
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
                  className={`
                    text-sm font-semibold
                    ${
                      submitMessage.type === "success"
                        ? "text-[var(--color-success)]"
                        : "text-[var(--color-danger)]"
                    }
                  `}
                >
                  {submitMessage.text}
                </p>
              </div>
            )}

            {/* Bottom actions */}
            <div
              className="
                mt-6
                flex flex-col-reverse gap-3
                rounded-[var(--radius-lg)]
                border border-[var(--color-border)]
                bg-[var(--color-surface)]
                p-4
                shadow-[var(--shadow-sm)]
                sm:flex-row sm:items-center sm:justify-between
              "
            >
              <button
                type="button"
                onClick={handleReset}
                disabled={isSubmitting}
                className="
                  inline-flex items-center justify-center gap-2
                  rounded-[var(--radius-md)]
                  border border-[var(--color-border-strong)]
                  bg-[var(--color-surface)]
                  px-5 py-3
                  text-sm font-semibold
                  text-[var(--color-text-secondary)]
                  color-transition
                  hover:bg-[var(--color-surface-muted)]
                  disabled:cursor-not-allowed disabled:opacity-60
                "
              >
                <RotateCcw size={18} />
                Reset form
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                  className="
                    inline-flex items-center justify-center
                    rounded-[var(--radius-md)]
                    border border-[var(--color-border-strong)]
                    bg-[var(--color-surface)]
                    px-5 py-3
                    text-sm font-semibold
                    text-[var(--color-text-primary)]
                    color-transition
                    hover:bg-[var(--color-surface-muted)]
                    disabled:cursor-not-allowed disabled:opacity-60
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="
                    inline-flex items-center justify-center gap-2
                    rounded-[var(--radius-md)]
                    bg-[var(--color-primary)]
                    px-6 py-3
                    text-sm font-bold
                    text-[var(--color-text-inverse)]
                    shadow-[var(--shadow-sm)]
                    color-transition
                    hover:bg-[var(--color-primary-light)]
                    disabled:cursor-not-allowed disabled:opacity-60
                  "
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving chemical...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save chemical
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

export default AddChemical;
