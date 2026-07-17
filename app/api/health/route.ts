import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("markets")
      .select("id", { count: "exact", head: true });
    if (error) throw error;

    return apiSuccess({
      status: "ok",
      database: "connected",
      marketCount: count ?? 0,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
