import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2,
  ServerCrash,
  ArrowLeft,
  MapPin,
  Warehouse,
  Box,
  Refrigerator,
  ChevronRight,
  FlaskConical,
  Pencil,
  Trash2,
} from 'lucide-react';
import api from '../../api/axiosInstance';
import EditLocationModal from '../../components/locations/EditLocationModal';
import DeleteLocationModal from '../../components/locations/DeleteLocationModal';

// Reusable recursive component to render the location tree
const LocationHierarchyNode = ({ node, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const hasBatches = node.batches && node.batches.length > 0;

  const LOCATION_META = {
    LAB: { icon: Warehouse, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    ROOM: { icon: Warehouse, color: 'text-green-600', bg: 'bg-green-100' },
    CABINET: { icon: Box, color: 'text-blue-600', bg: 'bg-blue-100' },
    SHELF: { icon: Box, color: 'text-sky-600', bg: 'bg-sky-100' },
    FRIDGE: { icon: Refrigerator, color: 'text-cyan-600', bg: 'bg-cyan-100' },
    OTHER: { icon: MapPin, color: 'text-gray-600', bg: 'bg-gray-100' },
  };
  const meta = LOCATION_META[node.type] || LOCATION_META.OTHER;
  const Icon = meta.icon;

  return (
    <div className="my-1">
      <div className="group flex items-center rounded-[var(--radius-md)] bg-[var(--color-surface)] p-2.5 shadow-[var(--shadow-sm)]">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] ${!hasChildren && !hasBatches ? 'invisible' : ''}`}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          <ChevronRight size={18} className={`transform transition-transform duration-200 ${isOpen ? 'rotate-90' : 'rotate-0'}`} />
        </button>
        <div className="ml-2 flex flex-1 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${meta.bg} ${meta.color}`}>
            <Icon size={18} />
          </div>
          <div>
            <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">{node.name}</p>
            <p className={`text-xs font-semibold ${meta.color}`}>{node.type}</p>
          </div>
        </div>

        {/* Action buttons on hover */}
        <div className="ml-auto flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 pr-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(node)}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)] transition-colors"
              title="Edit Location"
            >
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(node)}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              title="Delete Location"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {isOpen && (hasChildren || hasBatches) && (
        <div className="relative pl-8 pt-2">
          <div className="absolute bottom-0 left-[27px] top-0 w-px bg-[var(--color-border)]" />
          <div className="space-y-2">
            {hasBatches && (
              <div className="space-y-1.5 pt-1">
                {node.batches.map(batch => (
                  <Link
                    key={batch.id}
                    to={`/chemicals/${batch.chemical.id}`}
                    className="relative flex items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-2 pl-3 shadow-[var(--shadow-xs)] color-transition hover:bg-[var(--color-surface-muted)]"
                  >
                    <FlaskConical size={16} className="shrink-0 text-[var(--color-primary)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{batch.chemical.canonicalName}</p>
                      <p className="truncate text-xs text-[var(--color-text-secondary)]">
                        Batch: {batch.batchNumber} | Qty: {batch.currentQuantity} {batch.chemical.baseUnit}
                      </p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-[var(--color-text-muted)]" />
                  </Link>
                ))}
              </div>
            )}
            {hasChildren && (
              <div className="space-y-1">
                {node.children.map(childNode => (
                  <LocationHierarchyNode
                    key={childNode.id}
                    node={childNode}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const LocationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allLocations, setAllLocations] = useState([]);
  const [editingLocation, setEditingLocation] = useState(null);
  const [deletingLocation, setDeletingLocation] = useState(null);

  const reloadLocationDetails = useCallback(async () => {
    try {
      const [detailsRes, allRes] = await Promise.all([
        api.get(`/locations/${id}`),
        api.get('/locations'),
      ]);

      if (detailsRes.data?.success) {
        setLocation(detailsRes.data.location);
      }
      if (allRes.data?.success) {
        setAllLocations(allRes.data.locations);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not find the requested location.');
    }
  }, [id]);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.get(`/locations/${id}`),
      api.get('/locations'),
    ])
      .then(([detailsRes, allRes]) => {
        if (!ignore) {
          if (detailsRes.data?.success) setLocation(detailsRes.data.location);
          if (allRes.data?.success) setAllLocations(allRes.data.locations);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.response?.data?.message || err.message || 'Could not find the requested location.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  const handleEditClick = (loc) => {
    setEditingLocation(loc);
  };

  const handleDeleteClick = (loc) => {
    setDeletingLocation(loc);
  };

  const handleUpdateSuccess = (updatedLoc) => {
    if (updatedLoc.id === id) {
      setLocation((prev) => ({ ...prev, ...updatedLoc }));
    } else {
      reloadLocationDetails();
    }
    setEditingLocation(null);
  };

  const handleDeleteSuccess = (deletedId) => {
    setDeletingLocation(null);
    if (deletedId === id) {
      navigate('/locations');
    } else {
      reloadLocationDetails();
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] text-center text-[var(--color-text-secondary)]">
        <Loader2 size={48} className="animate-spin text-[var(--color-primary)]" />
        <h3 className="text-xl font-semibold">Loading Location Details...</h3>
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
          onClick={() => navigate('/locations')}
          className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-[var(--color-text-inverse)]"
        >
          <ArrowLeft size={18} />
          Back to All Locations
        </button>
      </div>
    );
  }

  if (!location) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[var(--color-primary-light)] opacity-30" />
              <div className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-[var(--color-accent)] opacity-10" />
              <div className="relative">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/locations')}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
                  >
                    <ArrowLeft size={17} />
                    Back to List
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditClick(location)}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3.5 py-2 text-xs font-bold text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-accent-light)]"
                    >
                      <Pencil size={14} />
                      Edit Location
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(location)}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-[var(--shadow-sm)] color-transition hover:bg-rose-700"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="max-w-3xl">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                      <MapPin size={14} />
                      Location Details
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                    {location.name}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-inverse)] opacity-80 sm:text-base">
                    Viewing the hierarchical structure and contents of this location.
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <LocationHierarchyNode
              node={location}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          </div>

          {/* Edit Location Modal */}
          {editingLocation && (
            <EditLocationModal
              location={editingLocation}
              allLocations={allLocations}
              onClose={() => setEditingLocation(null)}
              onSuccess={handleUpdateSuccess}
            />
          )}

          {/* Delete Location Confirmation Modal */}
          {deletingLocation && (
            <DeleteLocationModal
              location={deletingLocation}
              onClose={() => setDeletingLocation(null)}
              onSuccess={handleDeleteSuccess}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default LocationDetails;