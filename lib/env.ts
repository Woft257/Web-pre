import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  SESSION_SECRET: z.string().min(32),
  ADMIN_SECRET: z.string().min(12),
  NEXT_PUBLIC_APP_TIME_ZONE: z.string().default("Asia/Bangkok"),
});

export const env = serverEnvSchema.parse(process.env);
