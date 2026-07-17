"use client";

import { ArrowRight, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { apiRequest } from "@/lib/client/api";
import type { CurrentUser } from "@/lib/client/types";

interface SessionResponse {
  uid: string;
  maskedUid: string;
  balance: number;
}

export function UidGate({ onAuthenticated }: { onAuthenticated: (user: CurrentUser) => void }) {
  const [uid, setUid] = useState("");
  const [password, setPassword] = useState("");
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

    setLoading(true);
    try {
      const session = await apiRequest<SessionResponse>("/api/session", {
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
        <h1 id="uid-title">Enter your UID</h1>
        <p className="uid-modal-note">10,000 event points. No deposits or real-money wagering.</p>
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
            aria-describedby={error ? "uid-error" : undefined}
            autoFocus
          />
          <div className="uid-input-meta">
            <span>{uid.length}/8</span>
            {error && <span id="uid-error" className="form-error">{error}</span>}
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
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
            />
          </div>
          <button className="primary-button wide-button" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}
            Continue
          </button>
        </form>
      </section>
    </div>
  );
}
