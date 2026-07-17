import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  SESSION_SECRET: z.string().min(32),
  ADMIN_SECRET: z.string().min(12),
  ODDS_PROVIDER: z.enum(["replay", "the-odds-api"]).default("replay"),
  THE_ODDS_API_KEY: z.string().optional(),
  ODDS_WORKER_SECRET: z.string().min(12),
  NEXT_PUBLIC_APP_TIME_ZONE: z.string().default("Asia/Bangkok"),
  NEXT_PUBLIC_INITIAL_POINTS: z.coerce.number().positive().default(10_000),
});

export const env = serverEnvSchema.parse(process.env);
