import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import api from '../../api/axiosInstance';

// Reusable recursive component to render the location tree
const LocationHierarchyNode = ({ node }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const hasBatches = node.batches && node.batches.length > 0;

  const LOCATION_META = {
    LAB: { icon: Warehouse, color: 'text-indigo-600', bg: 'bg-indigo-100' },
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
                  <LocationHierarchyNode key={childNode.id} node={childNode} />
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

  useEffect(() => {
    const fetchLocationDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/locations/${id}`);
        if (response.data?.success) {
          setLocation(response.data.location);
        } else {
          throw new Error('Failed to fetch location details.');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Could not find the requested location.');
      } finally {
        setLoading(false);
      }
    };

    fetchLocationDetails();
  }, [id]);

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
                <button
                  type="button"
                  onClick={() => navigate('/locations')}
                  className="mb-5 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
                >
                  <ArrowLeft size={17} />
                  Back to List
                </button>
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
            <LocationHierarchyNode node={location} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default LocationDetails;