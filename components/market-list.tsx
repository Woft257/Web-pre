"use client";

import { Radio } from "lucide-react";

import { formatBangkokTime, formatProbability } from "@/lib/client/api";
import type { PublicMarket } from "@/lib/client/types";
import { TeamFlag } from "@/components/team-flag";

export function MarketList({
  markets,
  selectedId,
  onSelect,
}: {
  markets: PublicMarket[];
  selectedId: string;
  onSelect: (marketId: string) => void;
}) {
  return (
    <aside className="market-list" aria-label="Football markets">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Markets</p>
          <h2>Match winner</h2>
        </div>
        <span className="market-count">{markets.length}</span>
      </div>
      <div className="market-items">
        {markets.map((market) => (
          <button
            key={market.id}
            type="button"
            className={`market-list-item ${selectedId === market.id ? "active" : ""}`}
            onClick={() => onSelect(market.id)}
          >
            <span className="market-item-topline">
              <span>{market.stage}</span>
              <span className={`status-inline status-${market.status}`}>
                {market.status === "live_open" && <Radio size={12} />}
                {statusLabel(market.status)}
              </span>
            </span>
            <span className="market-team-row">
              <span className="team-compact">
                <TeamFlag code={market.home.code} size={24} />
                <strong>{market.home.code}</strong>
              </span>
              <span>{formatProbability(market.home.price)}</span>
            </span>
            <span className="market-team-row">
              <span className="team-compact">
                <TeamFlag code={market.away.code} size={24} />
                <strong>{market.away.code}</strong>
              </span>
              <span>{formatProbability(market.away.price)}</span>
            </span>
            <span className="market-time">{formatBangkokTime(market.kickoffAt)} GMT+7</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    pre_match_open: "Open",
    live_open: "Live",
    suspended: "Suspended",
    ended: "Ended",
    settled: "Settled",
    voided: "Voided",
  };
  return labels[status] ?? status;
}
