import { describe, expect, it } from "vitest";

import {
  maskUid,
  serializeLeaderboardEntry,
  serializePrediction,
  serializeSettings,
} from "@/lib/domain/contest";

describe("contest serialization", () => {
  it("masks participant UIDs", () => {
    expect(maskUid("12345678")).toBe("12****78");
  });

  it("serializes immutable answers without price fields", () => {
    expect(serializePrediction({
      winner: "spain",
      argentina_score: 1,
      spain_score: 2,
      messi_scores: false,
      submitted_at: "2026-07-18T00:00:00.000Z",
    })).toEqual({
      winner: "spain",
      argentinaScore: 1,
      spainScore: 2,
      messiScores: false,
      submittedAt: "2026-07-18T00:00:00.000Z",
    });
  });

  it("maps leaderboard points and FCFS rank", () => {
    expect(serializeLeaderboardEntry({
      rank: 1,
      masked_uid: "12****78",
      points: 30,
      correct_answers: 3,
      submitted_at: "2026-07-18T00:00:00.000Z",
    })).toMatchObject({ rank: 1, points: 30, correctAnswers: 3 });
  });

  it("derives whether the submission window is accepting entries", () => {
    const open = serializeSettings({
      title: "Final",
      home_team: "Argentina",
      away_team: "Spain",
      submission_closes_at: "2099-01-01T00:00:00.000Z",
      predictions_open: true,
    });
    expect(open.acceptingPredictions).toBe(true);
    expect(serializeSettings({
      title: "Final",
      home_team: "Argentina",
      away_team: "Spain",
      submission_closes_at: "2020-01-01T00:00:00.000Z",
      predictions_open: true,
    }).acceptingPredictions).toBe(false);
  });
});
