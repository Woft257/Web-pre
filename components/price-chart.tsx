"use client";

import { useMemo, useState } from "react";

import { formatProbability } from "@/lib/client/api";
import type { MarketHistoryPoint } from "@/lib/client/types";

type ChartRange = "24H" | "7D";

function formatAxisTime(value: string, range: ChartRange) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", range === "24H"
    ? { hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short" }).format(date);
}

export function PriceChart({
  history,
  homeProbability,
  homeCode,
  awayCode,
}: {
  history: MarketHistoryPoint[];
  homeProbability: number;
  homeCode: string;
  awayCode: string;
}) {
  const [range, setRange] = useState<ChartRange>("7D");
  const visibleHistory = useMemo(() => {
    if (history.length === 0) return [];
    const latestTime = Date.parse(history.at(-1)!.sourceAt);
    const duration = range === "24H" ? 24 * 60 * 60 * 1_000 : 7 * 24 * 60 * 60 * 1_000;
    const filtered = history.filter((point) => Date.parse(point.sourceAt) >= latestTime - duration);
    return filtered.length > 0 ? filtered : [history.at(-1)!];
  }, [history, range]);

  const fallbackTime = new Date().toISOString();
  const chartHistory = visibleHistory.length > 0
    ? visibleHistory
    : [{
        homeProbability,
        awayProbability: 1 - homeProbability,
        sourceAt: fallbackTime,
        oracleVersion: 0,
        event: null,
      }];
  const firstTimestamp = Date.parse(chartHistory[0].sourceAt);
  const lastTimestamp = Date.parse(chartHistory.at(-1)!.sourceAt);
  const timeRange = Math.max(60 * 60 * 1_000, lastTimestamp - firstTimestamp);
  const width = 720;
  const height = 220;
  const leftPadding = 42;
  const rightPadding = 76;
  const verticalPadding = 14;
  const plotWidth = width - leftPadding - rightPadding;
  const allProbabilities = chartHistory.flatMap((point) => [
    point.homeProbability,
    point.awayProbability,
  ]);
  const dataMin = Math.min(...allProbabilities);
  const dataMax = Math.max(...allProbabilities);
  let domainMin = Math.max(0, Math.floor((dataMin - 0.03) * 10) / 10);
  let domainMax = Math.min(1, Math.ceil((dataMax + 0.03) * 10) / 10);
  if (domainMax - domainMin < 0.2) {
    const center = (domainMin + domainMax) / 2;
    domainMin = Math.max(0, center - 0.1);
    domainMax = Math.min(1, center + 0.1);
  }
  const domainRange = domainMax - domainMin;
  const xFor = (sourceAt: string) => (
    leftPadding + ((Date.parse(sourceAt) - firstTimestamp) / timeRange) * plotWidth
  );
  const yFor = (probability: number) => (
    verticalPadding
    + (1 - (probability - domainMin) / domainRange) * (height - verticalPadding * 2)
  );
  const makePolyline = (side: "homeProbability" | "awayProbability") => chartHistory
    .map((point) => `${xFor(point.sourceAt)},${yFor(point[side])}`)
    .join(" ");
  const gridValues = Array.from({ length: 5 }, (_, index) => (
    domainMin + (domainRange * index) / 4
  ));
  const latest = chartHistory.at(-1)!;
  const endpointX = xFor(latest.sourceAt);
  const homeY = yFor(latest.homeProbability);
  const awayY = yFor(latest.awayProbability);
  const labelsOverlap = Math.abs(homeY - awayY) < 28;
  const midpoint = chartHistory[Math.floor((chartHistory.length - 1) / 2)];

  return (
    <div className="market-chart-shell">
      <div className="chart-toolbar">
        <div className="chart-legend" aria-label="Current probabilities">
          <span className="chart-legend-home"><i />{homeCode} <strong>{formatProbability(latest.homeProbability)}</strong></span>
          <span className="chart-legend-away"><i />{awayCode} <strong>{formatProbability(latest.awayProbability)}</strong></span>
        </div>
        <div className="chart-range" aria-label="Chart time range">
          {(["24H", "7D"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={range === value ? "active" : ""}
              aria-pressed={range === value}
              onClick={() => setRange(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="price-chart" aria-label={`${homeCode} and ${awayCode} probability history`}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true">
          {gridValues.map((value) => (
            <g key={value}>
              <line
                x1={leftPadding}
                x2={width - rightPadding}
                y1={yFor(value)}
                y2={yFor(value)}
                className="chart-grid-line"
              />
              <text x="2" y={yFor(value) + 3} className="chart-grid-label">
                {Math.round(value * 100)}%
              </text>
            </g>
          ))}
          <polyline points={makePolyline("homeProbability")} className="chart-line chart-line-home" />
          <polyline points={makePolyline("awayProbability")} className="chart-line chart-line-away" />
          {chartHistory.map((point) => {
            if (!point.event) return null;
            return (
              <g key={`${point.sourceAt}-${point.event}`} className="chart-event-marker">
                <circle cx={xFor(point.sourceAt)} cy={yFor(point.homeProbability)} r="5" />
                <title>{point.event}</title>
              </g>
            );
          })}
          <circle cx={endpointX} cy={homeY} r="4" className="chart-endpoint chart-endpoint-home" />
          <circle cx={endpointX} cy={awayY} r="4" className="chart-endpoint chart-endpoint-away" />
          <text
            x={endpointX + 10}
            y={homeY + (labelsOverlap ? -8 : 4)}
            className="chart-end-label chart-end-label-home"
          >
            {homeCode} {formatProbability(latest.homeProbability)}
          </text>
          <text
            x={endpointX + 10}
            y={awayY + (labelsOverlap ? 16 : 4)}
            className="chart-end-label chart-end-label-away"
          >
            {awayCode} {formatProbability(latest.awayProbability)}
          </text>
        </svg>
        <div className="chart-time-axis">
          <span>{formatAxisTime(chartHistory[0].sourceAt, range)}</span>
          <span>{formatAxisTime(midpoint.sourceAt, range)}</span>
          <span>{formatAxisTime(latest.sourceAt, range)}</span>
        </div>
      </div>
      <span className="chart-point-count">{chartHistory.length} price {chartHistory.length === 1 ? "point" : "points"}</span>
    </div>
  );
}
