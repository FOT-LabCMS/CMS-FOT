import { useState } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowLeft,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext";
import appConfig from "../config/appConfig";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [institutionalId, setInstitutionalId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!institutionalId || !password) {
      setError("Both institutional ID and password are required.");
      setLoading(false);
      return;
    }

    try {
      const response = await login(institutionalId, password);
      let userRole = null;
      if (response?.data?.token) {
        try {
          const decoded = jwtDecode(response.data.token);
          userRole = decoded?.role;
        } catch {
          // Ignore decode error
        }
      }
      const defaultRoute = userRole === "LECTURER" ? "/chemicals/list" : "/dashboard";
      const fromPath = location.state?.from?.pathname;
      const targetRoute =
        fromPath && fromPath !== "/dashboard" ? fromPath : defaultRoute;
      navigate(targetRoute, { replace: true });
    } catch (err) {
      if (err.response?.status === 403) {
        setError("User account is deleted");
        return;
      }
      setError(
        err.response?.data?.error ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#fbfbfb] font-sans">
      {/* ============================================================
          LEFT BRAND PANEL (Luxury Green & Gold with Animations)
          ============================================================ */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden bg-[#062c1e] flex-col items-center justify-center text-center border-r-[5px] border-[#b99b5a]/80 shadow-[10px_0_20px_rgba(0,0,0,0.3)] z-10">
        
        {/* CSS Animations */}
        <style>{`
          @keyframes floatParticle {
            0% { transform: translateY(0) scale(0.8); opacity: 0; }
            30% { opacity: 1; }
            100% { transform: translateY(-150px) scale(1.2); opacity: 0; }
          }
          @keyframes pulseGlow {
            0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 6px #4ade80); }
            50% { opacity: 1; filter: drop-shadow(0 0 15px #4ade80); }
          }
          @keyframes swayLines {
            0%, 100% { transform: translateX(0px) translateY(0px) rotate(0deg); }
            50% { transform: translateX(15px) translateY(-10px) rotate(2deg); }
          }
          .particle-gold {
            position: absolute;
            background: #cba358;
            border-radius: 50%;
            box-shadow: 0 0 10px 2px rgba(203, 163, 90, 0.8);
            animation: floatParticle 7s infinite linear;
          }
          .particle-green {
            position: absolute;
            background: #4ade80;
            border-radius: 50%;
            box-shadow: 0 0 12px 3px rgba(74, 222, 128, 0.8);
            animation: floatParticle 6s infinite linear;
          }
          .molecule-anim {
            animation: pulseGlow 4s infinite ease-in-out;
          }
          .wave-anim {
            animation: swayLines 12s infinite ease-in-out;
          }
        `}</style>

        {/* --- Background Animated Elements Container --- */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          
          {/* Base Radial Glows */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle,_rgba(26,92,64,0.6)_0%,_transparent_70%)]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle,_rgba(203,163,90,0.15)_0%,_transparent_70%)]" />

          {/* 1. Floating Sparkles (Particles) */}
          <div className="particle-gold" style={{ left: '15%', top: '85%', width: '4px', height: '4px', animationDelay: '0s' }}></div>
          <div className="particle-gold" style={{ left: '35%', top: '95%', width: '3px', height: '3px', animationDelay: '2.5s' }}></div>
          <div className="particle-gold" style={{ left: '75%', top: '70%', width: '5px', height: '5px', animationDelay: '1.2s' }}></div>
          <div className="particle-green" style={{ left: '65%', top: '85%', width: '4px', height: '4px', animationDelay: '4s' }}></div>
          <div className="particle-green" style={{ left: '25%', top: '45%', width: '5px', height: '5px', animationDelay: '3s' }}></div>
          <div className="particle-green" style={{ left: '85%', top: '35%', width: '3px', height: '3px', animationDelay: '5.5s' }}></div>
          <div className="particle-gold" style={{ left: '45%', top: '25%', width: '4px', height: '4px', animationDelay: '6s' }}></div>

          {/* 2. Molecular Structure (Top Left) */}
          <svg className="absolute top-8 left-8 molecule-anim w-56 h-56 opacity-80" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              {/* Main hexagons */}
              <polygon points="50,40 70,30 90,40 90,60 70,70 50,60" fill="rgba(74, 222, 128, 0.05)" />
              <polygon points="90,60 110,50 130,60 130,80 110,90 90,80" fill="rgba(74, 222, 128, 0.05)" />
              {/* Outer connections */}
              <line x1="70" y1="70" x2="60" y2="100" />
              <line x1="130" y1="80" x2="160" y2="75" />
              <line x1="50" y1="40" x2="25" y2="45" />
              <line x1="90" y1="40" x2="105" y2="20" />
              {/* Inner details (double bonds) */}
              <line x1="55" y1="43" x2="55" y2="57" opacity="0.6"/>
              <line x1="110" y1="55" x2="125" y2="64" opacity="0.6"/>
              {/* Glowing Nodes */}
              <circle cx="60" cy="100" r="4" fill="#4ade80" className="drop-shadow-[0_0_8px_#4ade80]" />
              <circle cx="160" cy="75" r="4.5" fill="#4ade80" className="drop-shadow-[0_0_8px_#4ade80]" />
              <circle cx="25" cy="45" r="3.5" fill="#4ade80" className="drop-shadow-[0_0_8px_#4ade80]" />
              <circle cx="105" cy="20" r="3" fill="#4ade80" />
              <circle cx="70" cy="30" r="2.5" fill="#4ade80" />
              <circle cx="110" cy="90" r="3" fill="#4ade80" />
            </g>
          </svg>

          {/* 3. Wavy Glowing Lines (Bottom Left to Center) */}
          <svg className="absolute -bottom-10 -left-20 wave-anim w-[120%] h-[70%] opacity-60" viewBox="0 0 500 300" preserveAspectRatio="none" fill="none">
            <path d="M -50 250 Q 150 100 550 280" stroke="url(#gradGreen)" strokeWidth="1.5" />
            <path d="M -50 280 Q 200 150 550 320" stroke="url(#gradGreen)" strokeWidth="0.8" opacity="0.7" />
            <path d="M 50 350 Q 250 200 500 250" stroke="url(#gradGold)" strokeWidth="2.5" opacity="0.5" />
            <defs>
              <linearGradient id="gradGreen" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#4ade80" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#cba358" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="gradGold" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0" />
                <stop offset="50%" stopColor="#cba358" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#cba358" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* 4. Wavy Glowing Lines (Top Right crossing center) */}
          <svg className="absolute top-0 -right-10 wave-anim w-[80%] h-[60%] opacity-40" viewBox="0 0 400 300" preserveAspectRatio="none" fill="none" style={{ animationDelay: '-6s' }}>
            <path d="M 450 50 Q 200 150 -50 100" stroke="url(#gradGold2)" strokeWidth="1.5" />
            <path d="M 450 80 Q 250 200 -50 150" stroke="url(#gradGreen2)" strokeWidth="0.8" />
            <defs>
              <linearGradient id="gradGold2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#cba358" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="gradGreen2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#cba358" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        {/* --- End of Background Animations --- */}

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 py-12">
          
          {/* Logo */}
          <div className="w-28 h-32 shrink-0 mb-6 flex items-center justify-center drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <img
              src="/faculty_logo.png"
              alt="Faculty of Technology logo"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Title */}
          <h1 className="font-serif text-6xl md:text-7xl font-semibold text-transparent bg-clip-text bg-gradient-to-b from-[#f9f1d8] to-[#cba358] tracking-widest mb-2 drop-shadow-lg">
            {appConfig.appName}
          </h1>
          
          <p className="text-[#cba358] text-sm md:text-base font-medium tracking-[0.2em] uppercase mb-10">
            Chemical Management System
          </p>

          {/* Separator */}
          <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-[#cba358] to-transparent mb-10 opacity-70"></div>

          {/* Department & Faculty Info */}
          <h2 className="text-white text-lg md:text-xl font-medium tracking-wide mb-2 drop-shadow-md">
            DEPARTMENT OF BIOSYSTEM TECHNOLOGY
          </h2>
          <h3 className="text-white/90 text-md md:text-lg tracking-wide mb-10">
            FACULTY OF TECHNOLOGY
          </h3>

          {/* Separator */}
          <div className="w-12 h-[2px] bg-[#cba358] mb-10 opacity-50 shadow-[0_0_8px_#cba358]"></div>

          {/* University */}
          <h4 className="text-[#cba358] text-xl font-medium tracking-widest">
            UNIVERSITY OF RUHUNA
          </h4>
        </div>

        {/* Footer Note */}
        <p className="absolute bottom-8 text-[10px] text-white/40 uppercase tracking-[0.25em] z-10">
          Administered securely for academic & research use
        </p>
      </div>

      {/* ============================================================
          RIGHT FORM PANEL (Marble White)
          ============================================================ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-12 relative bg-gradient-to-br from-[#ffffff] to-[#f0f2f0]">
        
        {/* Back Button */}
        <Link
          to="/"
          className="absolute top-6 left-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-500 shadow-sm transition-all hover:-translate-x-1 hover:text-[#062c1e]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>

        {/* Mobile Header (Only visible on small screens) */}
        <div className="lg:hidden flex flex-col items-center mb-10">
           <img
              src="/faculty_logo.png"
              alt="Logo"
              className="w-16 h-16 object-contain mb-4"
            />
          <h1 className="font-serif text-4xl font-semibold text-[#062c1e] tracking-widest">
            {appConfig.appName}
          </h1>
        </div>

        <div className="w-full max-w-sm flex flex-col items-center">
          
          {/* Form Header */}
          <h2 className="text-3xl font-serif text-[#062c1e] tracking-wide mb-1">
            MEMBER LOG IN
          </h2>
          <p className="text-xs font-semibold text-gray-500 tracking-[0.2em] uppercase mb-10">
            Secure Access
          </p>

          {error && (
            <div className="mb-6 w-full p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-md">
              {error}
            </div>
          )}

          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            
            {/* Username Input */}
            <div className="relative group">
              <User
                className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#cba358] transition-colors"
                strokeWidth={1.5}
              />
              <input
                id="username"
                type="text"
                value={institutionalId}
                onChange={(e) => setInstitutionalId(e.target.value)}
                autoComplete="username"
                placeholder="Username / Email"
                className="w-full pl-12 pr-5 py-3.5 rounded-full border border-gray-300 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#cba358]/30 focus:border-[#cba358] shadow-sm transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="relative group">
              <Lock
                className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#cba358] transition-colors"
                strokeWidth={1.5}
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Password"
                className="w-full pl-12 pr-12 py-3.5 rounded-full border border-gray-300 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#cba358]/30 focus:border-[#cba358] shadow-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.5} />
                )}
              </button>
            </div>

            {/* Extra Options */}
            <div className="flex items-center justify-between px-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-[#062c1e] focus:ring-[#cba358]/40"
                />
                <span className="text-xs text-gray-600 font-medium">
                  Remember Me
                </span>
              </label>

              <Link
                to="/forgot-password"
                className="text-xs font-medium text-gray-600 underline decoration-gray-300 hover:decoration-[#cba358] hover:text-[#cba358] transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3.5 rounded-full bg-gradient-to-r from-[#052518] to-[#0a3d2b] hover:from-[#062c1e] hover:to-[#0c4a34] text-white text-sm font-semibold tracking-wider shadow-[0_4px_15px_rgba(6,44,30,0.3)] border border-[#cba358]/40 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "AUTHENTICATING..." : "LOG IN"}
            </button>
          </form>

        </div>

        {/* Footer Logos (Right bottom) */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3">
          <p className="text-[10px] text-gray-400 italic">
            Powered by Department of Bio Systems Technology
          </p>
          <div className="w-8 h-8 rounded-full border border-gray-200 p-1 bg-white flex items-center justify-center opacity-60">
             <img src="/faculty_logo.png" alt="University Logo" className="w-full h-full object-contain" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;