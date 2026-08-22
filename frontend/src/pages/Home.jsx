import React, { useState } from "react";
import {
  LogIn,
  FlaskConical,
  Loader2,
  ServerCrash,
  ShieldCheck,
  Search,
  Sparkles,
  GitBranch,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/axiosInstance";
import ChemicalCard from "../components/Common/ChemicalCard";

const AVAILABILITY_FILTERS = [
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "unavailable", label: "Unavailable" },
];

const DEVELOPER_PROFILES = [
  {
    name: "Hasala Perera",
    href: "https://github.com/Hasalapera",
  },
  {
    name: "Sadeepa Dinakara",
    href: "https://github.com/Sadeepa-D",
  },
];

const normalizeSearch = (value) => value.trim().toLowerCase();

const chemicalMatchesSearch = (chemical, searchTerm) => {
  if (!searchTerm) return true;

  return [
    chemical.canonicalName,
    chemical.chemicalCode,
    chemical.formula,
    chemical.physicalState,
    chemical.baseUnit,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(searchTerm));
};



const PublicChemicalsList = ({ searchQuery, availabilityFilter }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["publicChemicals"],
    queryFn: async () => {
      const response = await api.get("/chemicals/public");
      return response.data.chemicals;
    },
  });

  if (isLoading) {
    return <div className="col-span-full flex items-center justify-center gap-2 py-10 text-[var(--color-text-muted)]"><Loader2 className="animate-spin" /> Loading available chemicals...</div>;
  }

  if (isError) {
    return <div className="col-span-full flex items-center justify-center gap-2 py-10 text-[var(--color-danger)]"><ServerCrash /> Could not load chemicals.</div>;
  }

  const searchTerm = normalizeSearch(searchQuery);
  const filteredChemicals = data.filter((chemical) => {
    const isAvailable = Number(chemical.totalStock) > 0;
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && isAvailable) ||
      (availabilityFilter === "unavailable" && !isAvailable);

    return matchesAvailability && chemicalMatchesSearch(chemical, searchTerm);
  });

  if (filteredChemicals.length === 0) {
    return (
      <div className="col-span-full rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-12 text-center text-sm text-[var(--color-text-secondary)]">
        No chemicals match your search and filter.
      </div>
    );
  }

  return filteredChemicals.map((chemical) => <ChemicalCard key={chemical.id} chemical={chemical} isPublicView />);
};



const SearchField = ({ value, onChange, placeholder }) => (
  <div className="relative w-full">
    <Search
      size={18}
      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
    />
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-12 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] pl-11 pr-4 text-sm font-medium text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] color-transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-tint)]"
    />
  </div>
);

const ChemicalFilters = ({ searchQuery, onSearchChange, availabilityFilter, onAvailabilityChange }) => (
  <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-sm)] sm:p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <SearchField
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search chemicals by name, code, formula, state..."
      />
      <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-1 lg:w-[360px]">
        {AVAILABILITY_FILTERS.map((filter) => {
          const isActive = availabilityFilter === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onAvailabilityChange(filter.id)}
              className={`min-h-10 rounded-[var(--radius-sm)] px-2 text-xs font-bold color-transition sm:text-sm ${
                isActive
                  ? "bg-[var(--color-primary-dark)] text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-tint)] hover:text-[var(--color-primary-dark)]"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);



const Home = () => {
  const [chemicalSearch, setChemicalSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  return (
    <div className="min-h-screen w-full flex flex-col bg-[var(--color-bg)] font-[family-name:var(--font-body)]">
      {/* ---------------- Header ---------------- */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--color-primary-dark)] bg-[var(--color-primary)] shadow-[var(--shadow-md)] color-transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-7 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Faculty Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/faculty_logo.png"
              alt="Faculty Logo"
              className="h-12 w-12 shrink-0 object-cover shadow-sm sm:h-14 sm:w-14"
            />
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-sm sm:text-base font-semibold text-[var(--color-text-inverse)] leading-tight truncate color-transition">
                Faculty Laboratory Chemical Management System
              </p>
              <p className="text-[11px] sm:text-xs text-[var(--color-accent-light)] mt-1 truncate color-transition hidden sm:block">
                Faculty Of Technology University of Ruhuna
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              to="/login"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--color-accent-light)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-accent)] hover:text-[var(--color-primary-dark)] sm:px-5"
            >
              <LogIn className="w-4 h-4" strokeWidth={1.8} />
              <span>Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- Main content ---------------- */}
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <section className="mb-8 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-lg)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              <div className="absolute inset-x-0 top-0 h-px bg-[var(--color-accent-light)] opacity-70" />
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(214,170,94,0.45)] bg-[rgba(246,244,236,0.08)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                    <ShieldCheck size={14} />
                    Public Access
                  </span>
                  <h1 className="text-2xl font-extrabold leading-tight text-[var(--color-text-inverse)] sm:text-4xl lg:text-5xl">
                    FOTCMS Public Catalogue
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-primary-tint)] sm:text-base">
                    Explore available chemicals before logging in. Staff can sign in to manage stock, batches, and safety records.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="flex items-center gap-3 text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
                <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                  <FlaskConical size={23} />
                </span>
                Available Chemicals
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                Check the public chemical catalogue and open each item for safety and stock details.
              </p>
            </div>
          </div>

          <ChemicalFilters
            searchQuery={chemicalSearch}
            onSearchChange={setChemicalSearch}
            availabilityFilter={availabilityFilter}
            onAvailabilityChange={setAvailabilityFilter}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            <PublicChemicalsList searchQuery={chemicalSearch} availabilityFilter={availabilityFilter} />
          </div>
        </div>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="w-full border-t border-[rgba(214,170,94,0.34)] bg-[var(--color-primary-dark)] text-[var(--color-text-inverse)]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(214,170,94,0.45)] bg-[rgba(246,244,236,0.08)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                <Sparkles size={14} />
                FOTCMS
              </span>
              <h2 className="text-base font-extrabold leading-tight sm:text-lg">
                Faculty Laboratory Chemical Management System
              </h2>
              <p className="mt-1 text-xs leading-5 text-[var(--color-primary-tint)] sm:text-sm">
                Built to support safer chemical visibility, organised storage, and clear laboratory stock access for the Faculty of Technology.
              </p>
            </div>

            <div className="shrink-0">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent-light)] lg:text-right">
                Developed By
              </p>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {DEVELOPER_PROFILES.map((developer) => (
                  <a
                    key={developer.name}
                    href={developer.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[rgba(214,170,94,0.42)] bg-[rgba(246,244,236,0.07)] px-3.5 text-xs font-bold text-[var(--color-text-inverse)] color-transition hover:border-[var(--color-accent-light)] hover:bg-[var(--color-accent)] hover:text-[var(--color-primary-dark)]"
                  >
                    <GitBranch size={14} />
                    {developer.name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1 border-t border-[rgba(246,244,236,0.12)] pt-3 text-[11px] text-[var(--color-primary-tint)] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 FOTCMS · Faculty Laboratory Chemical Management System</p>
            <a href="https://www.tec.ruh.ac.lk/" target="_blank" className="hover:text-[var(--color-accent-light)] color-transition"><p>Faculty Of Technology</p></a>
            <a href="https://ruh.ac.lk/" target="_blank" className="hover:text-[var(--color-accent-light)] color-transition"><p>University of Ruhuna</p></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
