import React from "react";
import {
  FlaskConical,
  Microscope,
  LogIn,
  LogOut,
  ArrowRight,
  Shield,
  Sparkles,
  Layers,
  CheckCircle2,
  Atom,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Common/Footer";
import appConfig from "../config/appConfig";

const Landing = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleChemicalsClick = () => {
    if (isAuthenticated) {
      if (user?.role === "COMMON") {
        navigate("/home");
      } else if (user?.role === "LECTURER") {
        navigate("/chemicals/list");
      } else {
        navigate("/dashboard");
      }
    } else {
      navigate("/login");
    }
  };

  const handleInstrumentsClick = () => {
    navigate("/instruments");
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#072418] text-white font-[family-name:var(--font-body)] selection:bg-[#cba358] selection:text-[#072418]">
      {/* ---------------- Background Ambience ---------------- */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,_rgba(27,67,50,0.7)_0%,_transparent_70%)]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-[radial-gradient(circle,_rgba(203,163,90,0.12)_0%,_transparent_70%)]" />
        <div className="absolute top-[40%] right-[15%] w-[35%] h-[35%] rounded-full bg-[radial-gradient(circle,_rgba(46,99,80,0.35)_0%,_transparent_70%)]" />
      </div>

      {/* ---------------- Navigation Header ---------------- */}
      <header className="relative z-20 w-full border-b border-white/10 bg-[#061e14]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl bg-white/5 border border-white/10 p-1 flex items-center justify-center shadow-lg">
              <img
                src="/faculty_logo.png"
                alt="Faculty of Technology Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#cba358]">
                  Faculty of Technology
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-wide truncate">
                Laboratory Management System
              </h1>
              <p className="text-[11px] text-white/60 hidden sm:block">
                University of Ruhuna
              </p>
            </div>
          </div>

          {/* User Auth Action */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-white truncate max-w-[150px]">
                    {user?.fullName || "User"}
                  </span>
                  <span className="text-[10px] text-[#cba358] uppercase tracking-wider font-semibold">
                    {user?.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 hover:border-red-400/70"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full border border-[#cba358]/50 bg-[#cba358]/10 px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#f9f1d8] transition hover:bg-[#cba358] hover:text-[#062c1e] hover:shadow-[0_0_20px_rgba(203,163,90,0.4)]"
              >
                <LogIn className="w-4 h-4" />
                <span>Member Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ---------------- Hero & Portal Section ---------------- */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Intro Tagline */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#cba358]/30 bg-[#cba358]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#d6aa5e] mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Centralized Lab Infrastructure
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-[#f0ece1] to-[#cba358] tracking-tight leading-[1.15]">
            Welcome to Faculty Laboratory Management
          </h2>
          <p className="mt-5 text-sm sm:text-base lg:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            Select a laboratory division below to explore resources, inventory
            catalogues, safety data, and apparatus portals.
          </p>
        </div>

        {/* ============================================================
            PORTAL SELECTION CARDS (Chemicals vs Instruments)
            ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto w-full mb-12">
          {/* 1. Chemicals Portal Card */}
          <div className="group relative rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-7 sm:p-9 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-[#cba358]/60 hover:shadow-[0_0_40px_rgba(203,163,90,0.18)] hover:-translate-y-1.5 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#4ade80]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#4ade80]/20 transition-all" />

            <div>
              {/* Badge & Icon */}
              <div className="flex items-center justify-between mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1b4332] to-[#0e2a20] border border-[#4ade80]/30 flex items-center justify-center text-[#4ade80] shadow-inner group-hover:scale-105 group-hover:border-[#4ade80]/60 transition-transform">
                  <FlaskConical className="w-8 h-8" strokeWidth={1.8} />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Portal
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-3 group-hover:text-[#f4ebdc] transition-colors">
                Chemicals
              </h3>
              <p className="text-sm text-white/70 leading-relaxed mb-6">
                Access the laboratory chemical inventory, public catalogue,
                safety data sheets (SDS), and batch usage tracking.
              </p>

              {/* Feature bullets */}
              <ul className="space-y-2.5 mb-8 text-xs text-white/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#cba358] shrink-0" />
                  <span>Chemical catalogue & live availability search</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#cba358] shrink-0" />
                  <span>Safety Data Sheets (SDS) & hazard classifications</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#cba358] shrink-0" />
                  <span>Stock tracking & batch management</span>
                </li>
              </ul>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleChemicalsClick}
              className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#1b4332] via-[#245b44] to-[#1b4332] border border-[#cba358]/50 px-6 py-4 text-sm font-bold text-[#f9f1d8] shadow-lg transition-all duration-200 group-hover:from-[#cba358] group-hover:via-[#d6aa5e] group-hover:to-[#b8873a] group-hover:text-[#062c1e] group-hover:shadow-[0_0_25px_rgba(203,163,90,0.5)] active:scale-[0.98]"
            >
              <span>Explore Chemicals</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* 2. Instruments Portal Card (Public Access) */}
          <div className="group relative rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-7 sm:p-9 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-[#cba358]/60 hover:shadow-[0_0_40px_rgba(203,163,90,0.18)] hover:-translate-y-1.5 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#cba358]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#cba358]/20 transition-all" />

            <div>
              {/* Badge & Icon */}
              <div className="flex items-center justify-between mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1b4332] to-[#0e2a20] border border-[#cba358]/30 flex items-center justify-center text-[#cba358] shadow-inner group-hover:scale-105 group-hover:border-[#cba358]/60 transition-transform">
                  <Microscope className="w-8 h-8" strokeWidth={1.8} />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 px-3 py-1 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  Public Portal
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-3 group-hover:text-[#f4ebdc] transition-colors">
                Instruments
              </h3>
              <p className="text-sm text-white/70 leading-relaxed mb-6">
                Laboratory apparatus directory, scientific equipment booking
                overview, maintenance schedules, and calibration records.
              </p>

              {/* Feature bullets */}
              <ul className="space-y-2.5 mb-8 text-xs text-white/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#cba358] shrink-0" />
                  <span>Scientific apparatus & equipment directory</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#cba358] shrink-0" />
                  <span>Equipment reservation & booking policy</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#cba358] shrink-0" />
                  <span>Calibration schedules & technical logs</span>
                </li>
              </ul>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleInstrumentsClick}
              className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#1b4332] via-[#245b44] to-[#1b4332] border border-[#cba358]/50 px-6 py-4 text-sm font-bold text-[#f9f1d8] shadow-lg transition-all duration-200 group-hover:from-[#cba358] group-hover:via-[#d6aa5e] group-hover:to-[#b8873a] group-hover:text-[#062c1e] group-hover:shadow-[0_0_25px_rgba(203,163,90,0.5)] active:scale-[0.98]"
            >
              <span>Explore Instruments</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Highlights Bar */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 max-w-5xl mx-auto w-full grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#cba358]/10 border border-[#cba358]/30 flex items-center justify-center text-[#cba358] shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Role-Based Security
              </h4>
              <p className="text-[11px] text-white/60 mt-0.5">
                Regulated access for Common, Lecturer, and Admin staff.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/30 flex items-center justify-center text-[#4ade80] shrink-0">
              <Atom className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Biosystem Labs
              </h4>
              <p className="text-[11px] text-white/60 mt-0.5">
                Department of Biosystems Technology facilities.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/20 flex items-center justify-center text-white shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Unified Ecosystem
              </h4>
              <p className="text-[11px] text-white/60 mt-0.5">
                Integrated management for chemicals & laboratory apparatus.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ---------------- Footer ---------------- */}
      <Footer />
    </div>
  );
};

export default Landing;
