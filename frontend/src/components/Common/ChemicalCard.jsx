import React from 'react';
import { Beaker, FileText, MoreHorizontal, Pencil, Eye, Undo2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PHYSICAL_STATE_BADGE = {
  LIQUID: 'bg-blue-100 text-blue-800 border-blue-300',
  SOLID: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  GAS: 'bg-green-100 text-green-800 border-green-300',
  OTHER: 'bg-gray-100 text-gray-800 border-gray-300',
};

const ChemicalCard = ({ chemical, onEdit, onDelete, onReactivate, isDeactivated = false, isPublicView = false }) => {
  const { user } = useAuth();
  const canModify = user?.role === 'ADMIN' || user?.role === 'TECHNICAL_OFFICER';

  const {
    id,
    chemicalCode,
    canonicalName,
    formula,
    physicalState,
    stockDimension,
    baseUnit,
    sdsStorageKey,
    totalStock,
  } = chemical;

  return (
    <div
      className={`flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] transition-all duration-300 ${
        isDeactivated
          ? 'opacity-70'
          : 'hover:shadow-[var(--shadow-md)] hover:-translate-y-1'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
            <Beaker size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              {canonicalName}
            </h3>
            <p className="text-xs font-semibold text-[var(--color-accent-dark)]">
              {chemicalCode}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="More options"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] color-transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Card Body */}
      <div className="flex-1 p-4">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--color-text-secondary)]">Formula</dt>
            <dd className="font-medium text-[var(--color-text-primary)]">
              {formula || 'N/A'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--color-text-secondary)]">Stock Unit</dt>
            <dd className="font-medium text-[var(--color-text-primary)]">
              {baseUnit} ({stockDimension})
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center gap-2">
          {isDeactivated && (
            <span className="flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
              Deactivated
            </span>
          )}
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              PHYSICAL_STATE_BADGE[physicalState] || PHYSICAL_STATE_BADGE.OTHER
            }`}
          >
            {physicalState}
          </span>
          {sdsStorageKey && (
            <span className="flex items-center gap-1.5 rounded-full border border-purple-300 bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
              <FileText size={12} />
              SDS Attached
            </span>
          )}
          {isPublicView && totalStock !== undefined && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                Number(totalStock) > 0
                  ? "border-green-300 bg-green-100 text-green-800"
                  : "border-red-300 bg-red-100 text-red-800"
              }`}
            >
              {Number(totalStock) > 0 ? "Available" : "Unavailable"}
            </span>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] p-3">
        <Link
          to={`/chemicals/${id}`}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] color-transition hover:bg-[var(--color-surface-muted)]"
        >
          <Eye size={14} />
          View
        </Link>
        {isDeactivated && !isPublicView && canModify && (
          <button
            type="button"
            onClick={() => onReactivate(chemical)}
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-green-600 px-3 py-2 text-xs font-semibold text-white color-transition hover:bg-green-700"
          >
            <Undo2 size={14} />
            Reactivate
          </button>
        )}
        {!isDeactivated && !isPublicView && canModify && (
          <>
            <button
              type="button"
              onClick={() => onEdit(chemical)}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(chemical)}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-red-600/10 px-3 py-2 text-xs font-semibold text-red-600 color-transition hover:bg-red-600 hover:text-white"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChemicalCard;