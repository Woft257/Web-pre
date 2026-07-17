"use client";

import { Crown, LoaderCircle, RefreshCw, Trophy } from "lucide-react";

import { formatPoints } from "@/lib/client/api";
import type { CurrentUser, LeaderboardEntry } from "@/lib/client/types";

export function LeaderboardView({
  entries,
  user,
  loading,
  onRefresh,
}: {
  entries: LeaderboardEntry[];
  user: CurrentUser | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="tab-view leaderboard-view">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Live ranking</p>
          <h1>Leaderboard</h1>
        </div>
        <button className="icon-button" type="button" onClick={onRefresh} title="Refresh leaderboard">
          {loading ? <LoaderCircle className="spin" size={18} /> : <RefreshCw size={18} />}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <Trophy size={26} />
          <strong>No rankings yet</strong>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>UID</th>
                <th className="number-cell">Equity</th>
                <th className="number-cell">Available</th>
                <th className="number-cell">Open value</th>
                <th className="number-cell">P/L</th>
                <th className="number-cell">Wins</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isCurrent = entry.maskedUid === user?.maskedUid;
                return (
                  <tr key={`${entry.rank}-${entry.maskedUid}`} className={isCurrent ? "current-row" : ""}>
                    <td>
                      <span className={`rank-badge rank-${entry.rank}`}>
                        {entry.rank === 1 && <Crown size={14} />}
                        {entry.rank}
                      </span>
                    </td>
                    <td><strong>{entry.maskedUid}</strong>{isCurrent && <span className="you-tag">You</span>}</td>
                    <td className="number-cell"><strong>{formatPoints(entry.equity)} PTS</strong></td>
                    <td className="number-cell">{formatPoints(entry.balance)}</td>
                    <td className="number-cell">{formatPoints(entry.positionValue)}</td>
                    <td className={`number-cell ${entry.pnl >= 0 ? "positive" : "negative"}`}>
                      {entry.pnl >= 0 ? "+" : ""}{formatPoints(entry.pnl)}
                    </td>
                    <td className="number-cell">{entry.correctPredictions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
