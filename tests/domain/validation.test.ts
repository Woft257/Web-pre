import { describe, expect, it } from "vitest";

import {
  accessRequestSchema,
  adminGenerateCodesSchema,
  adminParticipantQuerySchema,
  adminResetContestSchema,
  predictionRequestSchema,
} from "@/lib/validation/schemas";

describe("contest request validation", () => {
  it("accepts a reusable code and exactly eight UID digits", () => {
    expect(accessRequestSchema.parse({
      code: "mexc26-0ad8949cb6fa",
      uid: "12345678",
    })).toEqual({
      code: "MEXC26-0AD8949CB6FA",
      uid: "12345678",
    });
    expect(() => accessRequestSchema.parse({ code: "MEXC26-TEST", uid: "123" })).toThrow();
  });

  it("accepts only the two final teams and bounded integer scores", () => {
    expect(predictionRequestSchema.parse({
      winner: "argentina",
      argentinaScore: 2,
      spainScore: 1,
      messiScores: true,
    })).toMatchObject({ winner: "argentina", argentinaScore: 2 });
    expect(() => predictionRequestSchema.parse({
      winner: "france",
      argentinaScore: 2,
      spainScore: 1,
      messiScores: true,
    })).toThrow();
    expect(() => predictionRequestSchema.parse({
      winner: "spain",
      argentinaScore: 21,
      spainScore: 1,
      messiScores: false,
    })).toThrow();
  });

  it("limits admin code generation batches", () => {
    expect(adminGenerateCodesSchema.parse({ count: 5 })).toEqual({ count: 5 });
    expect(() => adminGenerateCodesSchema.parse({ count: 21 })).toThrow();
  });

  it("requires an exact reset confirmation phrase", () => {
    expect(adminResetContestSchema.parse({ confirmation: "RESET" })).toEqual({ confirmation: "RESET" });
    expect(() => adminResetContestSchema.parse({ confirmation: "reset" })).toThrow();
  });

  it("accepts paginated partial UID searches and rejects non-digits", () => {
    expect(adminParticipantQuerySchema.parse({ page: "2", search: "1234" })).toEqual({
      page: 2,
      search: "1234",
    });
    expect(adminParticipantQuerySchema.parse({})).toEqual({ page: 1, search: "" });
    expect(() => adminParticipantQuerySchema.parse({ page: "0", search: "12ab" })).toThrow();
  });
});
