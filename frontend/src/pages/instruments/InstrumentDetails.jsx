import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2,
  ServerCrash,
  ArrowLeft,
  Microscope,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Wrench,
  ShieldCheck,
  LinkIcon,
  CalendarClock,
  Image as ImageIcon,
  X,
  ZoomIn,
  Eye,
} from "lucide-react";
import api from "../../api/axiosInstance";
import EditInstrumentModal from "../../components/instruments/EditInstrumentModal";
import DeleteConfirmationModal from "../../components/Common/DeleteConfirmationModal";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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

const DetailItem = ({ label, value, children }) => {
  if (!value && !children) {
    return null;
  }
  return (
    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
      <dt className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-[var(--color-text-primary)] sm:col-span-2 sm:mt-0">
        {children || value || <span className="text-[var(--color-text-muted)]">N/A</span>}
      </dd>
    </div>
  );
};

const InstrumentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canModify =
    user?.role === "ADMIN" || user?.role === "TECHNICAL_OFFICER";

  const [editingInstrument, setEditingInstrument] = useState(null);
  const [deletingInstrument, setDeletingInstrument] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    if (!isImageModalOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsImageModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isImageModalOpen]);

  const {
    data,
    isLoading: loading,
    isError,
    error,
  } = useQuery({
    queryKey: ['instrument', id],
    queryFn: async () => {
      const response = await api.get(`/instruments/${id}`);
      if (response.data?.success) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Failed to fetch instrument from the server.');
    },
    staleTime: 5 * 60 * 1000,
  });

  const instrument = data?.instrument;

  const deleteMutation = useMutation({
    mutationFn: (instrumentId) => api.delete(`/instruments/${instrumentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      queryClient.invalidateQueries({ queryKey: ['publicInstruments'] });
      navigate('/instruments/list');
    },
    onError: (error) => {
      console.error("Failed to deactivate instrument:", error);
    },
  });

  const handleUpdateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['instruments'] });
    queryClient.invalidateQueries({ queryKey: ['publicInstruments'] });
    queryClient.invalidateQueries({ queryKey: ['instrument', id] });
    setEditingInstrument(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center text-[var(--color-text-secondary)] py-20">
          <Loader2 size={40} className="animate-spin text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold">Loading Instrument...</h3>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center gap-4 text-center text-[var(--color-danger)] py-20 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-danger)]">
          <ServerCrash size={40} />
          <h3 className="text-lg font-semibold">Failed to Load Instrument</h3>
          <p className="max-w-md">{error.message}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!instrument) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center gap-4 text-center text-[var(--color-text-secondary)] py-20 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)]">
          <Microscope size={40} />
          <h3 className="text-lg font-semibold">Instrument Not Found</h3>
          <button
            type="button"
            onClick={() => navigate('/instruments/list')}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
          >
            <ArrowLeft size={16} />
            Back to Instruments
          </button>
        </div>
      </div>
    );
  }

  const resolvedImageUrl = getInstrumentImageUrl(instrument.imageUrl);
  const badge = AVAILABILITY_BADGE[instrument.availability] || DEFAULT_BADGE;
  const BadgeIcon = badge.icon;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-5 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] color-transition hover:bg-[var(--color-surface-muted)]"
          >
            <ArrowLeft size={17} />
            Back
          </button>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
            {/* Header */}
            <div className="flex flex-col gap-6 border-b border-[var(--color-border)] p-5 sm:p-7 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  role={resolvedImageUrl ? "button" : undefined}
                  tabIndex={resolvedImageUrl ? 0 : undefined}
                  onClick={resolvedImageUrl ? () => setIsImageModalOpen(true) : undefined}
                  onKeyDown={resolvedImageUrl ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setIsImageModalOpen(true);
                    }
                  } : undefined}
                  className={`h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-primary-tint)] sm:h-28 sm:w-28 ${
                    resolvedImageUrl ? "group relative cursor-pointer transition-all duration-300 hover:border-[var(--color-primary)] hover:shadow-lg" : ""
                  }`}
                >
                  {resolvedImageUrl ? (
                    <>
                      <img
                        src={resolvedImageUrl}
                        alt={instrument.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-lg)] bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                          <Eye size={13} />
                          Preview
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--color-primary)]">
                      <Microscope size={44} />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h1 className="text-xl font-extrabold leading-tight text-[var(--color-text-primary)] sm:text-2xl lg:text-3xl">
                    {instrument.name}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                    >
                      <BadgeIcon size={12} />
                      {badge.label}
                    </span>
                    {canModify && instrument.warranty && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                        <ShieldCheck size={12} />
                        Warranty: {instrument.warranty}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {canModify && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingInstrument(instrument)}
                    className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingInstrument(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-red-600/10 px-4 py-2.5 text-sm font-semibold text-red-600 color-transition hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 size={16} />
                    Deactivate
                  </button>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="p-5 sm:p-7">
              <dl className="divide-y divide-[var(--color-border)]">
                <DetailItem label="Description">
                  <p className="whitespace-pre-line leading-6">{instrument.description || "No description provided."}</p>
                </DetailItem>
                <DetailItem label="Availability">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                    <BadgeIcon size={12} />
                    {badge.label}
                  </span>
                </DetailItem>
                {canModify && instrument.warranty && (
                  <DetailItem label="Warranty">
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck size={15} className="text-[var(--color-primary)]" />
                      {instrument.warranty}
                    </span>
                  </DetailItem>
                )}
                {instrument.tutorialVideo && (
                  <DetailItem label="Tutorial">
                    <a
                      href={instrument.tutorialVideo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:underline"
                    >
                      <LinkIcon size={15} />
                      Watch tutorial video
                    </a>
                  </DetailItem>
                )}
                <DetailItem label="Added">
                  <span className="inline-flex items-center gap-2">
                    <CalendarClock size={15} className="text-[var(--color-text-muted)]" />
                    {new Date(instrument.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </DetailItem>
              </dl>
            </div>
          </div>
        </div>
      </main>

      {editingInstrument && (
        <EditInstrumentModal
          instrument={editingInstrument}
          onClose={() => setEditingInstrument(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}
      {deletingInstrument && (
        <DeleteConfirmationModal
          isOpen={deletingInstrument}
          onClose={() => setDeletingInstrument(false)}
          onConfirm={() => deleteMutation.mutate(instrument.id)}
          isProcessing={deleteMutation.isPending}
          title="Deactivate Instrument"
          message={`Are you sure you want to deactivate "${instrument.name}"? This action will hide it from the instrument list but will not remove historical data.`}
          confirmText="Yes, Deactivate"
        />
      )}
      {/* Full-size Image Preview Modal */}
      {isImageModalOpen && resolvedImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Instrument Image Preview"
          onClick={() => setIsImageModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[var(--radius-lg)] border border-white/20 bg-[var(--color-surface)] shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2.5">
                <ImageIcon size={18} className="text-[var(--color-primary)]" />
                <h3 className="font-bold text-sm sm:text-base text-[var(--color-text-primary)] truncate">
                  {instrument.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-danger)] transition-colors"
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Image */}
            <div className="flex max-h-[75vh] items-center justify-center p-4 overflow-auto bg-black/5">
              <img
                src={resolvedImageUrl}
                alt={instrument.name}
                className="max-h-[70vh] w-auto max-w-full rounded-[var(--radius-md)] object-contain shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstrumentDetails;