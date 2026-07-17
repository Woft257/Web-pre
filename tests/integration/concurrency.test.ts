import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

beforeAll(() => {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // CI can provide the variables directly instead of an env file.
  }
});

describe("atomic trade concurrency", () => {
  it("commits one request when two quotes use the same VMM version", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error("Local Supabase credentials are required for integration tests");
    }

    const supabase = createClient<Database>(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const uid = String(80_000_000 + ((Date.now() + process.pid) % 10_000_000));
    const { data: user, error: userError } = await supabase
      .rpc("create_or_get_event_user", { p_uid: uid });
    expect(userError).toBeNull();
    expect(user).toBeTruthy();

    const { data: market, error: marketError } = await supabase
      .from("markets")
      .select("id, oracle_version, vmm_version")
      .eq("status", "pre_match_open")
      .limit(1)
      .single();
    expect(marketError).toBeNull();
    expect(market).toBeTruthy();

    const trade = (suffix: string) => supabase.rpc("place_trade", {
      p_user_id: user!.id,
      p_market_id: market!.id,
      p_side: "home",
      p_action: "buy",
      p_amount_micro: 6_000_000_000,
      p_quote_id: crypto.randomUUID(),
      p_idempotency_key: `concurrency-${suffix}-${crypto.randomUUID()}`,
      p_expected_oracle_version: market!.oracle_version,
      p_expected_vmm_version: market!.vmm_version,
    });

    const results = await Promise.all([trade("a"), trade("b")]);
    const successes = results.filter((result) => !result.error);
    const failures = results.filter((result) => result.error);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].error?.message).toContain("VMM_VERSION_CHANGED");

    const [{ data: refreshedUser }, { count: tradeCount }] = await Promise.all([
      supabase.from("event_users").select("balance_micro").eq("id", user!.id).single(),
      supabase.from("trades").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
    ]);
    expect(refreshedUser?.balance_micro).toBe(4_000_000_000);
    expect(tradeCount).toBe(1);
  });
});
