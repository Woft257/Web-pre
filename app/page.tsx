import { EventDashboard } from "@/components/event-dashboard";
import { getSessionUser } from "@/lib/auth/session";
import { microToPoints } from "@/lib/domain/constants";
import { serializeMarket } from "@/lib/domain/serializers";
import type { CurrentUser } from "@/lib/client/types";
import { listMarkets } from "@/lib/repositories/queries";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [marketRows, sessionUser] = await Promise.all([listMarkets(), getSessionUser()]);
  let user: CurrentUser | null = null;

  if (sessionUser) {
    const supabase = createAdminClient();
    const { data: leaderboard } = await supabase
      .from("leaderboard_entries")
      .select("*")
      .eq("user_id", sessionUser.id)
      .maybeSingle();
    user = {
      id: sessionUser.id,
      uid: sessionUser.uid,
      maskedUid: `${sessionUser.uid.slice(0, 2)}****${sessionUser.uid.slice(-2)}`,
      balance: microToPoints(sessionUser.balance_micro),
      positionValue: microToPoints(leaderboard?.position_value_micro ?? 0),
      equity: microToPoints(leaderboard?.equity_micro ?? sessionUser.balance_micro),
      pnl: microToPoints(leaderboard?.pnl_micro ?? 0),
    };
  }

  return <EventDashboard initialMarkets={marketRows.map(serializeMarket)} initialUser={user} />;
}
