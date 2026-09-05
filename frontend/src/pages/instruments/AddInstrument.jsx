import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  LinkIcon,
  Loader2,
  Microscope,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useFileDrop from "../../components/forms/useFileDrop";

const INITIAL_FORM = {
  name: "",
  description: "",
  availability: "AVAILABLE",
  tutorialVideo: "",
  warranty: "",
};

const AVAILABILITY_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "UNAVAILABLE", label: "Unavailable" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
];

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

const ErrorMessage = ({ message }) => {
  if (!message) return null;

  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--color-danger)]">
      <AlertTriangle size={14} />
      {message}
    </p>
  );
};

const AddInstrument = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const addInstrumentMutation = useMutation({
    mutationFn: (payload) => api.post("/instruments/add", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });

      setSubmitMessage({
        type: "success",
        text: "Instrument created successfully! You will be redirected shortly.",
      });

      setTimeout(() => {
        navigate('/instruments/list');
      }, 1500);
    },
    onError: (error) => {
      setSubmitMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Unable to add the instrument. Please try again.",
      });
    },
  });

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

  const processImageFile = (file) => {
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

  const handleImageChange = (event) => {
    processImageFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Instrument name is required.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
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

    formPayload.append("name", formData.name.trim());
    if (formData.description.trim()) formPayload.append("description", formData.description.trim());
    formPayload.append("availability", formData.availability);
    if (formData.tutorialVideo.trim()) formPayload.append("tutorialVideo", formData.tutorialVideo.trim());
    if (formData.warranty.trim()) formPayload.append("warranty", formData.warranty.trim());

    if (imageFile) {
      formPayload.append("instrumentImage", imageFile);
    }

    addInstrumentMutation.mutate(formPayload);
  };

  const isSubmitting = addInstrumentMutation.isPending;
  const imageDrop = useFileDrop(processImageFile);

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
                  onClick={() => navigate('/instruments/list')}
                  className="mb-5 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
                >
                  <ArrowLeft size={17} />
                  Back to Instruments
                </button>

                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                        <Microscope size={14} />
                        Instrument Inventory
                      </span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                      Add New Instrument
                    </h1>
                  </div>

                  <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)]">
                      <ShieldCheck size={20} />
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
                  <div className="mb-6 flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                      <Microscope size={21} strokeWidth={2.1} />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                        Instrument identity
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                        Enter the standard information used to identify and search this instrument.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <InputLabel htmlFor="name" required description="The main display name used across the system.">
                        Instrument name
                      </InputLabel>

                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Centrifuge"
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
                            errors.name
                              ? "border-[var(--color-danger)]"
                              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                          }
                        `}
                      />

                      <ErrorMessage message={errors.name} />
                    </div>

                    <div className="md:col-span-2">
                      <InputLabel htmlFor="description" description="A brief overview of what the instrument is used for.">
                        Description
                      </InputLabel>

                      <textarea
                        id="description"
                        name="description"
                        rows={4}
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Describe the instrument, its purpose, and key specifications."
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)] resize-y leading-6"
                      />
                    </div>

                    <div>
                      <InputLabel htmlFor="availability" description="Current operational status.">
                        Availability
                      </InputLabel>

                      <div className="relative">
                        <select
                          id="availability"
                          name="availability"
                          value={formData.availability}
                          onChange={handleChange}
                          className="w-full appearance-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pr-10 text-sm font-medium text-[var(--color-text-primary)] color-transition focus:border-[var(--color-primary)]"
                        >
                          {AVAILABILITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <ChevronDown
                          size={18}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                        />
                      </div>
                    </div>

                    <div>
                      <InputLabel htmlFor="warranty" description="Warranty period or expiry information.">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck size={14} />
                          Warranty
                        </span>
                      </InputLabel>

                      <input
                        id="warranty"
                        name="warranty"
                        type="text"
                        value={formData.warranty}
                        onChange={handleChange}
                        placeholder="e.g. 2 years"
                        autoComplete="off"
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <InputLabel htmlFor="tutorialVideo" description="Optional link to a tutorial video (YouTube, Vimeo, etc.).">
                        <span className="flex items-center gap-1.5">
                          <LinkIcon size={14} />
                          Tutorial video URL
                        </span>
                      </InputLabel>

                      <input
                        id="tutorialVideo"
                        name="tutorialVideo"
                        type="url"
                        value={formData.tutorialVideo}
                        onChange={handleChange}
                        placeholder="https://www.youtube.com/watch?v=..."
                        autoComplete="off"
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)]"
                      />
                    </div>

                    {/* Image Upload */}
                    <div className="md:col-span-2">
                      <InputLabel
                        htmlFor="imageFileInput"
                        description="Upload a photo or illustration of this instrument (optional, max 10MB)."
                      >
                        Instrument Image
                      </InputLabel>

                      {!imagePreview ? (
                        <label
                          htmlFor="imageFileInput"
                          {...imageDrop.dragHandlers}
                          className={`
                            flex flex-col items-center justify-center gap-3
                            rounded-[var(--radius-lg)] border-2 border-dashed
                            p-6 text-center cursor-pointer color-transition
                            ${
                              imageDrop.isDragging
                                ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)]"
                                : errors.imageFile
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
                              {imageDrop.isDragging
                                ? "Drop the image here"
                                : "Click or drag & drop to upload instrument image"}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                              Supports PNG, JPG, JPEG, WEBP, GIF, SVG up to 10 MB
                            </p>
                          </div>
                          <input
                            id="imageFileInput"
                            name="instrumentImage"
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
                              alt="Instrument preview"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 text-center sm:text-left">
                            <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                              {imageFile?.name || "Selected Image"}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                              {imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : ""}
                            </p>
                            <div className="mt-2 flex items-center justify-center gap-2 sm:justify-start">
                              <label
                                htmlFor="imageFileInput"
                                {...imageDrop.dragHandlers}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] color-transition"
                              >
                                Change Image
                                <input
                                  id="imageFileInput"
                                  name="instrumentImage"
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
                  </div>
                </section>
              </div>

              {/* Sidebar / submit card */}
              <div className="space-y-6">
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                    Summary
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                    Review the details before saving the instrument to inventory.
                  </p>

                  {submitMessage && (
                    <div
                      role="alert"
                      className={`
                        mt-4 flex items-start gap-3
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
                        <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle size={19} className="mt-0.5 shrink-0" />
                      )}

                      <p className="text-sm font-semibold">{submitMessage.text}</p>
                    </div>
                  )}

                  <div className="mt-5 space-y-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <UploadCloud size={18} />
                          Add Instrument
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/instruments/list')}
                      disabled={isSubmitting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-3 text-sm font-semibold text-[var(--color-text-primary)] color-transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AddInstrument;