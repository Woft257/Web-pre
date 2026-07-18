"use client";

import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  Download,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { MexcLogo } from "@/components/mexc-logo";
import { apiRequest, formatBangkokTime } from "@/lib/client/api";
import type { AdminContestData, TeamChoice } from "@/lib/client/types";

export function AdminConsole() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState<AdminContestData | null>(null);
  const [winner, setWinner] = useState<TeamChoice>("argentina");
  const [argentinaScore, setArgentinaScore] = useState(0);
  const [spainScore, setSpainScore] = useState(0);
  const [messiScores, setMessiScores] = useState(true);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function headers() {
    return { "x-admin-secret": secret };
  }

  async function loadData(initializeResult = false) {
    const next = await apiRequest<AdminContestData>("/api/admin/contest", { headers: headers() });
    setData(next);
    if (initializeResult && next.draftResult) {
      setWinner(next.draftResult.winner);
      setArgentinaScore(next.draftResult.argentinaScore);
      setSpainScore(next.draftResult.spainScore);
      setMessiScores(next.draftResult.messiScores);
    }
  }

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiRequest<{ authorized: boolean }>("/api/admin/auth", { method: "POST", headers: headers() });
      await loadData(true);
      setAuthenticated(true);
    } catch (requestError) {
      setSecret("");
      setError(requestError instanceof Error ? requestError.message : "Không thể xác thực admin");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: () => Promise<void>) {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await action();
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Thao tác thất bại");
    } finally {
      setLoading(false);
    }
  }

  async function setPredictionsOpen(open: boolean) {
    await runAction(async () => {
      await apiRequest("/api/admin/contest", {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ open }),
      });
      setMessage(open ? "Đã mở nhận dự đoán" : "Đã đóng nhận dự đoán");
    });
  }

  async function publishResult() {
    if (!window.confirm("Công bố kết quả và hiển thị bảng xếp hạng ngay bây giờ?")) return;
    await runAction(async () => {
      await apiRequest("/api/admin/contest", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ winner, argentinaScore, spainScore, messiScores }),
      });
      setMessage("Đã công bố kết quả và bảng xếp hạng");
    });
  }

  async function generateCodes() {
    await runAction(async () => {
      const result = await apiRequest<{ codes: string[] }>("/api/admin/invite-codes", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ count: 1 }),
      });
      setGeneratedCodes((current) => [...result.codes, ...current]);
      setMessage("Đã tạo mã mới. Hãy lưu mã ngay vì hệ thống chỉ lưu bản hash.");
    });
  }

  async function exportCsv(path: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(path, { cache: "no-store", headers: headers() });
      if (!response.ok) throw new Error("Không thể xuất CSV");
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "mexc-contest.csv";
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xuất CSV");
    } finally {
      setLoading(false);
    }
  }

  function lockConsole() {
    setAuthenticated(false);
    setSecret("");
    setData(null);
    setGeneratedCodes([]);
    setMessage("");
    setError("");
  }

  if (!authenticated) {
    return (
      <div className="admin-shell admin-auth-shell">
        <header className="admin-header"><Link href="/"><ArrowLeft size={18} /> Về sự kiện</Link><MexcLogo /><span>Event operations</span></header>
        <main className="admin-auth-main">
          <form className="admin-auth-panel" onSubmit={authenticate}>
            <LockKeyhole size={27} />
            <div><p className="eyebrow">Restricted</p><h1>Admin access</h1></div>
            <label htmlFor="admin-secret">ADMIN_SECRET</label>
            <input id="admin-secret" type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="current-password" autoFocus />
            {error && <div className="admin-notice error"><ShieldAlert size={17} />{error}</div>}
            <button className="primary-button wide-button" type="submit" disabled={loading || !secret}>
              {loading ? <LoaderCircle className="spin" size={18} /> : <KeyRound size={18} />} Mở quản trị
            </button>
          </form>
        </main>
      </div>
    );
  }

  if (!data) return null;
  const submittedCount = data.participants.filter((participant) => participant.prediction).length;

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link href="/"><ArrowLeft size={18} /> Về sự kiện</Link><MexcLogo />
        <button className="icon-button" type="button" onClick={lockConsole} title="Khóa trang admin"><LogOut size={18} /></button>
      </header>
      <main className="admin-main">
        <div className="admin-title-row">
          <div><p className="eyebrow">Restricted operations</p><h1>Quản trị sự kiện dự đoán</h1></div>
          <button className="icon-button" type="button" onClick={() => void loadData()} title="Làm mới"><RefreshCw size={18} /></button>
        </div>

        {(message || error) && <div className={`admin-notice ${error ? "error" : "success"}`}>{error ? <ShieldAlert size={17} /> : <Check size={17} />}{error || message}</div>}

        <section className="admin-stats">
          <div><span>Người tham gia</span><strong>{data.stats.participants}</strong></div>
          <div><span>Đã gửi dự đoán</span><strong>{submittedCount}</strong></div>
          <div><span>Mã đang hoạt động</span><strong>{data.inviteCodes.filter((code) => code.status === "active").length}</strong></div>
          <div><span>Bảng xếp hạng</span><strong>{data.result ? "Đã công bố" : "Chưa công bố"}</strong></div>
        </section>

        <div className="admin-grid">
          <section className="admin-panel">
            <div className="panel-heading"><div><Trophy size={20} /><h2>Kết quả chính thức</h2></div><span className={data.settings.predictionsOpen ? "status-open" : "status-closed"}>{data.settings.predictionsOpen ? "Đang nhận dự đoán" : "Đã đóng"}</span></div>
            <div className="admin-actions-row">
              <button className="secondary-button" type="button" disabled={loading || data.settings.predictionsOpen || Boolean(data.result)} onClick={() => void setPredictionsOpen(true)}>Mở dự đoán</button>
              <button className="danger-button" type="button" disabled={loading || !data.settings.predictionsOpen} onClick={() => void setPredictionsOpen(false)}>Đóng dự đoán</button>
            </div>
            <label>Đội chiến thắng</label>
            <div className="admin-choice-row">
              <button type="button" className={winner === "argentina" ? "selected" : ""} onClick={() => setWinner("argentina")}>Argentina</button>
              <button type="button" className={winner === "spain" ? "selected" : ""} onClick={() => setWinner("spain")}>Tây Ban Nha</button>
            </div>
            <div className="admin-score-row">
              <label>Argentina<input type="number" min={0} max={20} value={argentinaScore} onChange={(event) => setArgentinaScore(Number(event.target.value))} /></label>
              <strong>:</strong>
              <label>Tây Ban Nha<input type="number" min={0} max={20} value={spainScore} onChange={(event) => setSpainScore(Number(event.target.value))} /></label>
            </div>
            <label>Messi ghi bàn</label>
            <div className="admin-choice-row">
              <button type="button" className={messiScores ? "selected" : ""} onClick={() => setMessiScores(true)}>Có</button>
              <button type="button" className={!messiScores ? "selected" : ""} onClick={() => setMessiScores(false)}>Không</button>
            </div>
            <button className="primary-button wide-button" type="button" disabled={loading} onClick={() => void publishResult()}>
              {loading ? <LoaderCircle className="spin" size={18} /> : <Trophy size={18} />}{data.result ? "Cập nhật và công bố lại" : "Công bố bảng xếp hạng"}
            </button>
          </section>

          <section className="admin-panel">
            <div className="panel-heading"><div><KeyRound size={20} /><h2>Mã tham gia dùng chung</h2></div><button className="icon-button" type="button" onClick={() => void generateCodes()} title="Tạo mã mới"><Plus size={18} /></button></div>
            <p className="panel-note">Mỗi mã có thể dùng cho nhiều UID. Mã đầy đủ chỉ hiển thị một lần khi vừa tạo.</p>
            {generatedCodes.map((code) => (
              <div className="generated-code" key={code}><code>{code}</code><button type="button" onClick={() => void navigator.clipboard.writeText(code)} title="Sao chép"><ClipboardCopy size={16} /></button></div>
            ))}
            <div className="code-list">
              {data.inviteCodes.map((code) => (
                <div key={code.id}><span>•••• {code.codeHint}</span><strong>{code.claimCount} UID</strong><small>{code.lastClaimedAt ? `Dùng gần nhất ${formatBangkokTime(code.lastClaimedAt)}` : "Chưa sử dụng"}</small></div>
              ))}
            </div>
          </section>
        </div>

        <section className="admin-panel participants-panel">
          <div className="panel-heading">
            <div><Users size={20} /><h2>Người tham gia và dự đoán</h2></div>
            <div className="export-actions">
              <button className="secondary-button" type="button" onClick={() => void exportCsv("/api/admin/users.csv")}><Download size={16} /> Người tham gia CSV</button>
              <button className="secondary-button" type="button" onClick={() => void exportCsv("/api/admin/leaderboard.csv")} disabled={!data.result}><Download size={16} /> BXH CSV</button>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>UID</th><th>Mã</th><th>Đội thắng</th><th>Tỉ số</th><th>Messi</th><th>Gửi lúc</th></tr></thead>
              <tbody>
                {data.participants.map((participant) => (
                  <tr key={participant.id}>
                    <td><strong>{participant.uid}</strong></td>
                    <td>•••• {participant.codeHint}</td>
                    <td>{participant.prediction ? (participant.prediction.winner === "argentina" ? "Argentina" : "Tây Ban Nha") : "Chưa gửi"}</td>
                    <td>{participant.prediction ? `${participant.prediction.argentinaScore} : ${participant.prediction.spainScore}` : "-"}</td>
                    <td>{participant.prediction ? (participant.prediction.messiScores ? "Có" : "Không") : "-"}</td>
                    <td>{participant.prediction ? formatBangkokTime(participant.prediction.submittedAt) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
