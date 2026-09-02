import { useMemo, useState } from "react";
import {
  Microscope,
  ArrowLeft,
  Search,
  Loader2,
  ServerCrash,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/axiosInstance";
import InstrumentCard from "../components/instruments/InstrumentCard";

const Instruments = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data,
    isLoading: loading,
    isError,
    error,
  } = useQuery({
    queryKey: ['publicInstruments'],
    queryFn: async () => {
      const response = await api.get('/instruments/public');
      if (response.data?.success) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Failed to fetch instruments from the server.');
    },
    staleTime: 5 * 60 * 1000,
  });

  const instruments = useMemo(() => {
    const all = data?.instruments || [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return all;
    return all.filter((instrument) =>
      instrument.name?.toLowerCase().includes(q) ||
      instrument.description?.toLowerCase().includes(q)
    );
  }, [data, searchTerm]);

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
          <h3 className="text-lg font-semibold">
            {searchTerm ? "No Instruments Match Your Search" : "No Instruments Available"}
          </h3>
          <p>
            {searchTerm
              ? "Try a different search keyword."
              : "The instrument directory is empty. Please check back later."}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {instruments.map((instrument) => (
          <InstrumentCard
            key={instrument.id}
            instrument={instrument}
            isPublicView
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[var(--color-bg)] font-[family-name:var(--font-body)]">
      {/* ---------------- Header ---------------- */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--color-primary-dark)] bg-[var(--color-primary)] shadow-[var(--shadow-md)] color-transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-7 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Faculty Logo & Home link */}
          <Link to="/" className="flex items-center gap-3 min-w-0 group">
            <img
              src="/faculty_logo.png"
              alt="Faculty Logo"
              className="h-12 w-12 shrink-0 object-cover shadow-sm sm:h-14 sm:w-14 group-hover:scale-105 transition-transform"
            />
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-sm sm:text-base font-semibold text-[var(--color-text-inverse)] leading-tight truncate color-transition">
                Faculty Laboratory Instruments Portal
              </p>
              <p className="text-[11px] sm:text-xs text-[var(--color-accent-light)] mt-1 truncate color-transition hidden sm:block">
                Faculty Of Technology University of Ruhuna
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-[var(--color-text-inverse)] transition hover:bg-white/20"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Main Menu</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- Main Content ---------------- */}
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          {/* Hero Banner */}
          <section className="mb-8 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-lg)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              <div className="absolute inset-x-0 top-0 h-px bg-[var(--color-accent-light)] opacity-70" />
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(214,170,94,0.45)] bg-[rgba(246,244,236,0.08)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                    <Microscope size={14} />
                    Public Directory
                  </span>
                  <h1 className="text-2xl font-extrabold leading-tight text-[var(--color-text-inverse)] sm:text-4xl lg:text-5xl">
                    Laboratory Instruments & Apparatus
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-primary-tint)] sm:text-base">
                    Browse scientific instruments, high-precision laboratory
                    apparatus, calibration schedules, and reservation policies
                    across faculty laboratories.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Search Bar */}
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
                placeholder="Search instruments..."
                className="w-full max-w-lg rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-12 pr-4 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-tint)]"
              />
            </div>
          </div>

          {/* Instruments Grid */}
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Instruments;