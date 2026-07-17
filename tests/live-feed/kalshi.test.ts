import { describe, expect, it } from "vitest";

import { normalizeKalshiPair, parseKalshiSide } from "@/lib/live-feed/kalshi";

function market(ticker: string, bid: string, ask: string, updatedTime = "2026-07-18T01:02:03Z") {
  return {
    market: {
      ticker,
      status: "active",
      yes_bid_dollars: bid,
      yes_ask_dollars: ask,
      updated_time: updatedTime,
    },
  };
}

describe("Kalshi live price parser", () => {
  it("uses bid/ask midpoints and normalizes the two contracts to 100 percent", () => {
    const price = normalizeKalshiPair(
      market("FRA", "0.6300", "0.6400"),
      market("ENG", "0.3600", "0.3700"),
      "FRA",
      "ENG",
    );

    expect(price.homeProbability).toBeCloseTo(0.635, 12);
    expect(price.awayProbability).toBeCloseTo(0.365, 12);
    expect(price.homeProbability + price.awayProbability).toBe(1);
  });

  it("normalizes small pricing gaps between separate winner contracts", () => {
    const price = normalizeKalshiPair(
      market("ARG", "0.4110", "0.4170"),
      market("ESP", "0.5850", "0.5880"),
      "ARG",
      "ESP",
    );

    expect(price.homeProbability).toBeCloseTo(0.413793, 6);
    expect(price.awayProbability).toBeCloseTo(0.586207, 6);
  });

  it("rejects a wrong ticker, crossed book, and inactive market", () => {
    expect(() => parseKalshiSide(market("OTHER", "0.4", "0.5"), "FRA"))
      .toThrow("expected FRA");
    expect(() => parseKalshiSide(market("FRA", "0.6", "0.5"), "FRA"))
      .toThrow("invalid bid/ask");
    expect(() => parseKalshiSide({
      ...market("FRA", "0.4", "0.5"),
      market: { ...market("FRA", "0.4", "0.5").market, status: "closed" },
    }, "FRA")).toThrow("is closed");
  });
});
