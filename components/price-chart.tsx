"use client";

import type { MarketHistoryPoint } from "@/lib/client/types";

export function PriceChart({
  history,
  homeProbability,
}: {
  history: MarketHistoryPoint[];
  homeProbability: number;
}) {
  const historyPoints = history.length > 1
    ? history
    : [
        { homeProbability, event: null },
        { homeProbability, event: null },
      ];
  const points = historyPoints.map((item) => item.homeProbability);
  const width = 720;
  const height = 180;
  const padding = 12;
  const polyline = points
    .map((value, index) => {
      const x = padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
      const y = padding + (1 - value) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="price-chart" aria-label="Live probability history">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true">
        {[0.25, 0.5, 0.75].map((value) => (
          <line
            key={value}
            x1={padding}
            x2={width - padding}
            y1={padding + (1 - value) * (height - padding * 2)}
            y2={padding + (1 - value) * (height - padding * 2)}
            className="chart-grid-line"
          />
        ))}
        <polyline points={polyline} className="chart-line chart-line-shadow" />
        <polyline points={polyline} className="chart-line" />
        {historyPoints.map((point, index) => {
          if (!point.event) return null;
          const x = padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
          const y = padding + (1 - point.homeProbability) * (height - padding * 2);
          return (
            <g key={`${index}-${point.event}`} className="chart-event-marker">
              <circle cx={x} cy={y} r="6" />
              <title>{point.event}</title>
            </g>
          );
        })}
      </svg>
      <div className="chart-axis">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
