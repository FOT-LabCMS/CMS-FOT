import React from "react";
import {
  Microscope,
  ArrowLeft,
  Calendar,
  Wrench,
  Sparkles,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "../components/Common/Footer";
import appConfig from "../config/appConfig";

const Instruments = () => {
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
                    <Sparkles size={14} />
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

          {/* Under Development Placeholder Card */}
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 sm:p-14 text-center shadow-[var(--shadow-sm)]">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--color-primary-tint)] text-[var(--color-primary)] flex items-center justify-center mb-6">
              <Microscope className="w-8 h-8" />
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 px-3.5 py-1 text-xs font-bold text-amber-800 uppercase tracking-wider mb-4">
              Module Under Development
            </span>

            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
              Instruments Portal Coming Soon
            </h2>

            <p className="max-w-xl mx-auto text-sm text-[var(--color-text-secondary)] leading-relaxed mb-8">
              The instruments & equipment directory is currently being designed.
              Future capabilities will include real-time apparatus availability,
              calibration history, maintenance logs, and slot booking for
              academic research.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-bg)]">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-tint)] text-[var(--color-primary)] flex items-center justify-center mb-2">
                  <Search className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                  Apparatus Directory
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Catalogues of spectrometers, centrifuges, autoclaves, and
                  microscopes.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-bg)]">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-tint)] text-[var(--color-primary)] flex items-center justify-center mb-2">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                  Equipment Booking
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Online reservation system for research students and lecturers.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-bg)]">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-tint)] text-[var(--color-primary)] flex items-center justify-center mb-2">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                  Calibration Logs
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Maintenance schedules and technical inspection records.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-xs font-bold text-[var(--color-text-inverse)] shadow-sm transition hover:bg-[var(--color-primary-light)]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Main Menu</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ---------------- Footer ---------------- */}
      <Footer />
    </div>
  );
};

export default Instruments;
