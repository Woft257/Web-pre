"use client";

import { Activity, History, LoaderCircle, WalletCards } from "lucide-react";

import { formatPoints, formatProbability } from "@/lib/client/api";
import type { CurrentUser, PortfolioData } from "@/lib/client/types";
import { TeamFlag } from "@/components/team-flag";

export function PortfolioView({
  portfolio,
  user,
  loading,
}: {
  portfolio: PortfolioData | null;
  user: CurrentUser;
  loading: boolean;
}) {
  if (loading && !portfolio) {
    return <div className="view-loader"><LoaderCircle className="spin" size={26} /></div>;
  }

  return (
    <section className="tab-view portfolio-view">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h1>My predictions</h1>
        </div>
      </div>

      <div className="portfolio-summary">
        <div><span>Available</span><strong>{formatPoints(user.balance)} PTS</strong></div>
        <div><span>Open value</span><strong>{formatPoints(user.positionValue)} PTS</strong></div>
        <div><span>Total equity</span><strong>{formatPoints(user.equity)} PTS</strong></div>
        <div><span>Total P/L</span><strong className={user.pnl >= 0 ? "positive" : "negative"}>{user.pnl >= 0 ? "+" : ""}{formatPoints(user.pnl)} PTS</strong></div>
      </div>

      <div className="portfolio-section">
        <div className="subsection-title"><WalletCards size={18} /><h2>Open positions</h2></div>
        {!portfolio?.positions.length ? (
          <div className="empty-state compact-empty"><Activity size={22} /><span>No open positions</span></div>
        ) : (
          <div className="position-grid">
            {portfolio.positions.map((position) => (
              <article className="position-item" key={position.marketId}>
                <div className="position-title">
                  <div className="position-flags">
                    <TeamFlag code={position.market.home.code} size={28} />
                    <TeamFlag code={position.market.away.code} size={28} />
                  </div>
                  <div><strong>{position.market.title}</strong><span>{position.market.stage}</span></div>
                </div>
                <div className="position-sides">
                  <span>{position.market.home.code}: <strong>{formatPoints(position.homeShares, 4)}</strong></span>
                  <span>{position.market.away.code}: <strong>{formatPoints(position.awayShares, 4)}</strong></span>
                </div>
                <dl>
                  <div><dt>Mark value</dt><dd>{formatPoints(position.markValue)} PTS</dd></div>
                  <div><dt>Unrealized</dt><dd className={position.unrealizedPnl >= 0 ? "positive" : "negative"}>{position.unrealizedPnl >= 0 ? "+" : ""}{formatPoints(position.unrealizedPnl)}</dd></div>
                  <div><dt>Realized</dt><dd className={position.realizedPnl >= 0 ? "positive" : "negative"}>{position.realizedPnl >= 0 ? "+" : ""}{formatPoints(position.realizedPnl)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="portfolio-section">
        <div className="subsection-title"><History size={18} /><h2>Order history</h2></div>
        {!portfolio?.trades.length ? (
          <div className="empty-state compact-empty"><History size={22} /><span>No orders yet</span></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table order-table">
              <thead><tr><th>Market</th><th>Order</th><th className="number-cell">Shares</th><th className="number-cell">Price</th><th className="number-cell">Points</th><th>Time</th></tr></thead>
              <tbody>
                {portfolio.trades.map((trade) => (
                  <tr key={trade.id}>
                    <td><strong>{trade.marketTitle}</strong></td>
                    <td><span className={`order-side ${trade.action}`}>{trade.action.toUpperCase()} {trade.side.toUpperCase()}</span></td>
                    <td className="number-cell">{formatPoints(trade.shares, 4)}</td>
                    <td className="number-cell">{formatProbability(trade.averagePrice)}</td>
                    <td className={`number-cell ${trade.cashDelta >= 0 ? "positive" : "negative"}`}>{trade.cashDelta >= 0 ? "+" : ""}{formatPoints(trade.cashDelta)}</td>
                    <td>{new Date(trade.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
