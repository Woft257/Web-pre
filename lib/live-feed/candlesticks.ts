import { z } from "zod";

import type { MarketHistoryPoint } from "@/lib/client/types";
import type { LiveFeedMapping } from "@/lib/live-feed/mapping";
import { kalshiCandlesticksUrl } from "@/lib/live-feed/mapping";

const quoteSchema = z.object({
  close_dollars: z.string().optional(),
});

const candlestickSchema = z.object({
  end_period_ts: z.number().int().positive(),
  price: z.object({
    close_dollars: z.string().optional(),
    previous_dollars: z.string().optional(),
  }),
  yes_bid: quoteSchema,
  yes_ask: quoteSchema,
});

const responseSchema = z.object({
  candlesticks: z.array(candlestickSchema),
  ticker: z.string(),
});

type Candlestick = z.infer<typeof candlestickSchema>;

function candleMidpoint(candle: Candlestick) {
  const bid = Number(candle.yes_bid.close_dollars);
  const ask = Number(candle.yes_ask.close_dollars);
  if (Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask <= 1 && bid <= ask) {
    return (bid + ask) / 2;
  }

  const tradePrice = Number(candle.price.close_dollars ?? candle.price.previous_dollars);
  return Number.isFinite(tradePrice) && tradePrice > 0 && tradePrice < 1
    ? tradePrice
    : null;
}

export function normalizeKalshiCandlesticks(
  homePayload: unknown,
  awayPayload: unknown,
  expectedHomeTicker: string,
  expectedAwayTicker: string,
): MarketHistoryPoint[] {
  const homeResponse = responseSchema.parse(homePayload);
  const awayResponse = responseSchema.parse(awayPayload);
  if (homeResponse.ticker !== expectedHomeTicker || awayResponse.ticker !== expectedAwayTicker) {
    throw new Error("Kalshi candlestick ticker mismatch");
  }

  const awayByTimestamp = new Map(
    awayResponse.candlesticks.map((candle) => [candle.end_period_ts, candle]),
  );

  return homeResponse.candlesticks.flatMap((homeCandle) => {
    const awayCandle = awayByTimestamp.get(homeCandle.end_period_ts);
    if (!awayCandle) return [];
    const homeMidpoint = candleMidpoint(homeCandle);
    const awayMidpoint = candleMidpoint(awayCandle);
    if (homeMidpoint === null || awayMidpoint === null) return [];
    const total = homeMidpoint + awayMidpoint;
    const homeProbability = homeMidpoint / total;
    if (!Number.isFinite(homeProbability) || homeProbability < 0.01 || homeProbability > 0.99) {
      return [];
    }

    return [{
      homeProbability,
      awayProbability: 1 - homeProbability,
      sourceAt: new Date(homeCandle.end_period_ts * 1_000).toISOString(),
      oracleVersion: 0,
      event: null,
    }];
  });
}

async function fetchCandlesticks(url: string, source: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`${source} returned HTTP ${response.status}`);
      return await response.json() as unknown;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError;
}

export async function fetchKalshiCandlestickHistory(mapping: LiveFeedMapping) {
  const hourSeconds = 60 * 60;
  const endTs = Math.floor(Date.now() / 1_000 / hourSeconds) * hourSeconds;
  const startTs = endTs - 7 * 24 * hourSeconds;
  const [homePayload, awayPayload] = await Promise.all([
    fetchCandlesticks(
      kalshiCandlesticksUrl(mapping.kalshi.homeTicker, startTs, endTs),
      "Kalshi home candlesticks",
    ),
    fetchCandlesticks(
      kalshiCandlesticksUrl(mapping.kalshi.awayTicker, startTs, endTs),
      "Kalshi away candlesticks",
    ),
  ]);

  return normalizeKalshiCandlesticks(
    homePayload,
    awayPayload,
    mapping.kalshi.homeTicker,
    mapping.kalshi.awayTicker,
  );
}
