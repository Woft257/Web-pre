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
  it("uses the home midpoint exactly and prices away as its binary complement", () => {
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

  it("does not move the home midpoint when the corroborating contract has a small gap", () => {
    const price = normalizeKalshiPair(
      market("ARG", "0.4110", "0.4170"),
      market("ESP", "0.5850", "0.5880"),
      "ARG",
      "ESP",
    );

    expect(price.homeProbability).toBe(0.414);
    expect(price.awayProbability).toBeCloseTo(0.586, 12);
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
    expect(() => normalizeKalshiPair(
      market("FRA", "0.6", "0.62"),
      market("ENG", "0.5", "0.52"),
      "FRA",
      "ENG",
    )).toThrow("disagree");
  });
});
