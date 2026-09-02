import { LogIn, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-primary-dark)] bg-[var(--color-primary)] shadow-[var(--shadow-md)] color-transition">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-7 lg:px-8">
        
        {/* Faculty Logo */}
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/faculty_logo.png"
            alt="Faculty Logo"
            className="h-12 w-12 shrink-0 object-cover shadow-sm sm:h-14 sm:w-14"
          />

          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-display)] text-sm font-semibold leading-tight text-[var(--color-text-inverse)] color-transition sm:text-base">
              Faculty Laboratory Chemical Management System
            </p>

            <p className="mt-1 hidden truncate text-[11px] text-[var(--color-accent-light)] color-transition sm:block sm:text-xs">
              Faculty Of Technology University of Ruhuna
            </p>
          </div>
        </div>

        {/* Login / User Section */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              
              {/* User Details */}
              <div className="hidden flex-col text-right sm:flex">
                <span className="max-w-[150px] truncate text-xs font-bold text-white">
                  {user?.fullName || "User"}
                </span>

                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#cba358]">
                  {user?.role}
                </span>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 transition hover:border-red-400/70 hover:bg-red-500/20"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            /* Login Button */
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#f9f1d8] transition hover:text-[#cba358] hover:shadow-text-[0_0_20px_rgba(203,163,90,0.4)] sm:text-sm"
            >
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </Link>
          )}
        </div>

      </div>
    </header>
  );
};

export default Header;