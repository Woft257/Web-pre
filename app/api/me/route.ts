import { requireSessionUser } from "@/lib/auth/session";
import { microToPoints } from "@/lib/domain/constants";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const supabase = createAdminClient();
    const { data: leaderboard, error } = await supabase
      .from("leaderboard_entries")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;

    return apiSuccess({
      id: user.id,
      uid: user.uid,
      maskedUid: `${user.uid.slice(0, 2)}****${user.uid.slice(-2)}`,
      balance: microToPoints(user.balance_micro),
      positionValue: microToPoints(leaderboard?.position_value_micro ?? 0),
      equity: microToPoints(leaderboard?.equity_micro ?? user.balance_micro),
      pnl: microToPoints(leaderboard?.pnl_micro ?? 0),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
