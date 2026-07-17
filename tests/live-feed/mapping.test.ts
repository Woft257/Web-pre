import { describe, expect, it } from "vitest";

import {
  fifaMatchUrl,
  kalshiCandlesticksUrl,
  kalshiMarketUrl,
  parseLiveFeedMapping,
} from "@/lib/live-feed/mapping";

const mappingJson = JSON.stringify({
  kalshi: { homeTicker: "HOME", awayTicker: "AWAY" },
  fifa: {
    competitionId: "17",
    seasonId: "285023",
    stageId: "289291",
    matchId: "400021542",
  },
});

describe("live-feed mapping", () => {
  it("builds the exact public provider URLs", () => {
    const mapping = parseLiveFeedMapping(mappingJson);

    expect(fifaMatchUrl(mapping)).toBe(
      "https://api.fifa.com/api/v3/live/football/17/285023/289291/400021542",
    );
    expect(kalshiMarketUrl(mapping.kalshi.homeTicker)).toBe(
      "https://external-api.kalshi.com/trade-api/v2/markets/HOME",
    );
    expect(kalshiCandlesticksUrl("SERIES-EVENT-HOME", 100, 200)).toBe(
      "https://external-api.kalshi.com/trade-api/v2/series/SERIES/markets/SERIES-EVENT-HOME/candlesticks?start_ts=100&end_ts=200&period_interval=60",
    );
  });

  it("rejects missing and malformed database mappings", () => {
    expect(() => parseLiveFeedMapping(null)).toThrow("Missing");
    expect(() => parseLiveFeedMapping("not-json")).toThrow("valid JSON");
  });
});
