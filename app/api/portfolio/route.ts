import { requireSessionUser } from "@/lib/auth/session";
import { microToPoints, MICRO_UNITS } from "@/lib/domain/constants";
import { serializePosition } from "@/lib/domain/serializers";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const supabase = createAdminClient();
    const [{ data: positions, error: positionsError }, { data: trades, error: tradesError }] =
      await Promise.all([
        supabase
          .from("positions")
          .select("*, markets(*)")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("trades")
          .select("*, markets(title, home_name, away_name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

    if (positionsError) throw positionsError;
    if (tradesError) throw tradesError;

    return apiSuccess({
      positions: positions.map(serializePosition),
      trades: trades.map((trade) => ({
        id: trade.id,
        marketId: trade.market_id,
        marketTitle: trade.markets.title,
        side: trade.side,
        action: trade.action,
        shares: trade.shares_micro / MICRO_UNITS,
        cashDelta: microToPoints(trade.cash_delta_micro),
        averagePrice: trade.average_price_ppm / 1_000_000,
        createdAt: trade.created_at,
      })),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
