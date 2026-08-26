import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { differenceInCalendarDays, differenceInYears, format, parseISO, startOfDay } from 'date-fns';
import {
  AlertCircle,
  Loader2,
  ServerCrash,
  ArrowLeft,
  FlaskConical,
  Beaker,
  ShieldAlert,
  FileText,
  Download,
  Eye,
  Pencil,
  Trash2,
  Tag,
  Boxes,
  CalendarClock,
  MapPin,
  PackageX,
  TrendingDown,
  ChevronRight as ChevronRightIcon,
  Plus,
  Image as ImageIcon,
  X,
  ZoomIn,
} from 'lucide-react';
import api from '../../api/axiosInstance';
import EditChemicalModal from '../../components/chemicals/EditChemicalModal';
import DeleteConfirmationModal from '../../components/Common/DeleteConfirmationModal';
import { useAuth } from '../../context/AuthContext';
import { getSdsFilename, getSdsUrl, downloadSdsFile } from '../../utils/sds';
import { getChemicalImageUrl } from '../../utils/chemicalImage';

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

const formatDisplayDate = (value) => {
  if (!value) {
    return "N/A";
  }

  try {
    return format(parseISO(value), "MMM dd, yyyy");
  } catch {
    return "N/A";
  }
};

const isSdsOutdated = (revisionDate) => {
  if (!revisionDate) {
    return false;
  }

  try {
    return differenceInYears(new Date(), parseISO(revisionDate)) >= 3;
  } catch {
    return false;
  }
};

const getBatchStatus = (batch) => {
  const statuses = [];
  const currentQuantity = Number(batch.currentQuantity || 0);
  const thresholdQuantity = Number(batch.lowStockThresholdQuantity);

  if (currentQuantity <= 0) {
    statuses.push({
      label: "Out of stock",
      description: "No usable stock remains in this batch.",
      tone: "danger",
      icon: PackageX,
    });
  } else if (
    Number.isFinite(thresholdQuantity) &&
    thresholdQuantity >= 0 &&
    currentQuantity <= thresholdQuantity
  ) {
    statuses.push({
      label: "Low stock",
      description: `At or below the alert threshold (${thresholdQuantity} ${batch.baseUnit || ""}).`.trim(),
      tone: "warning",
      icon: TrendingDown,
    });
  }

  if (batch.expiryDate) {
    try {
      const daysRemaining = differenceInCalendarDays(
        startOfDay(parseISO(batch.expiryDate)),
        startOfDay(new Date()),
      );

      if (daysRemaining < 0) {
        statuses.push({
          label: "Expired",
          description: `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago.`,
          tone: "danger",
          icon: AlertCircle,
        });
      } else if (daysRemaining <= 30) {
        statuses.push({
          label: "Expiring soon",
          description:
            daysRemaining === 0
              ? "Expires today."
              : `Expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
          tone: "warning",
          icon: CalendarClock,
        });
      }
    } catch {
      // Ignore invalid dates from old data and keep the card usable.
    }
  }

  return statuses;
};

const getBatchCardClass = (statuses) => {
  const hasDanger = statuses.some((status) => status.tone === "danger");
  const hasWarning = statuses.some((status) => status.tone === "warning");

  if (hasDanger) {
    return "border-[var(--color-danger)] bg-[var(--color-danger)]/5";
  }

  if (hasWarning) {
    return "border-[var(--color-warning)] bg-[var(--color-warning)]/5";
  }

  return "border-[var(--color-border)] bg-[var(--color-surface-muted)]";
};

const getStatusChipClass = (tone) => {
  if (tone === "danger") {
    return "border-[var(--color-danger)] bg-[var(--color-danger)]/10 text-[var(--color-danger)]";
  }

  if (tone === "warning") {
    return "border-[var(--color-warning)] bg-[var(--color-warning)]/10 text-[var(--color-warning)]";
  }

  return "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]";
};

const BatchList = ({ batches, baseUnit, isAuthenticated }) => {
  if (!batches || batches.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
        No batches are currently in stock for this chemical.
      </div>
    );
  }

  const shouldScroll = batches.length > 3;

  return (
    <div
      className={`space-y-2.5 ${
        shouldScroll
          ? "max-h-[430px] overflow-y-auto pr-1"
          : ""
      }`}
    >
      {batches.map(batch => {
        const statusItems = getBatchStatus({ ...batch, baseUnit });
        const currentQuantity = Number(batch.currentQuantity || 0);
        const thresholdQuantity = Number(batch.lowStockThresholdQuantity);

        return (
          <div
            key={batch.id}
            className={`rounded-[var(--radius-md)] border p-3 shadow-[var(--shadow-sm)] ${getBatchCardClass(statusItems)}`}
          >
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Batch Number: {batch.batchNumber}</p>
                {isAuthenticated && (
                  <p className="text-xs text-[var(--color-text-secondary)]">Received: {formatDisplayDate(batch.receivedDate)}</p>
                )}
              </div>

              {isAuthenticated && (
                <div className="grid grid-cols-2 gap-2 sm:min-w-56">
                  <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-right">
                    <p className={`text-base font-bold ${currentQuantity <= 0 ? "text-[var(--color-danger)]" : "text-[var(--color-primary)]"}`}>
                      {Number.isFinite(currentQuantity) ? currentQuantity : batch.currentQuantity}
                    </p>
                    <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">{baseUnit}</p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-right">
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">{formatDisplayDate(batch.expiryDate)}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Expiry Date</p>
                  </div>
                </div>
              )}
            </div>

            {isAuthenticated && statusItems.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {statusItems.map((status) => {
                  const Icon = status.icon;

                  return (
                    <div
                      key={`${batch.id}-${status.label}`}
                      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${getStatusChipClass(status.tone)}`}
                      title={status.description}
                    >
                      <Icon size={13} className="shrink-0" />
                      <span className="font-bold uppercase">{status.label}</span>
                      <span className="hidden max-w-44 truncate opacity-85 sm:inline">
                        {status.description}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {isAuthenticated && Number.isFinite(thresholdQuantity) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-secondary)]">
                <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 font-semibold">
                  Low stock threshold: {thresholdQuantity} {baseUnit}
                </span>
              </div>
            )}

            {batch.locationPath && batch.locationPath.length > 0 && (
              <div className={`flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-text-secondary)] ${isAuthenticated ? 'mt-2 border-t border-[var(--color-border)] pt-2' : 'mt-2'}`}>
                <MapPin size={13} className="shrink-0" />
                {batch.locationPath.map((loc, index) => (
                  <React.Fragment key={loc.id}>
                    <span>{loc.name}</span>
                    {index < batch.locationPath.length - 1 && <ChevronRightIcon size={13} />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const ChemicalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chemical, setChemical] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleteProcessing, setIsDeleteProcessing] = useState(false);
  const [isDownloadingSds, setIsDownloadingSds] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

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

  useEffect(() => {
    const fetchChemical = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/chemicals/${id}`);
        if (response.data?.success) {
          setChemical(response.data.chemical);
        } else {
          throw new Error('Failed to fetch chemical details.');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Could not find the requested chemical.');
        console.error("Error fetching chemical:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChemical();
  }, [id]);

  const handleUpdateSuccess = (updatedChemical) => {
    setChemical(updatedChemical);
    setIsEditing(false);
  };

  const handleDeleteRequest = async () => {
    setIsDeleteProcessing(true);
    setError(null);
    try {
      await api.delete(`/chemicals/${id}`);
      // Navigate back to the list after successful deactivation.
      // A toast notification could be added here for better UX.
      navigate('/chemicals/list');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate the chemical.');
      // Close the confirmation modal on error to show the page error
      setIsConfirmingDelete(false);
    } finally {
      setIsDeleteProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] text-center text-[var(--color-text-secondary)]">
        <Loader2 size={48} className="animate-spin text-[var(--color-primary)]" />
        <h3 className="text-xl font-semibold">Loading Chemical Details...</h3>
        <p>Please wait a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] text-center text-[var(--color-danger)]">
        <ServerCrash size={48} />
        <h3 className="text-xl font-semibold">Failed to Load Data</h3>
        <p className="max-w-md">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-[var(--color-text-inverse)]"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>
    );
  }

  if (!chemical) return null;

  const sdsUrl = getSdsUrl(chemical.sdsStorageKey);
  const sdsFilename = chemical.sdsOriginalFilename || getSdsFilename(chemical.sdsStorageKey);
  const sdsNeedsReview = isSdsOutdated(chemical.sdsRevisionDate);

  return (
    <>
      <div className="min-h-screen bg-[var(--color-bg)]">
        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
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

                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                          <FlaskConical size={14} />
                          Chemical Details
                        </span>
                      </div>
                      <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                        {chemical.canonicalName}
                      </h1>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-inverse)] opacity-80 sm:text-base">
                        Viewing the master record for chemical code:{" "}
                        <strong className="font-bold text-[var(--color-accent-light)]">{chemical.chemicalCode}</strong>
                      </p>
                    </div>

                    {/* Header Right: Chemical Bottle Image (Above) and Action Buttons (Below) */}
                    <div className="flex flex-col items-center sm:items-end gap-3.5 shrink-0">
                      {chemical.imageUrl && (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setIsImageModalOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              setIsImageModalOpen(true);
                            }
                          }}
                          className="group relative h-28 w-28 sm:h-32 sm:w-32 cursor-pointer overflow-hidden rounded-[var(--radius-md)] border-2 border-white/25 bg-white/10 p-1 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-[var(--color-accent-light)] hover:scale-105 hover:shadow-xl"
                          title="Click to view full chemical bottle image"
                        >
                          <img
                            src={getChemicalImageUrl(chemical.imageUrl)}
                            alt={chemical.canonicalName}
                            className="h-full w-full rounded-[calc(var(--radius-md)-4px)] object-cover"
                            onError={(e) => {
                              e.currentTarget.parentElement.style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-md)] bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                            <div className="flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                              <Eye size={13} />
                              Preview
                            </div>
                          </div>
                        </div>
                      )}

                      {isAuthenticated && (user.role === "ADMIN" || user.role === "TECHNICAL_OFFICER") && (
                        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => setIsConfirmingDelete(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3.5 py-2 text-sm font-semibold text-[var(--color-danger)] color-transition hover:bg-[var(--color-danger)] hover:text-[var(--color-text-inverse)]"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-accent-light)]"
                          >
                            <Pencil size={15} />
                            Edit Chemical
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate("/stock/add", { state: { chemicalId: chemical.id } })}
                            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-primary-light)]"
                          >
                            <Plus size={15} />
                            Add Batch
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Main content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                  <header className="flex items-center gap-3 border-b border-[var(--color-border)] p-4 sm:p-5">
                    <Beaker size={20} className="text-[var(--color-primary)]" />
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">Chemical Identity</h2>
                  </header>
                  <div className="px-4 sm:px-5">
                    <dl className="divide-y divide-[var(--color-border)]">
                      <DetailItem label="Canonical Name" value={chemical.canonicalName} />
                      {isAuthenticated && (user?.role === "ADMIN" || user?.role === "TECHNICAL_OFFICER") && (
                        <DetailItem label="Bin Card Number" value={chemical.binCardNumber} />
                      )}
                      <DetailItem label="CAS Number" value={chemical.casNumber} />
                      <DetailItem label="Chemical Formula" value={chemical.formula} />
                      <DetailItem label="Synonyms">
                        {chemical.synonyms?.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {chemical.synonyms.map((syn, index) => (
                              <span key={index} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                                <Tag size={12} />
                                {syn}
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-[var(--color-text-muted)]">No synonyms listed</span>}
                      </DetailItem>
                    </dl>
                  </div>
                </section>

                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                  <header className="flex items-center gap-3 border-b border-[var(--color-border)] p-4 sm:p-5">
                    <ShieldAlert size={20} className="text-[var(--color-warning)]" />
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">Safety Summary</h2>
                  </header>
                  <div className="p-4 sm:p-5">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {chemical.safetySummary || "No summary provided. Always refer to the official SDS."}
                    </p>
                  </div>
                </section>

                {/* Special Remarks Section - Visible only to TECHNICAL_OFFICER and ADMIN */}
                {isAuthenticated && (user?.role === "ADMIN" || user?.role === "TECHNICAL_OFFICER") && (
                  <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                    <header className="flex items-center gap-3 border-b border-[var(--color-border)] p-4 sm:p-5">
                      <FileText size={20} className="text-[var(--color-primary)]" />
                      <div>
                        <h2 className="text-base font-bold text-[var(--color-text-primary)]">Remarks / Special Notes</h2>
                        <p className="text-xs text-[var(--color-text-muted)]">Confidential (Visible only to Admin & Technical Officers)</p>
                      </div>
                    </header>
                    <div className="p-4 sm:p-5">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {chemical.remarks || "No special remarks or internal notes recorded for this chemical."}
                      </p>
                    </div>
                  </section>
                )}

                {isAuthenticated && (user.role === 'ADMIN' || user.role === 'TECHNICAL_OFFICER' || user.role === 'LECTURER') && (
                  <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                  <header className="flex items-center justify-between border-b border-[var(--color-border)] p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <Boxes size={20} className="text-[var(--color-primary)]" />
                      <h2 className="text-base font-bold text-[var(--color-text-primary)]">In-Stock Batches</h2>
                    </div>
                    {isAuthenticated && (user.role === 'ADMIN' || user.role === 'TECHNICAL_OFFICER') && (
                      <button
                        type="button"
                        onClick={() => navigate('/stock/add', { state: { chemicalId: chemical.id } })}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-tint)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white color-transition"
                      >
                        <Plus size={14} />
                        Add Batch
                      </button>
                    )}
                  </header>
                  <div className="p-4 sm:p-5">
                    <BatchList batches={chemical.batches} baseUnit={chemical.baseUnit} isAuthenticated={isAuthenticated} />
                  </div>
                </section>
                )}
              </div>

              <div className="space-y-6">
                {/* Bin Card Number Section - Visible only to TECHNICAL_OFFICER and ADMIN */}
                {isAuthenticated && (user?.role === "ADMIN" || user?.role === "TECHNICAL_OFFICER") && (
                  <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-primary-light)]/40 bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                    <header className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-primary-tint)]/40 p-4 sm:p-5">
                      <Tag size={20} className="text-[var(--color-primary)]" />
                      <div>
                        <h2 className="text-base font-bold text-[var(--color-text-primary)]">Bin Card Information</h2>
                        <p className="text-xs text-[var(--color-text-muted)]">Restricted to Technical Officers & Admin</p>
                      </div>
                    </header>
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                          Bin Card Number
                        </span>
                        <span className="font-mono text-base font-extrabold text-[var(--color-primary)] tracking-wider">
                          {chemical.binCardNumber || "N/A"}
                        </span>
                      </div>
                    </div>
                  </section>
                )}

                {chemical.imageUrl && (
                  <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                    <header className="flex items-center gap-3 border-b border-[var(--color-border)] p-4 sm:p-5">
                      <ImageIcon size={20} className="text-[var(--color-primary)]" />
                      <h2 className="text-base font-bold text-[var(--color-text-primary)]">Bottle Image</h2>
                    </header>
                    <div className="p-4 sm:p-5 flex justify-center">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setIsImageModalOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setIsImageModalOpen(true);
                          }
                        }}
                        className="group relative max-h-64 w-full cursor-pointer overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-black/5 flex items-center justify-center p-2 transition-all hover:border-[var(--color-primary)]"
                        title="Click to view full image"
                      >
                        <img
                          src={getChemicalImageUrl(chemical.imageUrl)}
                          alt={chemical.canonicalName}
                          className="max-h-60 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.parentElement.style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-md)] bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-xs font-bold text-white shadow">
                            <ZoomIn size={14} />
                            Click to expand
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                  <header className="flex items-center gap-3 border-b border-[var(--color-border)] p-4 sm:p-5">
                    <FlaskConical size={20} className="text-[var(--color-primary)]" />
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">Properties & Stock</h2>
                  </header>
                  <div className="px-4 sm:px-5">
                    <dl className="divide-y divide-[var(--color-border)]">
                      <DetailItem label="Physical State" value={chemical.physicalState} />
                      <DetailItem label="Stock Dimension" value={chemical.stockDimension} />
                      <DetailItem label="Base Unit" value={chemical.baseUnit} />
                      <DetailItem label="Density" value={chemical.densityValue ? `${chemical.densityValue} ${chemical.densityUnit}` : null} />
                    </dl>
                  </div>
                </section>

                <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                  <header className="flex items-center gap-3 border-b border-[var(--color-border)] p-4 sm:p-5">
                    <FileText size={20} className="text-[var(--color-info)]" />
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">SDS Document</h2>
                  </header>
                  <div className="p-4 sm:p-5">
                    {sdsUrl ? (
                      <div>
                        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                                Current document
                              </p>
                              <p className="mt-1 truncate text-sm font-bold text-[var(--color-text-primary)]">
                                {sdsFilename || "SDS document"}
                              </p>
                            </div>
                            {sdsNeedsReview && (
                              <span className="shrink-0 rounded-full bg-[var(--color-warning)]/15 px-2.5 py-1 text-xs font-bold text-[var(--color-warning)]">
                                Review due
                              </span>
                            )}
                          </div>

                          <dl className="grid gap-2 text-xs sm:grid-cols-2">
                            <div>
                              <dt className="text-[var(--color-text-muted)]">Revision date</dt>
                              <dd className="font-semibold text-[var(--color-text-primary)]">
                                {formatDisplayDate(chemical.sdsRevisionDate)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[var(--color-text-muted)]">Uploaded on</dt>
                              <dd className="font-semibold text-[var(--color-text-primary)]">
                                {formatDisplayDate(chemical.sdsUploadedAt)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[var(--color-text-muted)]">File size</dt>
                              <dd className="font-semibold text-[var(--color-text-primary)]">
                                {chemical.sdsFileSize
                                  ? `${(chemical.sdsFileSize / 1024 / 1024).toFixed(2)} MB`
                                  : "N/A"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[var(--color-text-muted)]">SHA-256</dt>
                              <dd className="truncate font-mono text-[11px] font-semibold text-[var(--color-text-primary)]">
                                {chemical.sdsChecksum
                                  ? `${chemical.sdsChecksum.slice(0, 16)}...`
                                  : "N/A"}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <a href={sdsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[var(--color-primary-tint)] px-4 py-3 text-sm font-bold text-[var(--color-primary)] color-transition hover:bg-[var(--color-primary)] hover:text-[var(--color-text-inverse)]">
                            <Eye size={18} />
                            Preview SDS
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setIsDownloadingSds(true);
                                await downloadSdsFile(chemical.id, sdsFilename);
                              } catch (err) {
                                console.error('Download error:', err);
                                alert('Failed to download SDS document: ' + (err.response?.data?.message || err.message));
                              } finally {
                                setIsDownloadingSds(false);
                              }
                            }}
                            disabled={isDownloadingSds}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)] disabled:opacity-60"
                          >
                            {isDownloadingSds ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            Download
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-center text-[var(--color-text-muted)]">
                        <FileText size={32} />
                        <p className="text-sm font-semibold">No SDS on file</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
      {isEditing && <EditChemicalModal chemical={chemical} onClose={() => setIsEditing(false)} onSuccess={handleUpdateSuccess} />}
      <DeleteConfirmationModal
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={handleDeleteRequest}
        isProcessing={isDeleteProcessing}
        title="Deactivate Chemical"
        message={`Are you sure you want to deactivate "${chemical.canonicalName}"? This action will hide it from the main inventory list but will not remove historical data.`}
        confirmText="Yes, Deactivate"
      />
      {/* Full-size Image Preview Modal */}
      {isImageModalOpen && chemical?.imageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chemical Bottle Image Preview"
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
                  {chemical.canonicalName} ({chemical.chemicalCode})
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
                src={getChemicalImageUrl(chemical.imageUrl)}
                alt={chemical.canonicalName}
                className="max-h-[70vh] w-auto max-w-full rounded-[var(--radius-md)] object-contain shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChemicalDetails;
