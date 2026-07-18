import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const [settingsResult, usersResult, predictionsResult] = await Promise.all([
      supabase.from("contest_settings").select("id").eq("id", true).maybeSingle(),
      supabase.from("event_users").select("id", { count: "exact", head: true }),
      supabase.from("predictions").select("id", { count: "exact", head: true }),
    ]);
    if (settingsResult.error) throw settingsResult.error;
    if (usersResult.error) throw usersResult.error;
    if (predictionsResult.error) throw predictionsResult.error;
    return apiSuccess({
      status: settingsResult.data ? "ok" : "degraded",
      database: "connected",
      participants: usersResult.count ?? 0,
      predictions: predictionsResult.count ?? 0,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
