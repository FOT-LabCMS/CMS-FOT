import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { differenceInYears, format, parseISO } from 'date-fns';
import { FileText, Search, Loader2, ServerCrash, Download, Eye, ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import api from '../../../api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { getSdsFilename, getSdsUrl, downloadSdsFile } from '../../../utils/sds';
import { useAuth } from '../../../context/AuthContext';
import DeleteConfirmationModal from '../../../components/Common/DeleteConfirmationModal';

const PAGE_SIZE = 10;

const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const formatDisplayDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  try {
    return format(parseISO(value), 'MMM dd, yyyy');
  } catch {
    return 'N/A';
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

const PageHeader = () => {
  const navigate = useNavigate();
  return (
    <header className="mb-8 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
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
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-[var(--color-accent-light)]">
              <FileText size={32} />
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold text-[var(--color-text-inverse)]">
                SDS Library
              </h1>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const ViewSdsLibrary = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sdsToDelete, setSdsToDelete] = useState(null);
  const [isDeleteProcessing, setIsDeleteProcessing] = useState(false);
  const debouncedSearch = useDebouncedValue(searchTerm);
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const handleSdsDeleteRequest = async () => {
    if (!sdsToDelete) return;

    setIsDeleteProcessing(true);
    try {
      await api.delete(`/chemicals/${sdsToDelete.id}/sds`);
      await queryClient.invalidateQueries({ queryKey: ['chemicalsWithSds'] });
      setSdsToDelete(null);
    } catch (err) {
      alert('Failed to delete SDS document: ' + (err.response?.data?.message || err.message));
      setSdsToDelete(null);
    } finally {
      setIsDeleteProcessing(false);
    }
  };

  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['chemicalsWithSds', currentPage, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      const response = await api.get(`/chemicals/with-sds?${params.toString()}`);
      if (response.data?.success) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Failed to fetch SDS documents.');
    },
    placeholderData: keepPreviousData,
  });

  const chemicals = useMemo(() => data?.chemicals || [], [data]);
  const pagination = data?.pagination || {
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  };

  const renderContent = () => {
    if (isLoading && !data) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-[var(--color-text-secondary)]">
          <Loader2 size={40} className="animate-spin text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold">Loading SDS Library...</h3>
          <p>Please wait while we fetch the documents.</p>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-danger)] bg-[var(--color-surface)] py-20 text-center text-[var(--color-danger)]">
          <ServerCrash size={40} />
          <h3 className="text-lg font-semibold">Failed to Load SDS Library</h3>
          <p className="max-w-md">{error.message}</p>
        </div>
      );
    }

    if (chemicals.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-20 text-center text-[var(--color-text-secondary)]">
          <FileText size={40} />
          <h3 className="text-lg font-semibold">No SDS Documents Found</h3>
          <p>
            {searchTerm
              ? 'No documents match your search criteria.'
              : 'Upload SDS for chemicals to see them here.'}
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-surface-muted)]">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-left font-semibold text-[var(--color-text-primary)]">Chemical</th>
                  <th scope="col" className="px-4 py-3.5 text-left font-semibold text-[var(--color-text-primary)]">Formula</th>
                  <th scope="col" className="px-4 py-3.5 text-left font-semibold text-[var(--color-text-primary)]">Revision</th>
                  <th scope="col" className="px-4 py-3.5 text-left font-semibold text-[var(--color-text-primary)]">Uploaded On</th>
                  <th scope="col" className="px-4 py-3.5 text-left font-semibold text-[var(--color-text-primary)]">Checksum</th>
                  <th scope="col" className="relative px-4 py-3.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {chemicals.map((chemical) => {
                  const sdsUrl = getSdsUrl(chemical.sdsStorageKey);
                  const sdsFilename = chemical.sdsOriginalFilename || getSdsFilename(chemical.sdsStorageKey);
                  const needsReview = isSdsOutdated(chemical.sdsRevisionDate);

                  return (
                    <tr key={chemical.id} className="hover:bg-[var(--color-surface-muted)]">
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-[var(--color-text-primary)]">
                        <div className="font-bold">{chemical.canonicalName}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{chemical.binCardNumber}</div>
                        <div className="mt-1 max-w-56 truncate text-xs text-[var(--color-text-muted)]">
                          {sdsFilename || 'SDS document'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-[var(--color-text-secondary)]">{chemical.formula || 'N/A'}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-[var(--color-text-secondary)]">
                        <div className="font-semibold text-[var(--color-text-primary)]">
                          {formatDisplayDate(chemical.sdsRevisionDate)}
                        </div>
                        {needsReview && (
                          <span className="mt-1 inline-flex rounded-full bg-[var(--color-warning)]/15 px-2 py-0.5 text-xs font-bold text-[var(--color-warning)]">
                            Review due
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-[var(--color-text-secondary)]">
                        {formatDisplayDate(chemical.sdsUploadedAt)}
                        {chemical.sdsFileSize && (
                          <div className="text-xs text-[var(--color-text-muted)]">
                            {(chemical.sdsFileSize / 1024 / 1024).toFixed(2)} MB
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-[var(--color-text-secondary)]">
                        {chemical.sdsChecksum ? `${chemical.sdsChecksum.slice(0, 16)}...` : 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={sdsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] color-transition hover:bg-[var(--color-surface-muted)]"
                            title="Preview SDS in new tab"
                          >
                            <Eye size={14} />
                            Preview
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setDownloadingId(chemical.id);
                                await downloadSdsFile(chemical.id, sdsFilename);
                              } catch (err) {
                                console.error('Download error:', err);
                                alert('Failed to download SDS document: ' + (err.response?.data?.message || err.message));
                              } finally {
                                setDownloadingId(null);
                              }
                            }}
                            disabled={downloadingId === chemical.id}
                            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)] disabled:opacity-60"
                            title="Download SDS"
                          >
                            {downloadingId === chemical.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                            Download
                          </button>
                          {isAuthenticated && (user.role === "ADMIN" || user.role === "TECHNICAL_OFFICER") && (
                            <button
                              type="button"
                              onClick={() => setSdsToDelete(chemical)}
                              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3 py-2 text-xs font-semibold text-[var(--color-danger)] color-transition hover:bg-[var(--color-danger)] hover:text-[var(--color-text-inverse)]"
                              title="Delete SDS"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {pagination.totalPages > 1 && (
          <div className={`mt-4 flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-sm)] sm:px-6 ${isPlaceholderData ? 'opacity-60' : ''}`}>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Showing{' '}
              <span className="font-semibold text-[var(--color-text-primary)]">
                {(currentPage - 1) * PAGE_SIZE + 1}
              </span>
              {'–'}
              <span className="font-semibold text-[var(--color-text-primary)]">
                {Math.min(currentPage * PAGE_SIZE, pagination.total)}
              </span>
              {' of '}
              <span className="font-semibold text-[var(--color-text-primary)]">
                {pagination.total}
              </span>{' '}
              documents
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

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    disabled={isPlaceholderData}
                    className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-[var(--radius-sm)] border px-2 text-xs font-semibold transition-colors ${
                      page === currentPage
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]'
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages || isPlaceholderData}
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
        <div className="mx-auto w-full max-w-7xl">
          <PageHeader />

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

          {renderContent()}
        </div>
      </main>

      <DeleteConfirmationModal
        isOpen={Boolean(sdsToDelete)}
        onClose={() => setSdsToDelete(null)}
        onConfirm={handleSdsDeleteRequest}
        isProcessing={isDeleteProcessing}
        title="Delete SDS Document"
        message={`Are you sure you want to delete the SDS document "${sdsToDelete?.sdsOriginalFilename || 'the SDS document'}" for "${sdsToDelete?.canonicalName || 'this chemical'}"? This will permanently remove the file from the SDS library and cannot be undone.`}
        confirmText="Yes, Delete SDS"
      />
    </div>
  );
};

export default ViewSdsLibrary;
