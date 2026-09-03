import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, ArrowLeft, Loader2, Search, ServerCrash, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/axiosInstance';
import ChemicalCard from '../../components/Common/ChemicalCard';
import EditChemicalModal from '../../components/chemicals/EditChemicalModal';
import DeleteConfirmationModal from '../../components/Common/DeleteConfirmationModal';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

const PAGE_SIZE = 8;

const ViewDeactivatedChemicals = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingChemical, setEditingChemical] = useState(null);
  const [reactivatingChemical, setReactivatingChemical] = useState(null);
  const [isReactivateProcessing, setIsReactivateProcessing] = useState(false);
  const queryClient = useQueryClient();

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading: loading, error, isPlaceholderData } = useQuery({
    queryKey: ['deactivatedChemicals', currentPage, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const response = await api.get(`/chemicals/inactive?${params.toString()}`);
      if (response.data?.success) {
        return response.data;
      }
      throw new Error('Failed to fetch deactivated chemicals from the server.');
    },
    placeholderData: keepPreviousData,
  });

  const chemicals = data?.chemicals || [];
  const pagination = data?.pagination || { total: chemicals.length, page: 1, limit: PAGE_SIZE, totalPages: 1 };
  const totalPages = pagination.totalPages;

  const handleEditClick = (chemical) => {
    setEditingChemical(chemical);
  };

  const handleCloseModal = () => {
    setEditingChemical(null);
  };

  const handleUpdateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['deactivatedChemicals'] });
    handleCloseModal();
  };

  const handleReactivateClick = (chemical) => {
    setReactivatingChemical(chemical);
  };

  const handleConfirmReactivation = async () => {
    if (!reactivatingChemical) return;

    setIsReactivateProcessing(true);
    try {
      await api.patch(`/chemicals/${reactivatingChemical.id}/reactivate`);
      queryClient.invalidateQueries({ queryKey: ['deactivatedChemicals'] });
      queryClient.invalidateQueries({ queryKey: ['chemicals'] });
      setReactivatingChemical(null);
    } catch (err) {
      // You could show an error toast here
      console.error("Failed to reactivate chemical:", err);
      // For now, just log it and close the modal
      setReactivatingChemical(null);
    } finally {
      setIsReactivateProcessing(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-[var(--color-text-secondary)]">
          <Loader2 size={40} className="animate-spin text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold">Loading Deactivated Chemicals...</h3>
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-danger)] bg-[var(--color-surface)] py-20 text-center text-[var(--color-danger)]">
          <ServerCrash size={40} className="mx-auto" />
          <h3 className="mt-4 text-lg font-semibold">Failed to Load Data</h3>
          <p className="mx-auto mt-2 max-w-md">
            {error.response?.data?.message || error.message}
          </p>
        </div>
      );
    }

    if (chemicals.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-20 text-center text-[var(--color-text-secondary)]">
          <Archive size={40} />
          <h3 className="text-lg font-semibold">No Deactivated Chemicals</h3>
          <p className="max-w-md">There are currently no chemicals in the deactivated list.</p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {chemicals.map((chemical) => (
            <ChemicalCard
              key={chemical.id}
              chemical={chemical}
              onEdit={handleEditClick}
              onReactivate={handleReactivateClick}
              isDeactivated
            />
          ))}
        </div>

        {/* Pagination bar */}
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
              chemicals
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
          {/* Page header */}
          <header className="mb-8 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[var(--color-primary-light)] opacity-30" />
              <div className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-[var(--color-accent)] opacity-10" />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => navigate('/chemicals/list')}
                  className="mb-5 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
                >
                  <ArrowLeft size={17} />
                  Back to Inventory
                </button>

                <div className="max-w-3xl">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-danger)]/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-inverse)]">
                      <Archive size={14} />
                      Deactivated
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                    Deactivated Chemicals
                  </h1>
                </div>
              </div>
            </div>
          </header>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or code..."
                className="w-full max-w-lg rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-12 pr-4 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-tint)]"
              />
            </div>
          </div>

          {/* Content Area */}
          {renderContent()}

          {editingChemical && (
            <EditChemicalModal
              chemical={editingChemical}
              onClose={handleCloseModal}
              onSuccess={handleUpdateSuccess}
            />
          )}

          {reactivatingChemical && (
            <DeleteConfirmationModal
              isOpen={!!reactivatingChemical}
              onClose={() => setReactivatingChemical(null)}
              onConfirm={handleConfirmReactivation}
              isProcessing={isReactivateProcessing}
              title="Reactivate Chemical"
              message={`Are you sure you want to reactivate "${reactivatingChemical.canonicalName}"? It will become visible in the main inventory again.`}
              confirmText="Yes, Reactivate"
              variant="success"
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default ViewDeactivatedChemicals;