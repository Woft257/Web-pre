import { describe, expect, it } from "vitest";

import { compactPriceHistory } from "@/lib/domain/history";

function point(homeProbability: number, sourceAt: string, event: string | null = null) {
  return {
    homeProbability,
    awayProbability: 1 - homeProbability,
    sourceAt,
    oracleVersion: 1,
    event,
  };
}

describe("price history", () => {
  it("collapses consecutive heartbeat duplicates and keeps the newest timestamp", () => {
    const compacted = compactPriceHistory([
      point(0.635, "2026-07-18T01:00:00Z"),
      point(0.635, "2026-07-18T01:00:02Z"),
      point(0.635, "2026-07-18T01:00:04Z"),
    ]);

    expect(compacted).toHaveLength(1);
    expect(compacted[0].sourceAt).toBe("2026-07-18T01:00:04Z");
  });

  it("keeps real price moves and goal markers", () => {
    const compacted = compactPriceHistory([
      point(0.635, "2026-07-18T01:00:00Z"),
      point(0.7, "2026-07-18T01:10:00Z", "Goal - FRA 1:0 ENG"),
      point(0.7, "2026-07-18T01:10:02Z"),
    ]);

    expect(compacted).toHaveLength(3);
    expect(compacted[1].event).toBe("Goal - FRA 1:0 ENG");
  });
});
