import { MapPin, Warehouse, Box, Refrigerator, MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const LOCATION_META = {
  LAB: { icon: Warehouse, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  ROOM: { icon: Warehouse, color: 'text-green-600', bg: 'bg-green-100' },
  CABINET: { icon: Box, color: 'text-blue-600', bg: 'bg-blue-100' },
  SHELF: { icon: Box, color: 'text-sky-600', bg: 'bg-sky-100' },
  FRIDGE: { icon: Refrigerator, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  OTHER: { icon: MapPin, color: 'text-gray-600', bg: 'bg-gray-100' },
};

const LocationCard = ({ location, onEdit, onDelete }) => {
  const { id, name, type } = location;
  const meta = LOCATION_META[type] || LOCATION_META.OTHER;
  const Icon = meta.icon;

  return (
    <div className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:shadow-[var(--shadow-md)] hover:-translate-y-1">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${meta.bg} ${meta.color}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-[var(--color-text-primary)]">
              {name}
            </h3>
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
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1 text-xs font-semibold ${meta.bg} ${meta.color}`}
        >
          {type}
        </span>
        {/* Can add more details here later, like number of items or sub-locations */}
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] p-3">
        <Link
          to={`/locations/${id}`}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] color-transition hover:bg-[var(--color-surface-muted)]"
        >
          <Eye size={14} />
          View
        </Link>
        <button
          type="button"
          onClick={() => onEdit(location)}
          className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
        >
          <Pencil size={14} />
          Edit
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(location)}
            className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-600 hover:text-white transition-colors"
            title="Delete Location"
          >
            <Trash2 size={14} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default LocationCard;