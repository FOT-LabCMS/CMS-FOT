import React, { useState } from "react";
import { Lock, Eye, EyeOff, KeyRound, X } from "lucide-react";
import api from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";

const PasswordReset = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Fallback for when used as a standalone page
      navigate(-1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!currentPassword || !newPassword) {
      setError("Both current and new passwords are required.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    try {
      setLoading(true);
      await api.post("/users/reset-password", {
        currentPassword,
        newPassword,
      });
      setSuccess("Password updated successfully. Closing...");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(handleClose, 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Password update failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-lg sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 shrink-0 rounded-full bg-[var(--color-primary-tint)] flex items-center justify-center">
            <KeyRound
              className="w-5 h-5 text-[var(--color-primary)]"
              strokeWidth={1.8}
            />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-[family-name:var(--font-display)] font-semibold text-[var(--color-text-primary)]">
              Change Password
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Enter your current password to set a new one
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

          {success && (
            <div className="text-green-600 text-sm mb-4">{success}</div>
          )}
          {/* Current password */}
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Current Password
            </label>
            <div className="relative">
              <Lock
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                strokeWidth={1.8}
              />
              <input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.8} />
                )}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              New Password
            </label>
            <div className="relative">
              <Lock
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                strokeWidth={1.8}
              />
              <input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-10 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.8} />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] color-transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordReset;
