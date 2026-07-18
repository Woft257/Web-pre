import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

beforeAll(() => {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // CI can provide local test variables directly.
  }
});

describe("reusable invite code and immutable submission", () => {
  it("lets multiple UIDs share a code but commits only one prediction per UID", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) throw new Error("Local Supabase credentials are required");

    const supabase = createClient<Database>(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const suffix = String((Date.now() + process.pid) % 10_000).padStart(4, "0");
    const codeHash = "e0cc26c8b0fd8608ab1e9122aa260ed5c810a2a7adb12be38b8de6809b414abc";
    const first = await supabase.rpc("claim_contest_access", { p_uid: `81${suffix}01`, p_code_hash: codeHash });
    const second = await supabase.rpc("claim_contest_access", { p_uid: `81${suffix}02`, p_code_hash: codeHash });
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data?.invite_code_id).toBe(second.data?.invite_code_id);

    const submit = () => supabase.rpc("submit_contest_prediction", {
      p_user_id: first.data!.id,
      p_winner: "argentina",
      p_argentina_score: 2,
      p_spain_score: 1,
      p_messi_scores: true,
    });
    const submissions = await Promise.all([submit(), submit()]);
    expect(submissions.filter((result) => !result.error)).toHaveLength(1);
    expect(submissions.filter((result) => result.error)[0].error?.message)
      .toContain("PREDICTION_ALREADY_SUBMITTED");

    const { count } = await supabase
      .from("predictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", first.data!.id);
    expect(count).toBe(1);
  });
});
