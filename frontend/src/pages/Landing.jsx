import {
  FlaskConical,
  Microscope,
  ArrowRight,
  Shield,
  Sparkles,
  Layers,
  CheckCircle2,
  Atom,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Common/Footer";
import Header from "../components/Common/Header";

const Landing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const cardRefs = useRef([]);

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
      // Preserve the `from` state (e.g. a scanned batch route that was
      // protected) so the user returns to it after logging in.
      navigate("/login", { state: location.state });
    }
  };

  const handleInstrumentsClick = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    navigate("/instruments");
  };

  /* ============================================================
     3D CARD MOUSE EFFECT
     ============================================================ */

  useEffect(() => {
    const cards = cardRefs.current;

    const handleMouseMove = (event, card) => {
      if (!card || window.innerWidth < 768) return;

      const rect = card.getBoundingClientRect();

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const rotateX = ((y - rect.height / 2) / rect.height) * -5;
      const rotateY = ((x - rect.width / 2) / rect.width) * 5;

      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);

      card.style.transform = `
        perspective(1200px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        translateY(-8px)
      `;
    };

    const handleMouseLeave = (card) => {
      if (!card) return;

      card.style.transform = "";
      card.style.setProperty("--mouse-x", "50%");
      card.style.setProperty("--mouse-y", "50%");
    };

    cards.forEach((card) => {
      if (!card) return;

      const moveHandler = (event) => handleMouseMove(event, card);
      const leaveHandler = () => handleMouseLeave(card);

      card.addEventListener("mousemove", moveHandler);
      card.addEventListener("mouseleave", leaveHandler);

      card._moveHandler = moveHandler;
      card._leaveHandler = leaveHandler;
    });

    return () => {
      cards.forEach((card) => {
        if (!card) return;

        card.removeEventListener("mousemove", card._moveHandler);
        card.removeEventListener("mouseleave", card._leaveHandler);
      });
    };
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#061b13] font-[family-name:var(--font-body)] text-white selection:bg-[#cba358] selection:text-[#062c1e]">
      {/* ============================================================
          BACKGROUND SYSTEM
          ============================================================ */}

      {/* Base background */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(38,91,68,0.45),transparent_42%),linear-gradient(135deg,#061b13_0%,#072418_45%,#04150e_100%)]" />

      {/* Top left ambient light */}
      <div className="pointer-events-none fixed -left-[18%] -top-[18%] z-0 h-[55vw] w-[55vw] max-h-[700px] max-w-[700px] animate-[ambientMove_12s_ease-in-out_infinite] rounded-full bg-[#1b4332]/40 blur-[120px]" />

      {/* Bottom right ambient light */}
      <div className="pointer-events-none fixed -bottom-[20%] -right-[15%] z-0 h-[50vw] w-[50vw] max-h-[650px] max-w-[650px] animate-[ambientMoveReverse_15s_ease-in-out_infinite] rounded-full bg-[#cba358]/10 blur-[130px]" />

      {/* Center glow */}
      <div className="pointer-events-none fixed left-[45%] top-[40%] z-0 h-[30vw] w-[30vw] max-h-[500px] max-w-[500px] animate-[pulse_12s_ease-in-out_infinite] rounded-full bg-[#2e6350]/15 blur-[110px]" />

      {/* Extra gold glow */}
      <div className="pointer-events-none fixed left-[15%] top-[65%] z-0 h-[20vw] w-[20vw] max-h-[300px] max-w-[300px] animate-[goldPulse_9s_ease-in-out_infinite] rounded-full bg-[#cba358]/[0.04] blur-[100px]" />

      {/* Subtle grid */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ============================================================
          FLOATING PARTICLES
          ============================================================ */}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <span className="absolute left-[8%] top-[18%] h-1 w-1 animate-[float_7s_ease-in-out_infinite] rounded-full bg-[#d6aa5e] shadow-[0_0_15px_#d6aa5e]" />

        <span className="absolute left-[20%] top-[48%] h-1.5 w-1.5 animate-[float_9s_ease-in-out_infinite_1s] rounded-full bg-[#4ade80] shadow-[0_0_18px_#4ade80]" />

        <span className="absolute right-[18%] top-[30%] h-1.5 w-1.5 animate-[float_8s_ease-in-out_infinite_2s] rounded-full bg-[#4ade80] shadow-[0_0_18px_#4ade80]" />

        <span className="absolute right-[8%] top-[58%] h-1 w-1 animate-[float_10s_ease-in-out_infinite_1s] rounded-full bg-[#cba358] shadow-[0_0_15px_#cba358]" />

        <span className="absolute left-[30%] bottom-[25%] h-1 w-1 animate-[float_8s_ease-in-out_infinite_2s] rounded-full bg-white/60 shadow-[0_0_12px_white]" />

        <span className="absolute right-[35%] bottom-[15%] h-1 w-1 animate-[float_11s_ease-in-out_infinite] rounded-full bg-[#cba358] shadow-[0_0_15px_#cba358]" />

        <span className="absolute left-[52%] top-[15%] h-1 w-1 animate-[float_12s_ease-in-out_infinite_3s] rounded-full bg-white/40 shadow-[0_0_12px_white]" />

        <span className="absolute left-[70%] bottom-[32%] h-1.5 w-1.5 animate-[float_9s_ease-in-out_infinite_2s] rounded-full bg-[#d6aa5e]/70 shadow-[0_0_15px_#d6aa5e]" />
      </div>

      {/* ============================================================
          HEADER
          ============================================================ */}

      <div className="relative z-50">
        <Header />
      </div>

      {/* ============================================================
          MAIN
          ============================================================ */}

      <main className="relative z-10 flex w-full flex-1 flex-col">
        {/* ==========================================================
            HERO
            ========================================================== */}

        <section className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-10 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8 lg:pb-20 lg:pt-24">
          {/* Eyebrow */}
          <div className="landing-fade-up mb-7">
            <div className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-[#cba358]/30 bg-white/[0.045] px-4 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl">
              {/* Shine */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

              <Sparkles className="relative h-3.5 w-3.5 animate-[sparkle_3s_ease-in-out_infinite] text-[#d6aa5e]" />

              <span className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-[#d6aa5e] sm:text-xs">
                Centralized Lab Infrastructure
              </span>
            </div>
          </div>

          {/* Main heading */}
          <div className="landing-fade-up landing-delay-1 text-center">
            <h1 className="mx-auto max-w-5xl text-[2.25rem] font-serif font-bold leading-[1.08] tracking-[-0.035em] sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block text-white">Welcome to</span>

              <span className="luxury-shimmer mt-2 block bg-gradient-to-r from-[#f9f1d8] via-[#d6aa5e] to-[#f1dfb0] bg-clip-text text-transparent">
                Faculty Laboratory Chemical
              </span>

              <span className="block text-white/90">Management</span>
            </h1>
          </div>

          {/* Description */}
          <div className="landing-fade-up landing-delay-2">
            <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-7 text-white/55 sm:mt-7 sm:text-base sm:leading-8 lg:text-lg">
              Select a laboratory division below to explore resources, inventory
              catalogues, safety data, and apparatus portals.
            </p>
          </div>

          {/* Decorative line */}
          <div className="landing-fade-up landing-delay-3 mt-8 flex items-center gap-3">
            <span className="h-px w-10 animate-[lineGlow_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent to-[#cba358]/60 sm:w-16" />

            <span className="h-1.5 w-1.5 animate-[diamondPulse_3s_ease-in-out_infinite] rotate-45 border border-[#cba358] bg-[#cba358]/20" />

            <span className="h-px w-10 animate-[lineGlow_3s_ease-in-out_infinite] bg-gradient-to-l from-transparent to-[#cba358]/60 sm:w-16" />
          </div>
        </section>

        {/* ==========================================================
            PORTALS
            ========================================================== */}

        <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-7">
            {/* ======================================================
                CHEMICALS
                ====================================================== */}

            <div
              ref={(element) => {
                cardRefs.current[0] = element;
              }}
              className="landing-card group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.10] bg-white/[0.045] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8 lg:p-9"
            >
              {/* Mouse spotlight */}
              <div className="pointer-events-none absolute left-[var(--mouse-x,50%)] top-[var(--mouse-y,50%)] z-0 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4ade80]/10 opacity-0 blur-[65px] transition-opacity duration-300 group-hover:opacity-100" />

              {/* Card glow */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#4ade80]/10 blur-[70px] transition-all duration-700 group-hover:bg-[#4ade80]/20" />

              {/* Bottom glow */}
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-[#cba358]/[0.04] blur-[80px] transition-all duration-700 group-hover:bg-[#cba358]/10" />

              {/* Top border */}
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#4ade80]/50 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative z-10 flex flex-1 flex-col">
                {/* Icon + badge */}
                <div className="mb-8 flex items-start justify-between gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-2xl bg-[#4ade80]/20 blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#4ade80]/25 bg-gradient-to-br from-[#1b4332] to-[#092016] text-[#4ade80] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-500 group-hover:scale-105 group-hover:border-[#4ade80]/50 sm:h-16 sm:w-16">
                      <FlaskConical
                        className="h-7 w-7 animate-[iconFloat_4s_ease-in-out_infinite] sm:h-8 sm:w-8"
                        strokeWidth={1.6}
                      />
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300 sm:text-[10px]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80]" />

                    Private Portal

                  </span>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-serif font-bold tracking-tight text-white transition-colors duration-300 group-hover:text-[#f9f1d8] sm:text-3xl">
                  Chemicals
                </h2>

                {/* Description */}
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/55">
                  Access the laboratory chemical inventory, public catalogue,
                  safety data sheets (SDS), and batch usage tracking.
                </p>

                {/* Features */}
                <ul className="mt-7 space-y-3.5">
                  <li className="flex items-start gap-3 text-xs leading-5 text-white/75 transition-transform duration-300 hover:translate-x-1">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#cba358]" />
                    <span>Chemical catalogue & live availability search</span>
                  </li>

                  <li className="flex items-start gap-3 text-xs leading-5 text-white/75 transition-transform duration-300 hover:translate-x-1">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#cba358]" />
                    <span>
                      Safety Data Sheets (SDS) & hazard classifications
                    </span>
                  </li>

                  <li className="flex items-start gap-3 text-xs leading-5 text-white/75 transition-transform duration-300 hover:translate-x-1">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#cba358]" />
                    <span>Stock tracking & batch management</span>
                  </li>
                </ul>

                {/* Button */}
                <button
                  type="button"
                  onClick={handleChemicalsClick}
                  className="group/button relative mt-8 inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-[#cba358]/30 bg-gradient-to-r from-[#123c2b] via-[#1b513a] to-[#123c2b] px-5 py-3.5 text-sm font-bold text-[#f9f1d8] shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all duration-300 hover:border-[#cba358]/70 hover:from-[#cba358] hover:via-[#d6aa5e] hover:to-[#b8873a] hover:text-[#062c1e] hover:shadow-[0_10px_35px_rgba(203,163,90,0.30)] active:scale-[0.98] sm:py-4"
                >
                  {/* Button shine */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/button:translate-x-full" />

                  <span className="relative z-10">Explore Chemicals</span>

                  <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover/button:translate-x-1" />
                </button>
              </div>
            </div>

            {/* ======================================================
                INSTRUMENTS
                ====================================================== */}

            <div
              ref={(element) => {
                cardRefs.current[1] = element;
              }}
              className="landing-card group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.10] bg-white/[0.045] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8 lg:p-9"
            >
              {/* Mouse spotlight */}
              <div className="pointer-events-none absolute left-[var(--mouse-x,50%)] top-[var(--mouse-y,50%)] z-0 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#cba358]/10 opacity-0 blur-[65px] transition-opacity duration-300 group-hover:opacity-100" />

              {/* Card glow */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#cba358]/10 blur-[70px] transition-all duration-700 group-hover:bg-[#cba358]/20" />

              {/* Bottom glow */}
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-[#4ade80]/[0.04] blur-[80px] transition-all duration-700 group-hover:bg-[#4ade80]/10" />

              {/* Top border */}
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#cba358]/50 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative z-10 flex flex-1 flex-col">
                {/* Icon + badge */}
                <div className="mb-8 flex items-start justify-between gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-2xl bg-[#cba358]/20 blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#cba358]/25 bg-gradient-to-br from-[#1b4332] to-[#092016] text-[#cba358] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-500 group-hover:scale-105 group-hover:border-[#cba358]/50 sm:h-16 sm:w-16">
                      <Microscope
                        className="h-7 w-7 animate-[iconFloat_4.5s_ease-in-out_infinite] sm:h-8 sm:w-8"
                        strokeWidth={1.6}
                      />
                    </div>
                  </div>

                  <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-300 sm:text-[10px]">
                    Public Portal
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-serif font-bold tracking-tight text-white transition-colors duration-300 group-hover:text-[#f9f1d8] sm:text-3xl">
                  Instruments
                </h2>

                {/* Description */}
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/55">
                  Laboratory apparatus directory, scientific equipment booking
                  overview, maintenance schedules, and calibration records.
                </p>

                {/* Features */}
                <ul className="mt-7 space-y-3.5">
                  <li className="flex items-start gap-3 text-xs leading-5 text-white/75 transition-transform duration-300 hover:translate-x-1">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#cba358]" />
                    <span>Scientific apparatus & equipment directory</span>
                  </li>

                  <li className="flex items-start gap-3 text-xs leading-5 text-white/75 transition-transform duration-300 hover:translate-x-1">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#cba358]" />
                    <span>Equipment reservation & booking policy</span>
                  </li>

                  <li className="flex items-start gap-3 text-xs leading-5 text-white/75 transition-transform duration-300 hover:translate-x-1">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#cba358]" />
                    <span>Calibration schedules & technical logs</span>
                  </li>
                </ul>

                {/* Button */}
                <button
                  type="button"
                  onClick={handleInstrumentsClick}
                  className="group/button relative mt-8 inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-[#cba358]/30 bg-gradient-to-r from-[#123c2b] via-[#1b513a] to-[#123c2b] px-5 py-3.5 text-sm font-bold text-[#f9f1d8] shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all duration-300 hover:border-[#cba358]/70 hover:from-[#cba358] hover:via-[#d6aa5e] hover:to-[#b8873a] hover:text-[#062c1e] hover:shadow-[0_10px_35px_rgba(203,163,90,0.30)] active:scale-[0.98] sm:py-4"
                >
                  {/* Button shine */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/button:translate-x-full" />

                  <span className="relative z-10">Explore Instruments</span>

                  <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover/button:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================
          FOOTER
          ============================================================ */}

      <div className="relative z-10">
        <Footer />
      </div>

      {/* ============================================================
          ANIMATION STYLES
          ============================================================ */}

      <style>{`

        /* ========================================================
           FLOATING BACKGROUND
           ======================================================== */

        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
            opacity: 0.35;
          }

          50% {
            transform: translateY(-22px) translateX(8px);
            opacity: 0.9;
          }
        }

        @keyframes ambientMove {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(25px, -20px, 0) scale(1.08);
          }
        }

        @keyframes ambientMoveReverse {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(-25px, 20px, 0) scale(1.1);
          }
        }

        @keyframes goldPulse {
          0%,
          100% {
            opacity: 0.4;
            transform: scale(1);
          }

          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        /* ========================================================
           HERO
           ======================================================== */

        @keyframes landingFadeUp {
          from {
            opacity: 0;
            transform: translateY(22px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .landing-fade-up {
          opacity: 0;
          animation: landingFadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
        }

        .landing-delay-1 {
          animation-delay: 120ms;
        }

        .landing-delay-2 {
          animation-delay: 240ms;
        }

        .landing-delay-3 {
          animation-delay: 360ms;
        }

        /* ========================================================
           GOLD TEXT SHIMMER
           ======================================================== */

        .luxury-shimmer {
          background-size: 200% auto;
          animation: luxuryShimmer 5s linear infinite;
        }

        @keyframes luxuryShimmer {
          0% {
            background-position: 200% center;
          }

          100% {
            background-position: -200% center;
          }
        }

        /* ========================================================
           ICON ANIMATIONS
           ======================================================== */

        @keyframes iconFloat {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-5px) rotate(2deg);
          }
        }

        @keyframes atomFloat {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-3px) rotate(8deg);
          }
        }

        @keyframes sparkle {
          0%,
          100% {
            transform: scale(1) rotate(0deg);
          }

          50% {
            transform: scale(1.2) rotate(15deg);
          }
        }

        /* ========================================================
           DECORATIVE LINE
           ======================================================== */

        @keyframes lineGlow {
          0%,
          100% {
            opacity: 0.45;
          }

          50% {
            opacity: 1;
          }
        }

        @keyframes diamondPulse {
          0%,
          100% {
            transform: rotate(45deg) scale(1);
            opacity: 0.6;
          }

          50% {
            transform: rotate(225deg) scale(1.25);
            opacity: 1;
          }
        }

        /* ========================================================
           CARDS
           ======================================================== */

        .landing-card {
          opacity: 0;
          transform: translateY(35px);
          animation: landingCardIn 0.9s cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
          transform-style: preserve-3d;
          will-change: transform;
          transition:
            transform 0.18s ease-out,
            border-color 0.5s ease,
            background-color 0.5s ease,
            box-shadow 0.5s ease;
        }

        @keyframes landingCardIn {
          from {
            opacity: 0;
            transform: translateY(35px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .landing-card:nth-child(1) {
          animation-delay: 420ms;
        }

        .landing-card:nth-child(2) {
          animation-delay: 560ms;
        }

        /* Card border glow */

        .landing-card::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(
            120deg,
            transparent 20%,
            rgba(203, 163, 88, 0.4),
            transparent 80%
          );
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.5s ease;

          mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);

          mask-composite: exclude;
        }

        .landing-card:hover::after {
          opacity: 1;
        }

        /* ========================================================
           HIGHLIGHT PANEL
           ======================================================== */

        .highlight-panel {
          animation: panelReveal 1s cubic-bezier(0.22, 1, 0.36, 1) 700ms both;
        }

        @keyframes panelReveal {
          from {
            opacity: 0;
            transform: translateY(25px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes panelShine {
          0% {
            transform: translateX(-120%);
          }

          40% {
            transform: translateX(350%);
          }

          100% {
            transform: translateX(350%);
          }
        }

        /* ========================================================
           REDUCED MOTION
           ======================================================== */

        @media (prefers-reduced-motion: reduce) {

          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }

          .landing-fade-up,
          .landing-card,
          .highlight-panel {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }

          .landing-card {
            transform: none !important;
          }
        }

        /* ========================================================
           MOBILE OPTIMIZATION
           ======================================================== */

        @media (max-width: 767px) {

          .landing-card {
            transform: none !important;
          }

          .landing-card:hover {
            transform: translateY(-5px) !important;
          }
        }

      `}</style>
    </div>
  );
};

export default Landing;
