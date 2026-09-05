import { useState, useMemo } from "react";
import { X, MapPin, ChevronDown, FolderTree, Loader2, AlertTriangle, Save } from "lucide-react";
import api from "../../api/axiosInstance";
import {
  LOCATION_TYPES,
  getValidParentOptions,
  clearInvalidParent,
} from "../../utils/locationHierarchy";

const EditLocationModal = ({ location, allLocations = [], onClose, onSuccess }) => {
  const [name, setName] = useState(location?.name || "");
  const [type, setType] = useState(location?.type || "CABINET");
  const [parentLocationId, setParentLocationId] = useState(location?.parentLocationId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Helper to find all descendants of current location so we prevent circular references
  const eligibleParentLocations = useMemo(() => {
    if (!location?.id) return allLocations;

    const descendantIds = new Set();
    const findDescendants = (parentId) => {
      allLocations.forEach((loc) => {
        if (loc.parentLocationId === parentId && !descendantIds.has(loc.id)) {
          descendantIds.add(loc.id);
          findDescendants(loc.id);
        }
      });
    };

    findDescendants(location.id);

    // Filter out the location itself and its descendants
    return allLocations.filter(
      (loc) => loc.id !== location.id && !descendantIds.has(loc.id)
    );
  }, [location, allLocations]);

  // Only parents of a type that is valid for the selected location type,
  // excluding the location itself and its descendants (to avoid circular trees).
  const parentOptions = useMemo(() => {
    const options = getValidParentOptions(type, allLocations);
    return options.filter(
      (loc) => loc.id !== location?.id && eligibleParentLocations.some((p) => p.id === loc.id)
    );
  }, [type, allLocations, location, eligibleParentLocations]);

  const handleTypeChange = (e) => {
    const nextType = e.target.value;
    setType(nextType);
    setParentLocationId(clearInvalidParent(nextType, parentLocationId, allLocations));
    if (error) setError("");
  };

  const handleParentChange = (e) => {
    setParentLocationId(e.target.value);
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Location name is required.");
      return;
    }
    if (!type) {
      setError("Location type is required.");
      return;
    }
    if (type !== "LAB" && !parentLocationId) {
      setError(`A ${type} location must have a ${(LOCATION_TYPES.find((t) => t.value === type)?.label || "").toLowerCase()} parent.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const payload = {
        name: name.trim(),
        type,
        parentLocationId: parentLocationId || null,
      };

      const response = await api.put(`/locations/${location.id}`, payload);
      if (response.data?.success) {
        onSuccess(response.data.location);
      } else {
        throw new Error(response.data?.message || "Failed to update location.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "An error occurred while updating the location."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Edit Location</h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Update details for "{location?.name}"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label
              htmlFor="edit-loc-name"
              className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5"
            >
              Location Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                id="edit-loc-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. Lab 101 - Room 2 - Cabinet A"
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-3 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Type Field */}
          <div>
            <label
              htmlFor="edit-loc-type"
              className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5"
            >
              Location Type <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                id="edit-loc-type"
                value={type}
                onChange={handleTypeChange}
                className="w-full appearance-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 px-3.5 pr-10 text-sm font-medium text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
            </div>
          </div>

          {/* Parent Location Field */}
          <div>
            <label
              htmlFor="edit-loc-parent"
              className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5"
            >
              Parent Location
            </label>
            <div className="relative">
              <FolderTree
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <select
                id="edit-loc-parent"
                value={parentLocationId}
                onChange={handleParentChange}
                disabled={type === "LAB" || parentOptions.length === 0}
                className="w-full appearance-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-10 text-sm font-medium text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none transition-colors disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)]"
              >
                {type === "LAB" ? (
                  <option value="">Laboratories are top-level (no parent)</option>
                ) : (
                  <option value="">
                    {parentOptions.length === 0
                      ? "No valid parents available for this type"
                      : `Select a ${(LOCATION_TYPES.find((t) => t.value === type)?.label || "").toLowerCase()} parent...`}
                  </option>
                )}
                {parentOptions.map((loc) => (
                  <option key={loc.id} value={loc.id} title={loc.path}>
                    {loc.path}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              Place cabinets, shelves, and fridges inside a Room, and rooms inside a Laboratory.
            </p>
          </div>

          {/* Actions Footer */}
          <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLocationModal;
