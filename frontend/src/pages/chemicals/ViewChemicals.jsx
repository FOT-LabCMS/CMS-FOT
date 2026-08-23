import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Plus, Loader2, ServerCrash, Search } from 'lucide-react';
import api from '../../api/axiosInstance';
import ChemicalCard from '../../components/Common/ChemicalCard';
import EditChemicalModal from '../../components/chemicals/EditChemicalModal';
import DeleteConfirmationModal from '../../components/Common/DeleteConfirmationModal';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

const ViewChemicals = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingChemical, setEditingChemical] = useState(null);
  const [deletingChemical, setDeletingChemical] = useState(null);
  const queryClient = useQueryClient();

  const { data: chemicals = [], isLoading: loading, isError, error } = useQuery({
    queryKey: ['chemicals'],
    queryFn: async () => {
      const response = await api.get('/chemicals');
      if (response.data?.success) {
        return response.data.chemicals;
      }
      throw new Error(response.data?.message || 'Failed to fetch chemicals from the server.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (chemicalId) => api.delete(`/chemicals/${chemicalId}`),
    onSuccess: () => {
      // Refetch the list of active chemicals
      queryClient.invalidateQueries({ queryKey: ['chemicals'] });
      // Also refetch the list of deactivated chemicals for the other page
      queryClient.invalidateQueries({ queryKey: ['deactivatedChemicals'] });
      setDeletingChemical(null);
    },
    onError: (error) => {
      // You can add a toast notification here to show the error
      console.error("Failed to deactivate chemical:", error);
    }
  });

  const filteredChemicals = chemicals.filter(
    (chemical) =>
      chemical.canonicalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chemical.chemicalCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (chemical.formula && chemical.formula.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEditClick = (chemical) => {
    setEditingChemical(chemical);
  };

  const handleDeleteClick = (chemical) => {
    setDeletingChemical(chemical);
  };

  const handleCloseModal = () => {
    setEditingChemical(null);
  };

  const handleUpdateSuccess = (updatedChemical) => {
    queryClient.invalidateQueries({ queryKey: ['chemicals'] });
    handleCloseModal();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-center text-[var(--color-text-secondary)] py-20">
          <Loader2 size={40} className="animate-spin text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold">Loading Chemical Inventory...</h3>
          <p>Please wait while we fetch the data.</p>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-center text-[var(--color-danger)] py-20 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-danger)]">
          <ServerCrash size={40} />
          <h3 className="text-lg font-semibold">Failed to Load Chemicals</h3>
          <p className="max-w-md">{error.message}</p>
        </div>
      );
    }

    if (filteredChemicals.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-center text-[var(--color-text-secondary)] py-20 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)]">
          <FlaskConical size={40} />
          <h3 className="text-lg font-semibold">No Chemicals Found</h3>
          <p>Your inventory is empty. Add a new chemical to get started.</p>
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
            onDelete={handleDeleteClick}
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

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                      <FlaskConical size={14} />
                      Chemical Inventory
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                    Laboratory Chemical List
                  </h1>
                </div>
                <div className="shrink-0">
                  <Link
                    to="/chemicals/add-chemical"
                    className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-accent-light)]"
                  >
                    <Plus size={18} />
                    Add New Chemical
                  </Link>
                </div>
              </div>
            </div>
          </header>

          {/* Search and Filter Bar */}
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
                placeholder="Search by name, code, or formula..."
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
          {deletingChemical && (
            <DeleteConfirmationModal
              isOpen={!!deletingChemical}
              onClose={() => setDeletingChemical(null)}
              onConfirm={() => deleteMutation.mutate(deletingChemical.id)}
              isProcessing={deleteMutation.isPending}
              title="Deactivate Chemical"
              message={`Are you sure you want to deactivate "${deletingChemical.canonicalName}"? This action will hide it from the main inventory list but will not remove historical data.`}
              confirmText="Yes, Deactivate"
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default ViewChemicals;