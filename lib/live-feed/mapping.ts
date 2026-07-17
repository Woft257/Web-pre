import { z } from "zod";

const feedMappingSchema = z.object({
  kalshi: z.object({
    homeTicker: z.string().min(3),
    awayTicker: z.string().min(3),
  }),
  fifa: z.object({
    competitionId: z.string().min(1),
    seasonId: z.string().min(1),
    stageId: z.string().min(1),
    matchId: z.string().min(1),
  }),
});

export type LiveFeedMapping = z.infer<typeof feedMappingSchema>;

export function parseLiveFeedMapping(value: string | null): LiveFeedMapping {
  if (!value) {
    throw new Error("Missing live-feed provider mapping");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Live-feed provider mapping must be valid JSON");
  }

  return feedMappingSchema.parse(parsed);
}

export function fifaMatchUrl(mapping: LiveFeedMapping) {
  const { competitionId, seasonId, stageId, matchId } = mapping.fifa;
  return `https://api.fifa.com/api/v3/live/football/${competitionId}/${seasonId}/${stageId}/${matchId}`;
}

export function kalshiMarketUrl(ticker: string) {
  return `https://external-api.kalshi.com/trade-api/v2/markets/${encodeURIComponent(ticker)}`;
}

export function kalshiCandlesticksUrl(
  ticker: string,
  startTs: number,
  endTs: number,
  periodIntervalMinutes = 60,
) {
  const seriesTicker = ticker.split("-")[0];
  if (!seriesTicker) throw new Error(`Cannot derive Kalshi series from ${ticker}`);
  const url = new URL(
    `https://external-api.kalshi.com/trade-api/v2/series/${encodeURIComponent(seriesTicker)}/markets/${encodeURIComponent(ticker)}/candlesticks`,
  );
  url.searchParams.set("start_ts", String(startTs));
  url.searchParams.set("end_ts", String(endTs));
  url.searchParams.set("period_interval", String(periodIntervalMinutes));
  return url.toString();
}
