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

export const predictionRequestSchema = z.object({
  winner: z.enum(["argentina", "spain"]),
  argentinaScore: z.number().int().min(0).max(20),
  spainScore: z.number().int().min(0).max(20),
  messiScores: z.boolean(),
}).strict();

export const adminResultSchema = predictionRequestSchema;

export const adminPredictionStatusSchema = z.object({
  open: z.boolean(),
}).strict();

export const adminGenerateCodesSchema = z.object({
  count: z.number().int().min(1).max(20).default(1),
}).strict();
