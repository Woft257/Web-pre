import { z } from "zod";

const fifaTeamSchema = z.object({
  Score: z.number().int().min(0).nullable(),
  Abbreviation: z.string().min(2).max(4),
});

const fifaMatchSchema = z.object({
  IdMatch: z.string(),
  MatchStatus: z.number().int(),
  OfficialityStatus: z.number().int(),
  ResultType: z.number().int(),
  Winner: z.string().nullable(),
  Period: z.number().int(),
  MatchTime: z.string().nullable(),
  HomeTeam: fifaTeamSchema,
  AwayTeam: fifaTeamSchema,
});

export type FifaMatchPhase = "scheduled" | "live" | "ended";

export interface FifaMatchState {
  matchId: string;
  phase: FifaMatchPhase;
  homeScore: number;
  awayScore: number;
  minute: number | null;
  period: string;
  fifaMatchStatus: number;
  fifaOfficialityStatus: number;
}

function parseMinute(matchTime: string | null) {
  const value = matchTime?.match(/^\d+/)?.[0];
  if (!value) return null;
  const minute = Number(value);
  return Number.isInteger(minute) && minute >= 0 && minute <= 150 ? minute : null;
}

function determinePhase(match: z.infer<typeof fifaMatchSchema>): FifaMatchPhase {
  if (match.MatchStatus === 0 && match.OfficialityStatus === 1) {
    return "ended";
  }
  if (match.MatchStatus === 1 && match.Period === 0) {
    return "scheduled";
  }
  if (
    match.Period > 0
    || match.HomeTeam.Score !== null
    || match.AwayTeam.Score !== null
    || (parseMinute(match.MatchTime) ?? 0) > 0
  ) {
    return "live";
  }

  throw new Error(
    `Unsupported FIFA match state ${match.MatchStatus}/${match.OfficialityStatus}/${match.Period}`,
  );
}

export function parseFifaMatch(
  payload: unknown,
  expectedMatchId: string,
  databaseHomeCode: string,
  databaseAwayCode: string,
): FifaMatchState {
  const match = fifaMatchSchema.parse(payload);
  if (match.IdMatch !== expectedMatchId) {
    throw new Error(`FIFA returned match ${match.IdMatch}, expected ${expectedMatchId}`);
  }

  const teams = new Map([
    [match.HomeTeam.Abbreviation, match.HomeTeam],
    [match.AwayTeam.Abbreviation, match.AwayTeam],
  ]);
  const home = teams.get(databaseHomeCode);
  const away = teams.get(databaseAwayCode);
  if (!home || !away || databaseHomeCode === databaseAwayCode) {
    throw new Error(
      `FIFA teams do not match database teams ${databaseHomeCode}/${databaseAwayCode}`,
    );
  }

  const phase = determinePhase(match);
  if (phase !== "scheduled" && (home.Score === null || away.Score === null)) {
    throw new Error("FIFA omitted the score for a live or ended match");
  }

  return {
    matchId: match.IdMatch,
    phase,
    homeScore: home.Score ?? 0,
    awayScore: away.Score ?? 0,
    minute: parseMinute(match.MatchTime),
    period: phase === "scheduled" ? "Scheduled" : phase === "ended" ? "Full time" : "Live",
    fifaMatchStatus: match.MatchStatus,
    fifaOfficialityStatus: match.OfficialityStatus,
  };
}
