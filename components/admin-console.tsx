"use client";

import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { MexcLogo } from "@/components/mexc-logo";
import { apiRequest, formatBangkokTime } from "@/lib/client/api";
import type { AdminContestData, TeamChoice } from "@/lib/client/types";

const INVITE_CODES_PER_PAGE = 5;

export function AdminConsole() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState<AdminContestData | null>(null);
  const [winner, setWinner] = useState<TeamChoice>("argentina");
  const [argentinaScore, setArgentinaScore] = useState(0);
  const [spainScore, setSpainScore] = useState(0);
  const [messiScores, setMessiScores] = useState(true);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [codePage, setCodePage] = useState(1);
  const [participantPage, setParticipantPage] = useState(1);
  const [participantSearch, setParticipantSearch] = useState("");
  const [appliedParticipantSearch, setAppliedParticipantSearch] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function headers() {
    return { "x-admin-secret": secret };
  }

  async function loadData(
    initializeResult = false,
    participantQuery?: { page?: number; search?: string },
  ) {
    const requestedPage = participantQuery?.page ?? participantPage;
    const requestedSearch = participantQuery?.search ?? appliedParticipantSearch;
    const query = new URLSearchParams({ participantPage: String(requestedPage) });
    if (requestedSearch) query.set("participantSearch", requestedSearch);
    const next = await apiRequest<AdminContestData>(`/api/admin/contest?${query}`, { headers: headers() });
    setData(next);
    setParticipantPage(next.participantPagination.page);
    setAppliedParticipantSearch(next.participantPagination.search);
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
      await loadData(true, { page: 1, search: "" });
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
      const nextCodeCount = (data?.inviteCodes.length ?? 0) + result.codes.length;
      setCodePage(Math.max(1, Math.ceil(nextCodeCount / INVITE_CODES_PER_PAGE)));
      setMessage("Đã tạo mã mới. Hãy lưu mã ngay vì hệ thống chỉ lưu bản hash.");
    });
  }

  async function deleteParticipant(participant: AdminContestData["participants"][number]) {
    if (!window.confirm(`Xóa UID ${participant.uid} và dự đoán đã gửi?`)) return;
    await runAction(async () => {
      await apiRequest(`/api/admin/participants/${participant.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      setMessage(`Đã xóa UID ${participant.uid}`);
    });
  }

  async function resetContest() {
    if (resetConfirmation !== "RESET") return;
    if (!window.confirm("Xóa toàn bộ người tham gia, dự đoán, kết quả và bảng xếp hạng? Thao tác này không thể hoàn tác.")) return;
    await runAction(async () => {
      await apiRequest("/api/admin/contest/reset", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ confirmation: resetConfirmation }),
      });
      setResetConfirmation("");
      setWinner("argentina");
      setArgentinaScore(0);
      setSpainScore(0);
      setMessiScores(true);
      setMessage("Đã reset dữ liệu sự kiện. Các mã tham gia vẫn được giữ lại.");
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

  async function updateParticipantView(page: number, search: string) {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await loadData(false, { page, search });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải người tham gia");
    } finally {
      setLoading(false);
    }
  }

  function searchParticipants(event: FormEvent) {
    event.preventDefault();
    void updateParticipantView(1, participantSearch.trim());
  }

  function clearParticipantSearch() {
    setParticipantSearch("");
    void updateParticipantView(1, "");
  }

  function lockConsole() {
    setAuthenticated(false);
    setSecret("");
    setData(null);
    setGeneratedCodes([]);
    setCodePage(1);
    setParticipantPage(1);
    setParticipantSearch("");
    setAppliedParticipantSearch("");
    setResetConfirmation("");
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
  const submittedCount = data.stats.predictions;
  const codePageCount = Math.max(1, Math.ceil(data.inviteCodes.length / INVITE_CODES_PER_PAGE));
  const visibleCodePage = Math.min(codePage, codePageCount);
  const codePageStart = (visibleCodePage - 1) * INVITE_CODES_PER_PAGE;
  const visibleInviteCodes = data.inviteCodes.slice(codePageStart, codePageStart + INVITE_CODES_PER_PAGE);
  const firstCodePage = Math.max(1, Math.min(visibleCodePage - 2, codePageCount - 4));
  const codePageNumbers = Array.from(
    { length: Math.min(5, codePageCount) },
    (_, index) => firstCodePage + index,
  );
  const participantPagination = data.participantPagination;
  const firstParticipantPage = Math.max(
    1,
    Math.min(participantPagination.page - 2, participantPagination.totalPages - 4),
  );
  const participantPageNumbers = Array.from(
    { length: Math.min(5, participantPagination.totalPages) },
    (_, index) => firstParticipantPage + index,
  );

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
              {visibleInviteCodes.map((code) => (
                <div key={code.id}><span>•••• {code.codeHint}</span><strong>{code.claimCount} UID</strong><small>{code.lastClaimedAt ? `Dùng gần nhất ${formatBangkokTime(code.lastClaimedAt)}` : "Chưa sử dụng"}</small></div>
              ))}
            </div>
            {codePageCount > 1 && (
              <nav className="pagination code-pagination" aria-label="Phân trang mã tham gia">
                <button
                  type="button"
                  onClick={() => setCodePage(visibleCodePage - 1)}
                  disabled={visibleCodePage <= 1}
                  aria-label="Trang mã trước"
                  title="Trang mã trước"
                >
                  <ChevronLeft size={17} />
                </button>
                {codePageNumbers.map((page) => (
                  <button
                    type="button"
                    className={page === visibleCodePage ? "active" : ""}
                    aria-current={page === visibleCodePage ? "page" : undefined}
                    onClick={() => setCodePage(page)}
                    key={page}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCodePage(visibleCodePage + 1)}
                  disabled={visibleCodePage >= codePageCount}
                  aria-label="Trang mã sau"
                  title="Trang mã sau"
                >
                  <ChevronRight size={17} />
                </button>
              </nav>
            )}
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
          <form className="participant-toolbar" role="search" onSubmit={searchParticipants}>
            <div className="participant-search-field">
              <Search size={16} />
              <input
                aria-label="Tìm UID người tham gia"
                inputMode="numeric"
                value={participantSearch}
                onChange={(event) => setParticipantSearch(event.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="Nhập UID đầy đủ hoặc một phần"
                autoComplete="off"
              />
            </div>
            <button className="icon-button" type="submit" disabled={loading} aria-label="Tìm UID" title="Tìm UID">
              {loading ? <LoaderCircle className="spin" size={17} /> : <Search size={17} />}
            </button>
            {(appliedParticipantSearch || participantSearch) && (
              <button className="icon-button" type="button" onClick={clearParticipantSearch} disabled={loading} aria-label="Xóa tìm kiếm UID" title="Xóa tìm kiếm UID">
                <X size={17} />
              </button>
            )}
            <span>{participantPagination.total} kết quả</span>
          </form>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>UID</th><th>Mã</th><th>Đội thắng</th><th>Tỉ số</th><th>Messi</th><th>Gửi lúc</th><th>Thao tác</th></tr></thead>
              <tbody>
                {data.participants.length === 0 && (
                  <tr><td className="admin-table-empty" colSpan={7}>Không tìm thấy UID phù hợp</td></tr>
                )}
                {data.participants.map((participant) => (
                  <tr key={participant.id}>
                    <td><strong>{participant.uid}</strong></td>
                    <td>•••• {participant.codeHint}</td>
                    <td>{participant.prediction ? (participant.prediction.winner === "argentina" ? "Argentina" : "Tây Ban Nha") : "Chưa gửi"}</td>
                    <td>{participant.prediction ? `${participant.prediction.argentinaScore} : ${participant.prediction.spainScore}` : "-"}</td>
                    <td>{participant.prediction ? (participant.prediction.messiScores ? "Có" : "Không") : "-"}</td>
                    <td>{participant.prediction ? formatBangkokTime(participant.prediction.submittedAt) : "-"}</td>
                    <td>
                      <button
                        className="icon-button delete-participant-button"
                        type="button"
                        title={`Xóa UID ${participant.uid}`}
                        aria-label={`Xóa UID ${participant.uid}`}
                        onClick={() => void deleteParticipant(participant)}
                        disabled={loading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {participantPagination.totalPages > 1 && (
            <nav className="pagination participants-pagination" aria-label="Phân trang người tham gia">
              <button
                type="button"
                onClick={() => void updateParticipantView(participantPagination.page - 1, appliedParticipantSearch)}
                disabled={loading || participantPagination.page <= 1}
                aria-label="Trang người tham gia trước"
                title="Trang người tham gia trước"
              >
                <ChevronLeft size={17} />
              </button>
              {participantPageNumbers.map((page) => (
                <button
                  type="button"
                  className={page === participantPagination.page ? "active" : ""}
                  aria-current={page === participantPagination.page ? "page" : undefined}
                  onClick={() => void updateParticipantView(page, appliedParticipantSearch)}
                  disabled={loading}
                  key={page}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void updateParticipantView(participantPagination.page + 1, appliedParticipantSearch)}
                disabled={loading || participantPagination.page >= participantPagination.totalPages}
                aria-label="Trang người tham gia sau"
                title="Trang người tham gia sau"
              >
                <ChevronRight size={17} />
              </button>
            </nav>
          )}
        </section>

        <section className="admin-danger-zone">
          <div>
            <p className="eyebrow">Danger zone</p>
            <h2>Reset toàn bộ dữ liệu sự kiện</h2>
            <p>Xóa người tham gia, dự đoán, kết quả, bảng xếp hạng và bộ đếm sử dụng. Danh sách mã tham gia vẫn được giữ lại.</p>
          </div>
          <div className="reset-controls">
            <label htmlFor="reset-confirmation">Nhập RESET để xác nhận</label>
            <input
              id="reset-confirmation"
              value={resetConfirmation}
              onChange={(event) => setResetConfirmation(event.target.value.toUpperCase().slice(0, 5))}
              placeholder="RESET"
              autoComplete="off"
            />
            <button className="danger-button" type="button" onClick={() => void resetContest()} disabled={loading || resetConfirmation !== "RESET"}>
              <RotateCcw size={17} /> Reset dữ liệu
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
