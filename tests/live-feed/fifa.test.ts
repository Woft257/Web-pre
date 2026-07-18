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
    HomeTeam: { IdTeam: "43969", Score: null, Abbreviation: "ESP" },
    AwayTeam: { IdTeam: "43922", Score: null, Abbreviation: "ARG" },
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
        HomeTeam: { IdTeam: "43969", Score: 2, Abbreviation: "ESP" },
        AwayTeam: { IdTeam: "43922", Score: 1, Abbreviation: "ARG" },
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
      HomeTeam: { IdTeam: "43969", Score: 2, Abbreviation: "ESP" },
      AwayTeam: { IdTeam: "43922", Score: 0, Abbreviation: "ARG" },
    }), "400021543", "ESP", "ARG");

    expect(scheduled.phase).toBe("scheduled");
    expect(scheduled.homeScore).toBe(0);
    expect(ended.phase).toBe("ended");
    expect(ended.period).toBe("Full time");
    expect(ended.winner).toBe("home");
    expect(ended.resultType).toBe(1);
  });

  it("rejects an unexpected match or team mapping", () => {
    expect(() => parseFifaMatch(fifaPayload(), "wrong", "ESP", "ARG"))
      .toThrow("expected wrong");
    expect(() => parseFifaMatch(fifaPayload(), "400021543", "FRA", "ARG"))
      .toThrow("do not match");
  });

  it("rejects an official final without a matching winner", () => {
    expect(() => parseFifaMatch(fifaPayload({
      MatchStatus: 0,
      OfficialityStatus: 1,
      Winner: null,
      HomeTeam: { IdTeam: "43969", Score: 1, Abbreviation: "ESP" },
      AwayTeam: { IdTeam: "43922", Score: 1, Abbreviation: "ARG" },
    }), "400021543", "ESP", "ARG")).toThrow("official winner");
  });
});
