import "server-only";

import {
  serializeLeaderboardEntry,
  serializePrediction,
  serializeResult,
  serializeSettings,
  serializeTimelineEntry,
} from "@/lib/domain/contest";
import { createAdminClient } from "@/lib/supabase/server";

export async function getContestData() {
  const supabase = createAdminClient();
  const [settingsResult, resultResult, usersResult, predictionsResult] = await Promise.all([
    supabase.from("contest_settings").select("*").eq("id", true).single(),
    supabase.from("contest_results").select("*").eq("id", true).eq("is_published", true).maybeSingle(),
    supabase.from("event_users").select("id", { count: "exact", head: true }),
    supabase.from("predictions").select("id", { count: "exact", head: true }),
  ]);
  if (settingsResult.error) throw settingsResult.error;
  if (resultResult.error) throw resultResult.error;
  if (usersResult.error) throw usersResult.error;
  if (predictionsResult.error) throw predictionsResult.error;

  return {
    settings: serializeSettings(settingsResult.data),
    result: resultResult.data ? serializeResult(resultResult.data) : null,
    stats: {
      participants: usersResult.count ?? 0,
      predictions: predictionsResult.count ?? 0,
    },
  };
}

export async function getUserPrediction(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? serializePrediction(data) : null;
}

export async function getTimeline() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("*, event_users!inner(uid)")
    .order("submitted_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return data.map((row, index) => serializeTimelineEntry({
    ...row,
    uid: row.event_users.uid,
  }, index));
}

export async function getLeaderboard() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contest_leaderboard")
    .select("*")
    .order("rank", { ascending: true });
  if (error) throw error;
  return data.map(serializeLeaderboardEntry);
}
