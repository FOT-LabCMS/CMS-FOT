import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, ArrowLeft, Loader2, Search, ServerCrash } from 'lucide-react';
import api from '../../api/axiosInstance';
import ChemicalCard from '../../components/Common/ChemicalCard';
import EditChemicalModal from '../../components/chemicals/EditChemicalModal';
import DeleteConfirmationModal from '../../components/Common/DeleteConfirmationModal';

const ViewDeactivatedChemicals = () => {
  const navigate = useNavigate();
  const [chemicals, setChemicals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingChemical, setEditingChemical] = useState(null);
  const [reactivatingChemical, setReactivatingChemical] = useState(null);
  const [isReactivateProcessing, setIsReactivateProcessing] = useState(false);

  useEffect(() => {
    const fetchChemicals = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/chemicals/inactive'); // Fetch inactive chemicals
        if (response.data?.success) {
          setChemicals(response.data.chemicals);
        } else {
          throw new Error('Failed to fetch deactivated chemicals from the server.');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'An unknown error occurred.');
        console.error("Error fetching deactivated chemicals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChemicals();
  }, []);

  const filteredChemicals = chemicals.filter(
    (chemical) =>
      chemical.canonicalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chemical.binCardNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (chemical) => {
    setEditingChemical(chemical);
  };

  const handleCloseModal = () => {
    setEditingChemical(null);
  };

  const handleUpdateSuccess = (updatedChemical) => {
    // Even if updated, it remains in this list until reactivated.
    // So we just update the local state.
    setChemicals(prev => prev.map(c => c.id === updatedChemical.id ? updatedChemical : c));
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
      // Remove the reactivated chemical from the list
      setChemicals(prev => prev.filter(c => c.id !== reactivatingChemical.id));
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
          <p className="mx-auto mt-2 max-w-md">{error}</p>
        </div>
      );
    }

    if (filteredChemicals.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-20 text-center text-[var(--color-text-secondary)]">
          <Archive size={40} />
          <h3 className="text-lg font-semibold">No Deactivated Chemicals</h3>
          <p className="max-w-md">There are currently no chemicals in the deactivated list.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredChemicals.map((chemical) => (
          <ChemicalCard
            key={chemical.id}
            chemical={chemical}
            onEdit={handleEditClick}
            onReactivate={handleReactivateClick}
            isDeactivated
          />
        ))}
      </div>
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