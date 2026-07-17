import { describe, expect, it } from "vitest";

import {
  markPosition,
  normalizeDecimalOdds,
  quoteBuy,
  quoteSell,
  type VmmState,
} from "@/lib/domain/pricing";

const baseMarket: VmmState = {
  homeProbability: 0.35,
  homeInventory: 0,
  awayInventory: 0,
  liquidityB: 100_000,
  spreadBps: 100,
};

describe("prediction market pricing", () => {
  it("removes bookmaker margin from decimal odds", () => {
    const probabilities = normalizeDecimalOdds([1.8, 2.2]);

    expect(probabilities[0] + probabilities[1]).toBeCloseTo(1, 12);
    expect(probabilities[0]).toBeGreaterThan(probabilities[1]);
  });

  it("buys more shares when the oracle probability is lower", () => {
    const lowPrice = quoteBuy(baseMarket, "home", 100);
    const highPrice = quoteBuy({ ...baseMarket, homeProbability: 0.7 }, "home", 100);

    expect(lowPrice.shares).toBeGreaterThan(highPrice.shares);
    expect(lowPrice.maxPayout - 100).toBeGreaterThan(highPrice.maxPayout - 100);
  });

  it("marks existing shares from 0.35 to 0.70 without changing quantity", () => {
    const shares = 1_000;

    expect(markPosition(shares, 0.35)).toBe(350);
    expect(markPosition(shares, 0.7)).toBe(700);
    expect(markPosition(shares, 0.35)).toBe(350);
  });

  it("returns a lower executable sell price after spread and impact", () => {
    const buy = quoteBuy(baseMarket, "home", 350);
    const stateAfterBuy = { ...baseMarket, homeInventory: buy.shares };
    const sell = quoteSell(stateAfterBuy, "home", buy.shares / 2);

    expect(sell.cashPoints).toBeGreaterThan(0);
    expect(sell.averagePrice).toBeLessThan(sell.probabilityBefore);
  });

  it("rounds buy shares to micro-units and reports max payout consistently", () => {
    const quote = quoteBuy(baseMarket, "away", 10);

    expect(Math.round(quote.shares * 1_000_000)).toBeCloseTo(quote.shares * 1_000_000, 6);
    expect(quote.maxPayout).toBe(quote.shares);
    expect(quote.averagePrice).toBeCloseTo(quote.cashPoints / quote.shares, 12);
  });

  it("rejects a sell larger than the VMM inventory", () => {
    expect(() => quoteSell(baseMarket, "home", 1)).toThrow("exceeds market inventory");
  });
});
