import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MapPin,
  RotateCcw,
  Save,
  FolderTree,
} from "lucide-react";
import api from "../../api/axiosInstance";

const INITIAL_FORM = {
  name: "",
  type: "LAB",
  parentLocationId: "",
};

const LOCATION_TYPES = [
  { value: "LAB", label: "Laboratory" },
  { value: "ROOM", label: "Room" },
  { value: "CABINET", label: "Cabinet / Cupboard" },
  { value: "SHELF", label: "Shelf" },
  { value: "FRIDGE", label: "Refrigerator / Freezer" },
  { value: "OTHER", label: "Other" },
];

// Reusable components from other forms
const InputLabel = ({ children, required = false, description, htmlFor }) => (
  <div className="mb-2">
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)]"
    >
      {children}
      {required && <span className="text-[var(--color-danger)]">*</span>}
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

const AddLocation = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/locations");
        if (response.data?.success) {
          setLocations(response.data.locations);
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
        setSubmitMessage({
          type: "error",
          text: "Could not load existing locations. Please try again later.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchLocations();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitMessage(null);
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.name.trim()) nextErrors.name = "Location name is required.";
    if (!formData.type) nextErrors.type = "Location type is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

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

      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        parentLocationId: formData.parentLocationId || null,
      };

      const response = await api.post("/locations/add", payload);

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to add new location.");
      }

      setSubmitMessage({
        type: "success",
        text: "New location added successfully!",
      });

      setTimeout(() => {
        navigate("/locations"); // Redirect to the list of all locations
      }, 2000);
    } catch (error) {
      setSubmitMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "An unknown error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setErrors({});
    setSubmitMessage(null);
  };

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
      <div className="mx-auto w-full max-w-7xl">
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
                <div className="max-w-3xl">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                      <MapPin size={14} />
                      Storage
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                    Add New Location
                  </h1>
                </div>
              </div>
            </div>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-6">
              <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6 md:p-8">
                <div className="grid gap-5 md:grid-cols-1">
                  {/* Location Name */}
                  <div>
                    <InputLabel htmlFor="name" required description="A descriptive name for the location (e.g., 'Chemistry Lab 101 - Flammables Cabinet').">
                      Location Name
                    </InputLabel>
                    <div className="relative">
                      <MapPin size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Lab A - Cabinet 3"
                        className={`w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] py-3 pl-12 pr-4 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition ${
                          errors.name ? "border-[var(--color-danger)]" : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                        }`}
                      />
                    </div>
                    <ErrorMessage message={errors.name} />
                  </div>

                  {/* Location Type */}
                  <div>
                    <InputLabel htmlFor="type" required description="The physical type of this location.">
                      Location Type
                    </InputLabel>
                    <div className="relative">
                      <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className={`w-full appearance-none rounded-[var(--radius-md)] border bg-[var(--color-surface)] py-3 px-4 pr-10 text-sm font-medium text-[var(--color-text-primary)] color-transition ${
                          errors.type ? "border-[var(--color-danger)]" : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                        }`}
                      >
                        {LOCATION_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    </div>
                    <ErrorMessage message={errors.type} />
                  </div>

                  {/* Parent Location */}
                  <div>
                    <InputLabel htmlFor="parentLocationId" description="Optional. Nest this location inside another (e.g., a shelf inside a cabinet).">
                      Parent Location
                    </InputLabel>
                    <div className="relative">
                      <FolderTree size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                      <select
                        id="parentLocationId"
                        name="parentLocationId"
                        value={formData.parentLocationId}
                        onChange={handleChange}
                        disabled={isLoading || locations.length === 0}
                        className="w-full appearance-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-12 pr-10 text-sm font-medium text-[var(--color-text-primary)] color-transition disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)] focus:border-[var(--color-primary)]"
                      >
                        <option value="">
                          {isLoading ? "Loading..." : "None (Top-level location)"}
                        </option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    </div>
                    <ErrorMessage message={errors.parentLocationId} />
                  </div>
                </div>
              </section>
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
                  <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                ) : (
                  <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
                )}
                <p className={`text-sm font-semibold ${
                  submitMessage.type === "success" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
                }`}>
                  {submitMessage.text}
                </p>
              </div>
            )}

            {/* Bottom actions */}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleReset}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] color-transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw size={18} />
                Reset Form
              </button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving Location...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Location
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

export default AddLocation;