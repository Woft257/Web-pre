import { describe, expect, it } from "vitest";

import { isFeedFresh, LIVE_FEED_STALE_MS, PRE_MATCH_FEED_STALE_MS } from "@/lib/domain/feed";

describe("feed freshness", () => {
  const now = Date.parse("2026-07-18T01:00:00Z");

  it("uses a strict live threshold and a wider pre-match threshold", () => {
    expect(isFeedFresh("live_open", new Date(now - LIVE_FEED_STALE_MS).toISOString(), now)).toBe(true);
    expect(isFeedFresh("live_open", new Date(now - LIVE_FEED_STALE_MS - 1).toISOString(), now)).toBe(false);
    expect(isFeedFresh("pre_match_open", new Date(now - PRE_MATCH_FEED_STALE_MS).toISOString(), now)).toBe(true);
    expect(isFeedFresh("pre_match_open", new Date(now - PRE_MATCH_FEED_STALE_MS - 1).toISOString(), now)).toBe(false);
  });

  it("rejects missing, invalid, far-future, and closed-market timestamps", () => {
    expect(isFeedFresh("live_open", null, now)).toBe(false);
    expect(isFeedFresh("live_open", "invalid", now)).toBe(false);
    expect(isFeedFresh("live_open", new Date(now + 31_000).toISOString(), now)).toBe(false);
    expect(isFeedFresh("suspended", new Date(now).toISOString(), now)).toBe(false);
  });
});
