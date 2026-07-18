"use client";

import { ArrowRight, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { MexcLogo } from "@/components/mexc-logo";
import { apiRequest } from "@/lib/client/api";
import type { CurrentUser } from "@/lib/client/types";

export function AccessGate({ onAuthenticated }: { onAuthenticated: (user: CurrentUser) => void }) {
  const [code, setCode] = useState("");
  const [uid, setUid] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (code.trim().length < 8) {
      setError("Vui lòng nhập mã tham gia hợp lệ");
      return;
    }
    if (!/^\d{8}$/.test(uid)) {
      setError("UID MEXC phải gồm đúng 8 chữ số");
      return;
    }

    setLoading(true);
    try {
      const user = await apiRequest<CurrentUser>("/api/session", {
        method: "POST",
        body: JSON.stringify({ code, uid }),
      });
      onAuthenticated(user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể đăng nhập");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="access-backdrop">
      <section className="access-dialog" role="dialog" aria-modal="true" aria-labelledby="access-title">
        <MexcLogo />
        <div className="access-icon"><ShieldCheck size={22} /></div>
        <p className="eyebrow">MEXC Vietnam Exclusive</p>
        <h1 id="access-title">Tham gia dự đoán</h1>
        <p className="access-note">Nhập mã mời và UID MEXC để bắt đầu hoặc xem lại dự đoán đã gửi.</p>

        <form onSubmit={submit} noValidate>
          <label htmlFor="access-code">Mã tham gia</label>
          <div className="input-with-icon">
            <KeyRound size={17} />
            <input
              id="access-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 32))}
              placeholder="MEXC26-XXXXXXXXXXXX"
              autoComplete="off"
              autoFocus
            />
          </div>

          <label htmlFor="mexc-uid">UID MEXC</label>
          <input
            id="mexc-uid"
            value={uid}
            onChange={(event) => setUid(event.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            placeholder="00000000"
            autoComplete="off"
          />
          <div className="input-meta"><span>{uid.length}/8</span></div>

          <div className="form-status" aria-live="polite">
            {error && <span className="form-error">{error}</span>}
          </div>
          <button className="primary-button wide-button" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}
            Tiếp tục
          </button>
        </form>
        <p className="access-footnote">Một mã có thể được sử dụng cho nhiều UID được mời.</p>
      </section>
    </div>
  );
}
