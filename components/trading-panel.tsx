"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { apiRequest, formatPoints, formatProbability } from "@/lib/client/api";
import type {
  CurrentUser,
  PortfolioPosition,
  PublicMarket,
  QuoteData,
} from "@/lib/client/types";

interface TradeResult {
  tradeId: string;
  balance: number;
  shares: number;
  cashDelta: number;
  averagePrice: number;
}

export function TradingPanel({
  market,
  user,
  position,
  onTradeComplete,
}: {
  market: PublicMarket;
  user: CurrentUser;
  position?: PortfolioPosition;
  onTradeComplete: () => Promise<void> | void;
}) {
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [side, setSide] = useState<"home" | "away">("home");
  const [value, setValue] = useState("");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const team = side === "home" ? market.home : market.away;
  const availableShares = side === "home" ? position?.homeShares ?? 0 : position?.awayShares ?? 0;
  const maxBuy = Math.min(user.balance, market.maxOrder);

  function resetDraft() {
    setQuote(null);
    setError("");
    setSuccess("");
    setValue("");
  }

  useEffect(() => {
    if (!quote) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((new Date(quote.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) setQuote(null);
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [quote]);

  const quickValues = useMemo(() => [0.25, 0.5, 0.75, 1], []);

  function setQuickValue(ratio: number) {
    const maximum = action === "buy" ? maxBuy : availableShares;
    setValue(String(Math.max(0, maximum * ratio).toFixed(action === "buy" ? 0 : 4)));
    setQuote(null);
  }

  async function requestQuote(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setError(action === "buy" ? "Enter a point amount" : "Enter shares to sell");
      return;
    }

    setLoading(true);
    try {
      const payload = action === "buy"
        ? { action, side, amount: numericValue }
        : { action, side, shares: numericValue };
      const nextQuote = await apiRequest<QuoteData>(`/api/markets/${market.id}/quote`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setQuote(nextQuote);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Quote unavailable");
    } finally {
      setLoading(false);
    }
  }

  async function confirmTrade() {
    if (!quote) return;
    setError("");
    setConfirming(true);
    try {
      const result = await apiRequest<TradeResult>(`/api/markets/${market.id}/trades`, {
        method: "POST",
        body: JSON.stringify({
          quoteToken: quote.quoteToken,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      setQuote(null);
      setValue("");
      await onTradeComplete();
      setSuccess(
        `${action === "buy" ? "Bought" : "Sold"} ${formatPoints(result.shares, 4)} ${team.code} shares`,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Trade failed");
      setQuote(null);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <aside className="trading-panel">
      <div className="trading-panel-head">
        <div>
          <p className="eyebrow">Order ticket</p>
          <h2>{team.name}</h2>
        </div>
        <span className="current-price">{formatProbability(team.price)}</span>
      </div>

      <div className="segmented-control" aria-label="Trade action">
        <button
          type="button"
          className={action === "buy" ? "active" : ""}
          disabled={loading || confirming}
          onClick={() => {
            setAction("buy");
            resetDraft();
          }}
        >
          <ArrowUpRight size={16} /> Buy
        </button>
        <button
          type="button"
          className={action === "sell" ? "active" : ""}
          disabled={loading || confirming}
          onClick={() => {
            setAction("sell");
            resetDraft();
          }}
        >
          <ArrowDownLeft size={16} /> Sell
        </button>
      </div>

      <div className="outcome-switch">
        {(["home", "away"] as const).map((outcome) => {
          const outcomeTeam = outcome === "home" ? market.home : market.away;
          return (
            <button
              key={outcome}
              type="button"
              className={side === outcome ? "active" : ""}
              disabled={loading || confirming}
              onClick={() => {
                setSide(outcome);
                resetDraft();
              }}
            >
              <span>{outcomeTeam.code}</span>
              <strong>{formatProbability(outcomeTeam.price)}</strong>
            </button>
          );
        })}
      </div>

      {!market.canTrade && (
        <div className="trade-alert">
          <ShieldAlert size={18} />
          <span>{market.suspensionReason ?? "Trading is not available"}</span>
        </div>
      )}

      <form onSubmit={requestQuote}>
        <div className="field-label-row">
          <label htmlFor="trade-value">{action === "buy" ? "Points" : "Shares"}</label>
          <span>
            {action === "buy"
              ? `${formatPoints(user.balance)} available`
              : `${formatPoints(availableShares, 4)} available`}
          </span>
        </div>
        <div className="trade-input-wrap">
          <input
            id="trade-value"
            value={value}
            onChange={(event) => {
              setValue(event.target.value.replace(/[^0-9.]/g, ""));
              setQuote(null);
            }}
            inputMode="decimal"
            placeholder="0"
            disabled={!market.canTrade || loading || confirming}
          />
          <span>{action === "buy" ? "PTS" : "SHARES"}</span>
        </div>
        <div className="quick-values">
          {quickValues.map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => setQuickValue(ratio)}
              disabled={loading || confirming}
            >
              {ratio === 1 ? "Max" : `${ratio * 100}%`}
            </button>
          ))}
        </div>

        {error && <div className="form-message error-message">{error}</div>}
        {success && (
          <div className="form-message success-message">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        {!quote && (
          <button
            className="primary-button wide-button"
            type="submit"
            disabled={!market.canTrade || loading || confirming}
          >
            {loading ? <LoaderCircle className="spin" size={18} /> : <RefreshCw size={18} />}
            Get quote
          </button>
        )}
      </form>

      {quote && (
        <div className="quote-summary">
          <div className="quote-expiry">
            <Clock3 size={15} /> Quote expires in {secondsLeft}s
          </div>
          <dl>
            <div><dt>Average price</dt><dd>{formatProbability(quote.averagePrice)}</dd></div>
            <div><dt>Shares</dt><dd>{formatPoints(quote.shares, 4)}</dd></div>
            <div><dt>Price impact</dt><dd>{(quote.priceImpact * 100).toFixed(2)}%</dd></div>
            <div><dt>{action === "buy" ? "Max payout" : "Cash out"}</dt><dd>{formatPoints(action === "buy" ? quote.maxPayout : quote.cashPoints)} PTS</dd></div>
            {quote.expectedProfit !== null && (
              <div className="quote-profit"><dt>Potential profit</dt><dd>+{formatPoints(quote.expectedProfit)} PTS</dd></div>
            )}
          </dl>
          <button
            type="button"
            className="primary-button wide-button"
            onClick={confirmTrade}
            disabled={confirming || secondsLeft === 0}
          >
            {confirming ? <LoaderCircle className="spin" size={18} /> : <CheckCircle2 size={18} />}
            {confirming && market.status === "live_open" ? "Checking live price" : `Confirm ${action}`}
          </button>
        </div>
      )}
    </aside>
  );
}
