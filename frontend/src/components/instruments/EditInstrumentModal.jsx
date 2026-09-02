import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  LinkIcon,
  Loader2,
  Microscope,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import api from "../../api/axiosInstance";
import { getInstrumentImageUrl } from "../../utils/instrumentImage";

const AVAILABILITY_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "UNAVAILABLE", label: "Unavailable" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
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

const EditInstrumentModal = ({
  instrument,
  onClose,
  onSuccess,
}) => {
  const modalRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    availability: "AVAILABLE",
    tutorialVideo: "",
    warranty: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    if (!instrument) return;

    setFormData({
      name: instrument.name || "",
      description: instrument.description || "",
      availability: instrument.availability || "AVAILABLE",
      tutorialVideo: instrument.tutorialVideo || "",
      warranty: instrument.warranty || "",
    });

    setExistingImageUrl(instrument.imageUrl || "");
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    setErrors({});
    setSubmitMessage(null);
  }, [instrument]);

  useEffect(() => {
    if (!instrument) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [instrument, isSubmitting, onClose]);

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
      setErrors((previous) => ({
        ...previous,
        imageFile: "Invalid image format. Allowed formats: JPG, PNG, WEBP, GIF, SVG.",
      }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors((previous) => ({
        ...previous,
        imageFile: "Image file size must not exceed 10 MB.",
      }));
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
    setErrors((previous) => ({ ...previous, imageFile: "" }));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    setExistingImageUrl("");
    setRemoveImage(true);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Instrument name is required.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    name: formData.name.trim(),
    description: formData.description.trim() || null,
    availability: formData.availability,
    tutorialVideo: formData.tutorialVideo.trim() || null,
    warranty: formData.warranty.trim() || null,
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

      if (imageFile || removeImage) {
        const multipartData = new FormData();

        Object.entries(payload).forEach(([key, value]) => {
          if (value === null || value === undefined) {
            return;
          }
          multipartData.append(key, value);
        });

        if (imageFile) {
          multipartData.append("instrumentImage", imageFile);
        }
        if (removeImage) {
          multipartData.append("removeImage", "true");
        }

        requestBody = multipartData;

        requestConfig = {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };
      }

      const response = await api.put(
        `/instruments/${instrument.id}`,
        requestBody,
        requestConfig
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to update instrument."
        );
      }

      setSubmitMessage({
        type: "success",
        text: "Instrument updated successfully.",
      });

      window.setTimeout(() => {
        onSuccess(response.data.instrument);
      }, 600);
    } catch (error) {
      setSubmitMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.message ||
          "Unable to update the instrument.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  if (!instrument) return null;

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
      aria-labelledby="edit-instrument-title"
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
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-accent-light)]">
              <Microscope size={22} />
            </div>

            <div className="min-w-0">
              <h2
                id="edit-instrument-title"
                className="truncate text-lg font-bold text-[var(--color-text-primary)] sm:text-xl"
              >
                Edit Instrument
              </h2>

              <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)] sm:text-sm">
                Update instrument information and image.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close edit instrument modal"
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
              <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                    <Microscope size={19} />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                      Instrument identity
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                      Enter the information used to identify this instrument.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <InputLabel htmlFor="name" required>
                      Instrument name
                    </InputLabel>

                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Centrifuge"
                      className={`
                        ${commonInputClass}
                        ${
                          errors.name
                            ? "border-[var(--color-danger)]"
                            : ""
                        }
                      `}
                    />

                    <ErrorMessage message={errors.name} />
                  </div>

                  <div className="md:col-span-2">
                    <InputLabel htmlFor="description">
                      Description
                    </InputLabel>

                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Describe the instrument, its purpose, and key specifications."
                      className={`${commonInputClass} resize-y leading-6`}
                    />
                  </div>

                  <div>
                    <InputLabel htmlFor="availability">
                      Availability
                    </InputLabel>

                    <div className="relative">
                      <select
                        id="availability"
                        name="availability"
                        value={formData.availability}
                        onChange={handleChange}
                        className={`${commonInputClass} appearance-none pr-10`}
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
                    <InputLabel
                      htmlFor="warranty"
                      description="Warranty period or expiry information."
                    >
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
                      className={commonInputClass}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <InputLabel
                      htmlFor="tutorialVideo"
                      description="Optional link to a tutorial video (YouTube, Vimeo, etc.)."
                    >
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
                      className={commonInputClass}
                    />
                  </div>
                </div>
              </section>

              {/* Image */}
              <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                    <UploadCloud size={19} />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                      Image
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                      Upload, change, or remove the photo / illustration of this instrument.
                    </p>
                  </div>
                </div>

                {!imagePreview && !existingImageUrl ? (
                  <label
                    htmlFor="editInstrumentImageInput"
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
                        Click or drag & drop to upload a new instrument image
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        Supports PNG, JPG, JPEG, WEBP, GIF, SVG up to 10 MB
                      </p>
                    </div>
                    <input
                      id="editInstrumentImageInput"
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
                        src={imagePreview || getInstrumentImageUrl(existingImageUrl)}
                        alt="Instrument preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                        {imageFile?.name || (existingImageUrl ? "Current image" : "Selected Image")}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                        {imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : "Attached image"}
                      </p>
                      <div className="mt-2 flex items-center justify-center gap-2 sm:justify-start">
                        <label
                          htmlFor="editInstrumentImageInput"
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] color-transition hover:bg-[var(--color-surface-muted)]"
                        >
                          Change Image
                          <input
                            id="editInstrumentImageInput"
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
                          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 color-transition hover:bg-red-100"
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <ErrorMessage message={errors.imageFile} />
              </section>
            </div>
          </div>

          {/* Footer */}
          <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 sm:px-6">
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
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle size={19} className="mt-0.5 shrink-0" />
                )}

                <p className="text-sm font-semibold">{submitMessage.text}</p>
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
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Save Changes
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

export default EditInstrumentModal;