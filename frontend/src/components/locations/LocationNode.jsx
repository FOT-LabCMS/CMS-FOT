import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Warehouse, Box, Refrigerator, ChevronRight, Eye, Pencil, FlaskConical } from 'lucide-react';

const LOCATION_META = {
  LAB: { icon: Warehouse, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  CABINET: { icon: Box, color: 'text-blue-600', bg: 'bg-blue-100' },
  SHELF: { icon: Box, color: 'text-sky-600', bg: 'bg-sky-100' },
  FRIDGE: { icon: Refrigerator, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  OTHER: { icon: MapPin, color: 'text-gray-600', bg: 'bg-gray-100' },
};

const LocationNode = ({ node, onEdit, isPublicView = false }) => {
  const [isOpen, setIsOpen] = useState(true);
  const meta = LOCATION_META[node.type] || LOCATION_META.OTHER;
  const Icon = meta.icon;
  const hasChildren = node.children && node.children.length > 0;
  const hasBatches = node.batches && node.batches.length > 0;
  const visibleBatchCount = node.batchCount || node.batches?.length || 0;

  const nodeContent = (
    <div className="my-1">
      <div
        className="group flex items-center rounded-[var(--radius-md)] bg-[var(--color-surface)] p-2.5 shadow-[var(--shadow-sm)] transition-colors duration-200 hover:bg-[var(--color-surface-muted)]"
      >
        {/* Expander */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] ${
            !hasChildren && !hasBatches ? 'invisible' : ''
          }`}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          <ChevronRight
            size={18}
            className={`transform transition-transform duration-200 ${isOpen ? 'rotate-90' : 'rotate-0'}`}
          />
        </button>

        {/* Icon and Name */}
        {!isPublicView ? (
          <Link
            to={`/locations/${node.id}`}
            className="ml-2 flex flex-1 items-center gap-3 min-w-0"
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${meta.bg} ${meta.color}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--color-text-primary)] hover:text-[var(--color-primary)]">{node.name}</p>
              <div className="flex items-center gap-2">
                <p className={`text-xs font-semibold ${meta.color}`}>{node.type}</p>
              </div>
            </div>
          </Link>
        ) : (
          <div className="ml-2 flex flex-1 items-center gap-3 min-w-0">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${meta.bg} ${meta.color}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">{node.name}</p>
              <div className="flex items-center gap-2">
                <p className={`text-xs font-semibold ${meta.color}`}>{node.type}</p>
                {visibleBatchCount > 0 && (
                  <span className="text-[11px] font-medium text-gray-500">
                    ({visibleBatchCount} item{visibleBatchCount > 1 ? 's' : ''})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {!isPublicView && (
          <div className="ml-auto flex items-center gap-2 pr-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Link
              to={`/locations/${node.id}`}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:bg-white hover:text-[var(--color-text-primary)]"
              title="View Details"
            >
              <Eye size={16} />
            </Link>
            <button
              type="button"
              onClick={() => onEdit(node)}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)]"
              title="Edit Location"
            >
              <Pencil size={16} />
            </button>
          </div>
        )}
      </div>

      {(hasChildren || hasBatches) && isOpen && (
        <div className="relative pl-8 pt-2">
          <div className="absolute bottom-0 left-[27px] top-0 w-px bg-[var(--color-border)]" />
          <div className="space-y-2">
            {isPublicView && hasBatches && (
              <div className="space-y-1.5 pt-1">
                {node.batches.map((batch) => (
                  <Link
                    key={batch.id}
                    to={`/chemicals/${batch.chemical.id}`}
                    className="relative flex items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-2 pl-3 shadow-[var(--shadow-xs)] color-transition hover:bg-[var(--color-surface-muted)]"
                  >
                    <FlaskConical size={16} className="shrink-0 text-[var(--color-primary)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {batch.chemical.canonicalName}
                      </p>
                      <p className="truncate text-xs text-[var(--color-text-secondary)]">
                        Batch: {batch.batchNumber} | Qty: {batch.currentQuantity} {batch.chemical.baseUnit}
                      </p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-[var(--color-text-muted)]" />
                  </Link>
                ))}
              </div>
            )}
            {node.children.map((childNode) => (
              <LocationNode key={childNode.id} node={childNode} onEdit={onEdit} isPublicView={isPublicView} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return nodeContent;
};

export default LocationNode;
