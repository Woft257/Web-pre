import { describe, expect, it } from "vitest";

import { parseFifaMatch } from "@/lib/live-feed/fifa";

function fifaPayload(overrides: Record<string, unknown> = {}) {
  return {
    IdMatch: "400021543",
    MatchStatus: 1,
    OfficialityStatus: 0,
    ResultType: 0,
    Winner: null,
    Period: 0,
    MatchTime: "0'",
    HomeTeam: { Score: null, Abbreviation: "ESP" },
    AwayTeam: { Score: null, Abbreviation: "ARG" },
    ...overrides,
  };
}

describe("FIFA score parser", () => {
  it("maps FIFA home/away teams to the database ordering", () => {
    const match = parseFifaMatch(
      fifaPayload({
        MatchStatus: 2,
        Period: 5,
        MatchTime: "67'",
        HomeTeam: { Score: 2, Abbreviation: "ESP" },
        AwayTeam: { Score: 1, Abbreviation: "ARG" },
      }),
      "400021543",
      "ARG",
      "ESP",
    );

    expect(match.phase).toBe("live");
    expect(match.homeScore).toBe(1);
    expect(match.awayScore).toBe(2);
    expect(match.minute).toBe(67);
  });

  it("recognizes the verified scheduled and official final states", () => {
    const scheduled = parseFifaMatch(fifaPayload(), "400021543", "ESP", "ARG");
    const ended = parseFifaMatch(fifaPayload({
      MatchStatus: 0,
      OfficialityStatus: 1,
      ResultType: 1,
      Winner: "43969",
      Period: 10,
      MatchTime: "98'",
      HomeTeam: { Score: 2, Abbreviation: "ESP" },
      AwayTeam: { Score: 0, Abbreviation: "ARG" },
    }), "400021543", "ESP", "ARG");

    expect(scheduled.phase).toBe("scheduled");
    expect(scheduled.homeScore).toBe(0);
    expect(ended.phase).toBe("ended");
    expect(ended.period).toBe("Full time");
  });

  it("rejects an unexpected match or team mapping", () => {
    expect(() => parseFifaMatch(fifaPayload(), "wrong", "ESP", "ARG"))
      .toThrow("expected wrong");
    expect(() => parseFifaMatch(fifaPayload(), "400021543", "FRA", "ARG"))
      .toThrow("do not match");
  });
});
