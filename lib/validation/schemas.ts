import { z } from "zod";

export const uidSchema = z.string().regex(/^\d{8}$/, "UID must contain exactly 8 digits");

export const sessionRequestSchema = z.object({
  uid: uidSchema,
  password: z.string().min(8).max(128),
});

export const adminCreateUserSchema = z.object({
  uid: uidSchema,
  password: z.string().min(8).max(128),
});

export const adminUpdatePasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

export const quoteRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("buy"),
    side: z.enum(["home", "away"]),
    amount: z.number().min(10),
  }),
  z.object({
    action: z.literal("sell"),
    side: z.enum(["home", "away"]),
    shares: z.number().positive(),
  }),
]);

export const tradeRequestSchema = z.object({
  quoteToken: z.string().min(20),
  idempotencyKey: z.string().min(8).max(100),
});

export const adminStatusSchema = z.object({
  status: z.enum(["pre_match_open", "live_open", "suspended", "ended"]),
  reason: z.string().trim().min(2).max(240),
});

export const adminSettlementSchema = z.object({
  outcome: z.enum(["home", "away"]),
  resultSource: z.string().trim().min(2).max(120),
  resultReference: z.string().trim().max(300).optional().default(""),
});

export const adminVoidSchema = z.object({
  resultSource: z.string().trim().min(2).max(120),
  resultReference: z.string().trim().max(300).optional().default(""),
});

export const oracleUpdateSchema = z.object({
  marketId: z.uuid(),
  provider: z.string().min(2).max(50),
  homeProbability: z.number().min(0.01).max(0.99),
  awayProbability: z.number().min(0.01).max(0.99),
  sourceAt: z.iso.datetime(),
  status: z.enum(["pre_match_open", "live_open", "suspended", "ended"]),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  matchMinute: z.number().int().min(0).max(150).nullable().optional(),
  matchPeriod: z.string().max(40).nullable().optional(),
  latestEvent: z.string().max(240).nullable().optional(),
  suspensionReason: z.string().max(240).nullable().optional(),
  homeDecimalOdds: z.number().positive().nullable().optional(),
  awayDecimalOdds: z.number().positive().nullable().optional(),
  rawPayload: z.unknown().optional(),
}).refine((value) => Math.abs(value.homeProbability + value.awayProbability - 1) < 0.000001, {
  message: "Home and away probabilities must sum to 1",
});
