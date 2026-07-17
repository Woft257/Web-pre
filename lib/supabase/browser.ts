"use client";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

let browserClient: ReturnType<typeof createClient<Database>> | undefined;

export function getBrowserClient() {
  if (!browserClient) {
    browserClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  }

  return browserClient;
}
