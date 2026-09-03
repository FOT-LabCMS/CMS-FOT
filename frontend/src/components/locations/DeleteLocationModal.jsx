import { useState } from "react";
import { X, AlertTriangle, Trash2, Loader2, Warehouse, Box, Refrigerator, MapPin } from "lucide-react";
import api from "../../api/axiosInstance";

const LOCATION_META = {
  LAB: { icon: Warehouse, color: "text-indigo-600", bg: "bg-indigo-100", label: "Laboratory" },
  ROOM: { icon: Warehouse, color: "text-green-600", bg: "bg-green-100", label: "Room" },
  CABINET: { icon: Box, color: "text-blue-600", bg: "bg-blue-100", label: "Cabinet" },
  SHELF: { icon: Box, color: "text-sky-600", bg: "bg-sky-100", label: "Shelf" },
  FRIDGE: { icon: Refrigerator, color: "text-cyan-600", bg: "bg-cyan-100", label: "Fridge" },
  OTHER: { icon: MapPin, color: "text-gray-600", bg: "bg-gray-100", label: "Other" },
};

const DeleteLocationModal = ({ location, onClose, onSuccess }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!location) return null;

  const meta = LOCATION_META[location.type] || LOCATION_META.OTHER;
  const Icon = meta.icon;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError("");

      const response = await api.delete(`/locations/${location.id}`);
      if (response.data?.success) {
        onSuccess(location.id);
      } else {
        throw new Error(response.data?.message || "Failed to delete location.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "An error occurred while deleting the location."
      );
    } finally {
      setIsDeleting(false);
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
        className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-rose-50/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-rose-100 text-rose-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-900">Delete Location</h3>
              <p className="text-xs text-rose-700">Confirm permanent deletion</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-white hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Location Summary Card */}
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${meta.bg} ${meta.color}`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-[var(--color-text-primary)] truncate">
                {location.name}
              </p>
              <span className={`inline-block text-xs font-semibold ${meta.color}`}>
                {meta.label || location.type}
              </span>
            </div>
          </div>

          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Are you sure you want to delete this storage location? This action cannot be undone.
          </p>

          <p className="text-xs text-[var(--color-text-muted)] bg-amber-50 border border-amber-200 rounded-[var(--radius-sm)] p-2.5">
            <strong>Note:</strong> Locations containing sub-locations or active chemical batches cannot be deleted until they are emptied or reassigned.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-3.5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-xs"
          >
            {isDeleting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={15} />
                <span>Delete Location</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteLocationModal;
