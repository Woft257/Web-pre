import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export async function listMarkets() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .order("kickoff_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getMarket(marketId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .eq("id", marketId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPosition(userId: string, marketId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("user_id", userId)
    .eq("market_id", marketId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
