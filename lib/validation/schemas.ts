import { z } from "zod";

export const uidSchema = z.string().regex(/^\d{8}$/, "UID must contain exactly 8 digits");

export const accessRequestSchema = z.object({
  uid: uidSchema,
  code: z.string()
    .trim()
    .min(8)
    .max(32)
    .transform((value) => value.toUpperCase()),
}).strict();

const scoredPredictionSchema = z.object({
  winner: z.enum(["argentina", "spain"]),
  argentinaScore: z.number().int().min(0).max(20),
  spainScore: z.number().int().min(0).max(20),
  messiScores: z.boolean(),
});

export const predictionRequestSchema = scoredPredictionSchema.extend({
  bdName: z.string().trim().min(1, "BD name is required").max(100),
}).strict();

export const adminResultSchema = scoredPredictionSchema.strict();

export const adminPredictionStatusSchema = z.object({
  open: z.boolean(),
}).strict();

export const adminGenerateCodesSchema = z.object({
  count: z.number().int().min(1).max(20).default(1),
}).strict();

export const adminResetContestSchema = z.object({
  confirmation: z.literal("RESET"),
}).strict();

export const adminParticipantQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  search: z.string().trim().max(8).regex(/^\d*$/, "UID search must contain digits only").default(""),
});
