"use client";

import { ArrowRight, LoaderCircle, LockKeyhole, ShieldCheck, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { apiRequest } from "@/lib/client/api";
import type { CurrentUser } from "@/lib/client/types";

interface SessionResponse {
  uid: string;
  maskedUid: string;
  balance: number;
}

export function UidGate({ onAuthenticated }: { onAuthenticated: (user: CurrentUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [uid, setUid] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!/^\d{8}$/.test(uid)) {
      setError("Enter exactly 8 digits");
      return;
    }
    if (password.length < 8) {
      setError("Password must contain at least 8 characters");
      return;
    }
    if (mode === "register" && password !== passwordConfirmation) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const session = await apiRequest<SessionResponse>(mode === "register" ? "/api/register" : "/api/session", {
        method: "POST",
        body: JSON.stringify({ uid, password }),
      });
      const user = await apiRequest<CurrentUser>("/api/me");
      onAuthenticated({ ...user, uid: session.uid, maskedUid: session.maskedUid });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to start session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="uid-modal" role="dialog" aria-modal="true" aria-labelledby="uid-title">
        <div className="uid-modal-icon" aria-hidden="true">
          <ShieldCheck size={22} />
        </div>
        <p className="eyebrow">MEXC Kickoff Markets</p>
        <h1 id="uid-title">{mode === "login" ? "Enter your UID" : "Create your account"}</h1>
        <p className="uid-modal-note">10,000 event points. No deposits or real-money wagering.</p>
        <div className="auth-mode-switch" role="tablist" aria-label="Account access">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "active" : ""}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={mode === "register" ? "active" : ""}
            onClick={() => { setMode("register"); setError(""); }}
          >
            Create account
          </button>
        </div>
        <form onSubmit={submit} noValidate>
          <label htmlFor="uid">MEXC UID</label>
          <input
            id="uid"
            name="uid"
            value={uid}
            onChange={(event) => setUid(event.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="00000000"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "auth-error" : undefined}
            autoFocus
          />
          <div className="uid-input-meta">
            <span>{uid.length}/8</span>
          </div>
          <label htmlFor="uid-password">Password</label>
          <div className="uid-password-wrap">
            <LockKeyhole size={16} />
            <input
              id="uid-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              aria-invalid={Boolean(error)}
            />
          </div>
          {mode === "register" && (
            <>
              <label htmlFor="uid-password-confirmation">Confirm password</label>
              <div className="uid-password-wrap">
                <LockKeyhole size={16} />
                <input
                  id="uid-password-confirmation"
                  name="password-confirmation"
                  type="password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  autoComplete="new-password"
                  aria-invalid={Boolean(error)}
                />
              </div>
            </>
          )}
          <div className="uid-form-status" aria-live="polite">
            {error && <span id="auth-error" className="form-error">{error}</span>}
          </div>
          <button className="primary-button wide-button" type="submit" disabled={loading}>
            {loading
              ? <LoaderCircle className="spin" size={18} />
              : mode === "register" ? <UserPlus size={18} /> : <ArrowRight size={18} />}
            {mode === "register" ? "Create account" : "Continue"}
          </button>
        </form>
      </section>
    </div>
  );
}
