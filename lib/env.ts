import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  SESSION_SECRET: z.string().min(32),
  ADMIN_SECRET: z.string().min(12),
  ODDS_PROVIDER: z.literal("kalshi-fifa").default("kalshi-fifa"),
  LIVE_FEED_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(2_000),
  ODDS_WORKER_SECRET: z.string().min(12),
  NEXT_PUBLIC_APP_TIME_ZONE: z.string().default("Asia/Bangkok"),
});

export const env = serverEnvSchema.parse(process.env);
