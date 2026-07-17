import { z } from "zod";

const kalshiMarketResponseSchema = z.object({
  market: z.object({
    ticker: z.string(),
    status: z.string(),
    yes_bid_dollars: z.string(),
    yes_ask_dollars: z.string(),
    updated_time: z.string(),
  }),
});

export interface KalshiSideQuote {
  ticker: string;
  bid: number;
  ask: number;
  midpoint: number;
  updatedAt: string;
}

export interface KalshiBinaryPrice {
  homeProbability: number;
  awayProbability: number;
  home: KalshiSideQuote;
  away: KalshiSideQuote;
  updatedAt: string;
}

export function parseKalshiSide(payload: unknown, expectedTicker: string): KalshiSideQuote {
  const { market } = kalshiMarketResponseSchema.parse(payload);
  if (market.ticker !== expectedTicker) {
    throw new Error(`Kalshi returned ${market.ticker}, expected ${expectedTicker}`);
  }
  if (market.status !== "active") {
    throw new Error(`Kalshi market ${market.ticker} is ${market.status}`);
  }

  const bid = Number(market.yes_bid_dollars);
  const ask = Number(market.yes_ask_dollars);
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask >= 1 || bid > ask) {
    throw new Error(`Kalshi market ${market.ticker} has an invalid bid/ask`);
  }
  if (ask - bid > 0.15) {
    throw new Error(`Kalshi market ${market.ticker} spread is too wide`);
  }
  if (!Number.isFinite(Date.parse(market.updated_time))) {
    throw new Error(`Kalshi market ${market.ticker} has an invalid update timestamp`);
  }

  return {
    ticker: market.ticker,
    bid,
    ask,
    midpoint: (bid + ask) / 2,
    updatedAt: market.updated_time,
  };
}

export function normalizeKalshiPair(
  homePayload: unknown,
  awayPayload: unknown,
  homeTicker: string,
  awayTicker: string,
): KalshiBinaryPrice {
  const home = parseKalshiSide(homePayload, homeTicker);
  const away = parseKalshiSide(awayPayload, awayTicker);
  const total = home.midpoint + away.midpoint;
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Kalshi pair has no usable price");
  }

  const homeProbability = home.midpoint / total;
  if (homeProbability < 0.01 || homeProbability > 0.99) {
    throw new Error("Kalshi normalized price is outside the supported range");
  }

  return {
    homeProbability,
    awayProbability: 1 - homeProbability,
    home,
    away,
    updatedAt: new Date(
      Math.max(Date.parse(home.updatedAt), Date.parse(away.updatedAt)),
    ).toISOString(),
  };
}
