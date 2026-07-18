"use client";

import { Activity, CalendarClock, CircleDot, Radio, WifiOff } from "lucide-react";

import { formatBangkokTime, formatPoints, formatProbability } from "@/lib/client/api";
import type {
  CurrentUser,
  MarketHistoryPoint,
  PortfolioPosition,
  PublicMarket,
} from "@/lib/client/types";
import { MarketList, statusLabel } from "@/components/market-list";
import { PriceChart } from "@/components/price-chart";
import { TeamFlag } from "@/components/team-flag";
import { TradingPanel } from "@/components/trading-panel";

export function MarketWorkspace({
  markets,
  selectedId,
  onSelect,
  user,
  position,
  history,
  onTradeComplete,
}: {
  markets: PublicMarket[];
  selectedId: string;
  onSelect: (marketId: string) => void;
  user: CurrentUser;
  position?: PortfolioPosition;
  history: MarketHistoryPoint[];
  onTradeComplete: () => Promise<void>;
}) {
  const market = markets.find((item) => item.id === selectedId) ?? markets[0];
  if (!market) {
    return <div className="empty-state"><Activity size={24} /><strong>No markets available</strong></div>;
  }

  return (
    <div className="markets-layout">
      <MarketList markets={markets} selectedId={market.id} onSelect={onSelect} />

      <main className="market-detail">
        <div className="market-detail-topline">
          <div>
            <p className="eyebrow">{market.competition} / {market.stage}</p>
            <div className="market-status-row">
              <span className={`status-pill status-${market.status}`}>
                {market.status === "live_open" ? <Radio size={13} /> : <CircleDot size={13} />}
                {statusLabel(market.status)}
              </span>
              <span><CalendarClock size={14} /> {formatBangkokTime(market.kickoffAt)} GMT+7</span>
              <span className={market.feedStatus === "healthy" ? "feed-fresh" : "feed-stale"}>
                {market.feedStatus === "healthy" ? <Activity size={14} /> : <WifiOff size={14} />}
                {market.feedStatus}
              </span>
            </div>
          </div>
          {market.oracleSourceAt && (
            <span className="last-update">Feed checked {new Date(market.oracleReceivedAt ?? market.oracleSourceAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          )}
        </div>

        <section className="scoreboard" aria-label={`${market.home.name} versus ${market.away.name}`}>
          <div className="score-team home-team">
            <TeamFlag code={market.home.code} size={54} />
            <div><strong>{market.home.name}</strong><span>{market.home.code}</span></div>
          </div>
          <div className="score-center">
            <strong>{market.home.score} <span>:</span> {market.away.score}</strong>
            <span>{market.matchMinute !== null ? `${market.matchMinute}'` : statusLabel(market.status)}</span>
          </div>
          <div className="score-team away-team">
            <div><strong>{market.away.name}</strong><span>{market.away.code}</span></div>
            <TeamFlag code={market.away.code} size={54} />
          </div>
        </section>

        {market.latestEvent && (
          <div className="latest-event"><Radio size={14} /><span>{market.latestEvent}</span></div>
        )}

        <section className="market-prices" aria-label="Current market prices">
          <div className="outcome-price home-outcome">
            <span>{market.home.name}</span>
            <strong>{formatProbability(market.home.price)}</strong>
          </div>
          <div className="probability-track" aria-hidden="true">
            <span style={{ width: `${market.home.price * 100}%` }} />
          </div>
          <div className="outcome-price away-outcome">
            <span>{market.away.name}</span>
            <strong>{formatProbability(market.away.price)}</strong>
          </div>
        </section>

        <section className="chart-section">
          <div className="subsection-title split-title">
            <div><Activity size={18} /><h2>Market probability</h2></div>
          </div>
          <PriceChart
            history={history}
            homeProbability={market.home.oracleProbability}
            homeCode={market.home.code}
            awayCode={market.away.code}
          />
        </section>

        {position && (position.homeShares > 0 || position.awayShares > 0) && (
          <section className="inline-position">
            <div><span>Open value</span><strong>{formatPoints(position.markValue)} PTS</strong></div>
            <div><span>{market.home.code} shares</span><strong>{formatPoints(position.homeShares, 4)}</strong></div>
            <div><span>{market.away.code} shares</span><strong>{formatPoints(position.awayShares, 4)}</strong></div>
            <div><span>Unrealized P/L</span><strong className={position.unrealizedPnl >= 0 ? "positive" : "negative"}>{position.unrealizedPnl >= 0 ? "+" : ""}{formatPoints(position.unrealizedPnl)} PTS</strong></div>
          </section>
        )}
      </main>

      <TradingPanel
        key={market.id}
        market={market}
        user={user}
        position={position}
        onTradeComplete={onTradeComplete}
      />
    </div>
  );
}
