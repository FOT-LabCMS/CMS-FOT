import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Microscope, Plus, Loader2, ServerCrash, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/axiosInstance';
import InstrumentCard from '../../components/instruments/InstrumentCard';
import EditInstrumentModal from '../../components/instruments/EditInstrumentModal';
import DeleteConfirmationModal from '../../components/Common/DeleteConfirmationModal';
import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 7;

const ViewInstruments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingInstrument, setEditingInstrument] = useState(null);
  const [deletingInstrument, setDeletingInstrument] = useState(null);
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading: loading, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['instruments', currentPage, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const response = await api.get(`/instruments?${params.toString()}`);
      if (response.data?.success) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Failed to fetch instruments from the server.');
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  const instruments = data?.instruments || [];
  const pagination = data?.pagination || { total: instruments.length, page: 1, limit: PAGE_SIZE, totalPages: 1 };
  const totalPages = pagination.totalPages;

  const deleteMutation = useMutation({
    mutationFn: (instrumentId) => api.delete(`/instruments/${instrumentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      setDeletingInstrument(null);
    },
    onError: (error) => {
      console.error("Failed to deactivate instrument:", error);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (instrumentId) => api.patch(`/instruments/${instrumentId}/reactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
    },
    onError: (error) => {
      console.error("Failed to reactivate instrument:", error);
    },
  });

  const handleEditClick = (instrument) => {
    setEditingInstrument(instrument);
  };

  const handleDeleteClick = (instrument) => {
    setDeletingInstrument(instrument);
  };

  const handleReactivateClick = (instrument) => {
    reactivateMutation.mutate(instrument.id);
  };

  const handleCloseModal = () => {
    setEditingInstrument(null);
  };

  const handleUpdateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['instruments'] });
    handleCloseModal();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-center text-[var(--color-text-secondary)] py-20">
          <Loader2 size={40} className="animate-spin text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold">Loading Instruments...</h3>
          <p>Please wait while we fetch the data.</p>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-center text-[var(--color-danger)] py-20 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-danger)]">
          <ServerCrash size={40} />
          <h3 className="text-lg font-semibold">Failed to Load Instruments</h3>
          <p className="max-w-md">{error.message}</p>
        </div>
      );
    }

    if (instruments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-center text-[var(--color-text-secondary)] py-20 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)]">
          <Microscope size={40} />
          <h3 className="text-lg font-semibold">No Instruments Found</h3>
          <p>Your instrument list is empty. Add a new instrument to get started.</p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {instruments.map((instrument) => (
            <InstrumentCard
              key={instrument.id}
              instrument={instrument}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onReactivate={handleReactivateClick}
            />
          ))}
        </div>

        {totalPages > 1 && (
          <div className={`mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row ${isPlaceholderData ? 'opacity-60' : ''}`}>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Showing{" "}
              <span className="font-semibold text-[var(--color-text-primary)]">
                {(currentPage - 1) * PAGE_SIZE + 1}
              </span>
              {"–"}
              <span className="font-semibold text-[var(--color-text-primary)]">
                {Math.min(currentPage * PAGE_SIZE, pagination.total)}
              </span>
              {" of "}
              <span className="font-semibold text-[var(--color-text-primary)]">
                {pagination.total}
              </span>{" "}
              instruments
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isPlaceholderData}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  disabled={isPlaceholderData}
                  className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-[var(--radius-sm)] border px-2 text-xs font-semibold transition-colors ${
                    page === currentPage
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || isPlaceholderData}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-screen-2xl">
          <header className="mb-8 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[var(--color-primary-light)] opacity-30" />
              <div className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-[var(--color-accent)] opacity-10" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                      <Microscope size={14} />
                      Instrument Inventory
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                    Laboratory Instruments
                  </h1>
                </div>
                {isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'TECHNICAL_OFFICER') && (
                  <div className="shrink-0">
                    <Link
                      to="/instruments/add"
                      className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-accent-light)]"
                    >
                      <Plus size={18} />
                      Add New Instrument
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="mb-6">
            <div className="relative">
              <Search
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or description..."
                className="w-full max-w-lg rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-12 pr-4 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-tint)]"
              />
            </div>
          </div>

          {renderContent()}

          {editingInstrument && (
            <EditInstrumentModal
              instrument={editingInstrument}
              onClose={handleCloseModal}
              onSuccess={handleUpdateSuccess}
            />
          )}
          {deletingInstrument && (
            <DeleteConfirmationModal
              isOpen={!!deletingInstrument}
              onClose={() => setDeletingInstrument(null)}
              onConfirm={() => deleteMutation.mutate(deletingInstrument.id)}
              isProcessing={deleteMutation.isPending}
              title="Deactivate Instrument"
              message={`Are you sure you want to deactivate "${deletingInstrument.name}"? This action will hide it from the instrument list but will not remove historical data.`}
              confirmText="Yes, Deactivate"
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default ViewInstruments;