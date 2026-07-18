import type {
  ContestResult,
  ContestSettings,
  LeaderboardEntry,
  Prediction,
  TeamChoice,
  TimelineEntry,
} from "@/lib/client/types";

export function maskUid(uid: string) {
  return `${uid.slice(0, 2)}****${uid.slice(-2)}`;
}

export function serializeSettings(row: {
  title: string;
  home_team: string;
  away_team: string;
  submission_closes_at: string;
  predictions_open: boolean;
}): ContestSettings {
  return {
    title: row.title,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    submissionClosesAt: row.submission_closes_at,
    predictionsOpen: row.predictions_open,
    acceptingPredictions: row.predictions_open && Date.now() < Date.parse(row.submission_closes_at),
  };
}

export function serializePrediction(row: {
  winner: string;
  argentina_score: number;
  spain_score: number;
  messi_scores: boolean;
  submitted_at: string;
}): Prediction {
  return {
    winner: row.winner as TeamChoice,
    argentinaScore: row.argentina_score,
    spainScore: row.spain_score,
    messiScores: row.messi_scores,
    submittedAt: row.submitted_at,
  };
}

export function serializeResult(row: {
  winner: string;
  argentina_score: number;
  spain_score: number;
  messi_scores: boolean;
  published_at: string | null;
}): ContestResult {
  return {
    winner: row.winner as TeamChoice,
    argentinaScore: row.argentina_score,
    spainScore: row.spain_score,
    messiScores: row.messi_scores,
    publishedAt: row.published_at ?? "",
  };
}

export function serializeTimelineEntry(
  row: Parameters<typeof serializePrediction>[0] & { uid: string },
  index: number,
): TimelineEntry {
  return {
    ...serializePrediction(row),
    order: index + 1,
    maskedUid: maskUid(row.uid),
  };
}

export function serializeLeaderboardEntry(row: {
  rank: number | null;
  masked_uid: string | null;
  points: number | null;
  correct_answers: number | null;
  submitted_at: string | null;
}): LeaderboardEntry {
  return {
    rank: Number(row.rank ?? 0),
    maskedUid: row.masked_uid ?? "",
    points: row.points ?? 0,
    correctAnswers: row.correct_answers ?? 0,
    submittedAt: row.submitted_at ?? "",
  };
}
