"use client";

import { CheckCircle2, KeyRound, LoaderCircle, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { apiRequest } from "@/lib/client/api";

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [loading, onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (currentPassword.length < 8 || newPassword.length < 8) {
      setError("Passwords must contain at least 8 characters");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from the current password");
      return;
    }
    if (newPassword !== confirmation) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await apiRequest<{ updated: boolean }>("/api/account/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setUpdated(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-password-title">
        <header className="account-modal-header">
          <div className="account-modal-title">
            <KeyRound size={20} />
            <div><p className="eyebrow">Account security</p><h2 id="account-password-title">Change password</h2></div>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={loading} aria-label="Close password dialog">
            <X size={18} />
          </button>
        </header>

        {updated ? (
          <div className="account-password-success">
            <CheckCircle2 size={28} />
            <h3>Password updated</h3>
            <p>Your current session remains active. Other sessions must sign in again.</p>
            <button className="primary-button wide-button" type="button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form className="account-password-form" onSubmit={submit} noValidate>
            <div>
              <label htmlFor="current-account-password">Current password</label>
              <input
                id="current-account-password"
                name="current-password"
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="new-account-password">New password</label>
              <input
                id="new-account-password"
                name="new-password"
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-account-password">Confirm new password</label>
              <input
                id="confirm-account-password"
                name="confirm-password"
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
            <div className="account-password-status" aria-live="polite">
              {error && <span className="form-error">{error}</span>}
            </div>
            <button className="primary-button wide-button" type="submit" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={18} /> : <KeyRound size={18} />}
              Save password
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
