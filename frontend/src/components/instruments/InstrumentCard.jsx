import {
  Microscope,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Wrench,
  Link as LinkIcon,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getInstrumentImageUrl } from "../../utils/instrumentImage";

const AVAILABILITY_BADGE = {
  AVAILABLE: {
    label: "Available",
    className: "border-green-300 bg-green-100 text-green-800",
    icon: CheckCircle2,
  },
  UNAVAILABLE: {
    label: "Unavailable",
    className: "border-red-300 bg-red-100 text-red-800",
    icon: XCircle,
  },
  UNDER_MAINTENANCE: {
    label: "Under Maintenance",
    className: "border-amber-300 bg-amber-100 text-amber-800",
    icon: Wrench,
  },
};

const DEFAULT_BADGE = {
  label: "Unknown",
  className: "border-gray-300 bg-gray-100 text-gray-800",
  icon: XCircle,
};

const InstrumentCard = ({
  instrument,
  onEdit,
  onDelete,
  onReactivate,
  isDeactivated = false,
  isPublicView = false,
}) => {
  const { user } = useAuth();
  const canModify =
    user?.role === "ADMIN" || user?.role === "TECHNICAL_OFFICER";

  const {
    id,
    name,
    imageUrl,
    description,
    availability,
    tutorialVideo,
    warranty,
  } = instrument;

  const resolvedImageUrl = getInstrumentImageUrl(imageUrl);
  const badge = AVAILABILITY_BADGE[availability] || DEFAULT_BADGE;
  const BadgeIcon = badge.icon;

  return (
    <Link
      to={`/instruments/${id}`}
      className={`flex cursor-pointer flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] transition-all duration-300 ${
        isDeactivated
          ? "opacity-70"
          : "hover:shadow-[var(--shadow-md)] hover:-translate-y-1"
      }`}
    >
      {/* Image */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-[var(--color-primary-tint)]">
        {resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            alt={name}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--color-primary)]">
            <Microscope size={44} />
          </div>
        )}
        {isPublicView && (
          <span
            className={`absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm ${badge.className}`}
          >
            <BadgeIcon size={12} />
            {badge.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-base font-bold text-[var(--color-text-primary)]">
          {name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[var(--color-text-secondary)]">
          {description || "No description provided."}
        </p>

        {!isPublicView && (
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
            >
              <BadgeIcon size={12} />
              {badge.label}
            </span>
            {isDeactivated && (
              <span className="flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                Deactivated
              </span>
            )}
          </div>
        )}

        <div className="mt-3 space-y-2">
          {!isPublicView && warranty && (
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
              <ShieldCheck size={14} className="shrink-0 text-[var(--color-primary)]" />
              <span className="min-w-0 flex-1 truncate">Warranty: {warranty}</span>
            </div>
          )}
          {tutorialVideo && (
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-primary)]">
              <LinkIcon size={14} className="shrink-0 text-[var(--color-primary)]" />
              Tutorial available
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {!isPublicView && (
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] p-3">
          {isDeactivated && canModify && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onReactivate(instrument);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-green-600 px-3 py-2 text-xs font-semibold text-white color-transition hover:bg-green-700"
            >
              Reactivate
            </button>
          )}
          {!isDeactivated && canModify && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onEdit(instrument);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(instrument);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-red-600/10 px-3 py-2 text-xs font-semibold text-red-600 color-transition hover:bg-red-600 hover:text-white"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </Link>
  );
};

export default InstrumentCard;