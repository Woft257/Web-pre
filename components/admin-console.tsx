"use client";

import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  CircleStop,
  LoaderCircle,
  Play,
  Radio,
  RefreshCw,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { MexcLogo } from "@/components/mexc-logo";
import { apiRequest, formatPoints, formatProbability } from "@/lib/client/api";
import type { PublicMarket } from "@/lib/client/types";

interface PreviewResult {
  affectedUsers: number;
  totalPayout: number;
  kind: "result" | "void";
}

export function AdminConsole({ initialMarkets }: { initialMarkets: PublicMarket[] }) {
  const [markets, setMarkets] = useState(initialMarkets);
  const [selectedId, setSelectedId] = useState(initialMarkets[0]?.id ?? "");
  const [secret, setSecret] = useState("");
  const [homeProbability, setHomeProbability] = useState(0.5);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [minute, setMinute] = useState<number | null>(null);
  const [status, setStatus] = useState<"pre_match_open" | "live_open" | "suspended" | "ended">("pre_match_open");
  const [event, setEvent] = useState("Manual replay tick");
  const [outcome, setOutcome] = useState<"home" | "away">("home");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const market = markets.find((item) => item.id === selectedId) ?? markets[0];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.sessionStorage.getItem("mexc-admin-secret");
      if (saved) setSecret(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!market) return;
    const timer = window.setTimeout(() => {
      setHomeProbability(market.home.oracleProbability);
      setHomeScore(market.home.score);
      setAwayScore(market.away.score);
      setMinute(market.matchMinute);
      setStatus(
        ["pre_match_open", "live_open", "suspended", "ended"].includes(market.status)
          ? (market.status as typeof status)
          : "ended",
      );
      setOutcome("home");
      setPreview(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [market]);

  function headers() {
    return { "x-admin-secret": secret };
  }

  async function refreshMarkets() {
    setMarkets(await apiRequest<PublicMarket[]>("/api/markets"));
  }

  async function runAction(action: () => Promise<void>, refresh = true) {
    setLoading(true);
    setError("");
    setMessage("");
    window.sessionStorage.setItem("mexc-admin-secret", secret);
    try {
      await action();
      if (refresh) await refreshMarkets();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Admin action failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitReplay(eventObject: FormEvent) {
    eventObject.preventDefault();
    if (!market) return;
    await runAction(async () => {
      await apiRequest(`/api/admin/markets/${market.id}/replay`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          homeProbability,
          homeScore,
          awayScore,
          matchMinute: minute,
          status,
          event,
        }),
      });
      setMessage("Replay tick applied");
    });
  }

  async function setMarketStatus(nextStatus: "live_open" | "suspended" | "ended") {
    if (!market) return;
    await runAction(async () => {
      await apiRequest(`/api/admin/markets/${market.id}/status`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ status: nextStatus, reason: event || "Admin status change" }),
      });
      setMessage(`Market changed to ${nextStatus}`);
    });
  }

  async function previewSettlement() {
    if (!market) return;
    await runAction(async () => {
      const data = await apiRequest<Omit<PreviewResult, "kind">>(
        `/api/admin/markets/${market.id}/settle?outcome=${outcome}`,
        { headers: headers() },
      );
      setPreview({ ...data, kind: "result" });
      setMessage("Settlement preview ready");
    }, false);
  }

  async function previewVoid() {
    if (!market) return;
    await runAction(async () => {
      const data = await apiRequest<Omit<PreviewResult, "kind">>(
        `/api/admin/markets/${market.id}/void`,
        { headers: headers() },
      );
      setPreview({ ...data, kind: "void" });
      setMessage("Void preview ready");
    }, false);
  }

  async function settle() {
    if (!market || !window.confirm(`Settle ${market.title} as ${outcome.toUpperCase()} winner?`)) return;
    await runAction(async () => {
      const result = await apiRequest<Omit<PreviewResult, "kind">>(`/api/admin/markets/${market.id}/settle`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          outcome,
          resultSource: "Admin confirmed result",
          resultReference: event,
        }),
      });
      setMessage(`Settled ${result.affectedUsers} users / ${formatPoints(result.totalPayout)} PTS`);
      setPreview(null);
    });
  }

  async function voidMarket() {
    if (!market || !window.confirm(`Void ${market.title} and redeem shares at 0.5?`)) return;
    await runAction(async () => {
      const result = await apiRequest<Omit<PreviewResult, "kind">>(`/api/admin/markets/${market.id}/void`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          resultSource: "Admin void",
          resultReference: event,
        }),
      });
      setMessage(`Voided ${result.affectedUsers} users / ${formatPoints(result.totalPayout)} PTS`);
    });
  }

  if (!market) return null;

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link href="/"><ArrowLeft size={18} /> Back</Link>
        <MexcLogo />
        <span>Event operations</span>
      </header>

      <main className="admin-main">
        <div className="section-heading">
          <div><p className="eyebrow">Restricted</p><h1>Market control</h1></div>
          <button className="icon-button" type="button" onClick={() => void refreshMarkets()} title="Refresh markets"><RefreshCw size={18} /></button>
        </div>

        <section className="admin-toolbar">
          <div className="admin-field">
            <label htmlFor="admin-secret">Admin secret</label>
            <input id="admin-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
          </div>
          <div className="admin-field">
            <label htmlFor="admin-market">Market</label>
            <select id="admin-market" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {markets.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </div>
        </section>

        <section className="admin-market-status">
          <div><span>Status</span><strong>{market.status}</strong></div>
          <div><span>Feed</span><strong>{market.feedStatus}</strong></div>
          <div><span>Score</span><strong>{market.home.score} : {market.away.score}</strong></div>
          <div><span>Oracle version</span><strong>{market.oracleVersion}</strong></div>
          <div><span>Home price</span><strong>{formatProbability(market.home.oracleProbability)}</strong></div>
        </section>

        {error && <div className="admin-notice admin-error"><ShieldAlert size={17} /> {error}</div>}
        {message && <div className="admin-notice admin-success"><CheckCircle2 size={17} /> {message}</div>}

        <div className="admin-grid">
          <section className="admin-panel">
            <div className="subsection-title"><Activity size={18} /><h2>Replay oracle</h2></div>
            <form onSubmit={submitReplay}>
              <div className="admin-field">
                <label htmlFor="home-probability">{market.home.code} probability: {formatProbability(homeProbability)}</label>
                <input id="home-probability" type="range" min="0.01" max="0.99" step="0.01" value={homeProbability} onChange={(e) => setHomeProbability(Number(e.target.value))} />
              </div>
              <div className="admin-field-row">
                <div className="admin-field"><label htmlFor="home-score">{market.home.code} score</label><input id="home-score" type="number" min="0" value={homeScore} onChange={(e) => setHomeScore(Number(e.target.value))} /></div>
                <div className="admin-field"><label htmlFor="away-score">{market.away.code} score</label><input id="away-score" type="number" min="0" value={awayScore} onChange={(e) => setAwayScore(Number(e.target.value))} /></div>
              </div>
              <div className="admin-field-row">
                <div className="admin-field"><label htmlFor="minute">Minute</label><input id="minute" type="number" min="0" max="150" value={minute ?? ""} onChange={(e) => setMinute(e.target.value ? Number(e.target.value) : null)} /></div>
                <div className="admin-field"><label htmlFor="replay-status">Status</label><select id="replay-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="pre_match_open">Pre-match</option><option value="live_open">Live</option><option value="suspended">Suspended</option><option value="ended">Ended</option></select></div>
              </div>
              <div className="admin-field"><label htmlFor="event">Event</label><input id="event" value={event} onChange={(e) => setEvent(e.target.value)} /></div>
              <button className="primary-button wide-button" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <Radio size={18} />} Apply tick</button>
            </form>
          </section>

          <section className="admin-panel">
            <div className="subsection-title"><CircleStop size={18} /><h2>Trading status</h2></div>
            <div className="admin-action-list">
              <button className="secondary-button" type="button" onClick={() => void setMarketStatus("live_open")} disabled={loading}><Play size={17} /> Open live</button>
              <button className="secondary-button" type="button" onClick={() => void setMarketStatus("suspended")} disabled={loading}><CircleStop size={17} /> Suspend</button>
              <button className="danger-button" type="button" onClick={() => void setMarketStatus("ended")} disabled={loading}><CircleStop size={17} /> End market</button>
            </div>
          </section>

          <section className="admin-panel settlement-panel">
            <div className="subsection-title"><Trophy size={18} /><h2>Settlement</h2></div>
            <div className="outcome-switch">
              <button type="button" className={outcome === "home" ? "active" : ""} onClick={() => { setOutcome("home"); setPreview(null); }}><span>{market.home.code}</span><strong>Winner</strong></button>
              <button type="button" className={outcome === "away" ? "active" : ""} onClick={() => { setOutcome("away"); setPreview(null); }}><span>{market.away.code}</span><strong>Winner</strong></button>
            </div>
            {preview && <div className="settlement-preview"><div><span>Affected</span><strong>{preview.affectedUsers}</strong></div><div><span>Total payout</span><strong>{formatPoints(preview.totalPayout)} PTS</strong></div></div>}
            <div className="admin-action-list horizontal-actions">
              <button className="secondary-button" type="button" onClick={() => void previewSettlement()} disabled={loading}>Preview settle</button>
              <button className="primary-button" type="button" onClick={() => void settle()} disabled={loading || preview?.kind !== "result"}>Settle</button>
              <button className="secondary-button" type="button" onClick={() => void previewVoid()} disabled={loading}>Preview void</button>
              <button className="danger-button" type="button" onClick={() => void voidMarket()} disabled={loading || preview?.kind !== "void"}>Void</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
