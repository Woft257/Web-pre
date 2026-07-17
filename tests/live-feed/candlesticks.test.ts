import { describe, expect, it } from "vitest";

import { normalizeKalshiCandlesticks } from "@/lib/live-feed/candlesticks";

function candle(endPeriodTs: number, bid: string, ask: string) {
  return {
    end_period_ts: endPeriodTs,
    price: { close_dollars: bid },
    yes_bid: { close_dollars: bid },
    yes_ask: { close_dollars: ask },
  };
}

describe("Kalshi candlestick history", () => {
  it("joins the two contracts by time and normalizes their bid/ask midpoints", () => {
    const history = normalizeKalshiCandlesticks(
      {
        ticker: "FRA",
        candlesticks: [
          candle(1_784_160_000, "0.62", "0.63"),
          candle(1_784_163_600, "0.63", "0.64"),
        ],
      },
      {
        ticker: "ENG",
        candlesticks: [
          candle(1_784_160_000, "0.37", "0.38"),
          candle(1_784_163_600, "0.36", "0.37"),
        ],
      },
      "FRA",
      "ENG",
    );

    expect(history).toHaveLength(2);
    expect(history[0].homeProbability).toBeCloseTo(0.625, 12);
    expect(history[0].awayProbability).toBeCloseTo(0.375, 12);
    expect(history[1].homeProbability).toBeCloseTo(0.635, 12);
    expect(history[1].sourceAt).toBe("2026-07-16T01:00:00.000Z");
  });

  it("rejects a response for the wrong ticker", () => {
    const payload = { ticker: "OTHER", candlesticks: [] };
    expect(() => normalizeKalshiCandlesticks(payload, payload, "FRA", "ENG"))
      .toThrow("ticker mismatch");
  });
});
