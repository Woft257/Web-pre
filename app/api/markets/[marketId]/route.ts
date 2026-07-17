import { serializeMarket } from "@/lib/domain/serializers";
import { ApiError, apiFailure, apiSuccess } from "@/lib/http/api-response";
import { getMarket } from "@/lib/repositories/queries";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ marketId: string }> },
) {
  try {
    const { marketId } = await context.params;
    const market = await getMarket(marketId);
    if (!market) {
      throw new ApiError(404, "MARKET_NOT_FOUND", "Market not found");
    }

    const supabase = createAdminClient();
    const { data: history, error } = await supabase
      .from("odds_snapshots")
      .select("home_probability_ppm, away_probability_ppm, source_at, oracle_version, raw_payload")
      .eq("market_id", marketId)
      .order("source_at", { ascending: true })
      .limit(300);
    if (error) throw error;

    return apiSuccess({
      ...serializeMarket(market),
      history: history.map((snapshot) => {
        const payload = snapshot.raw_payload;
        const event = payload
          && typeof payload === "object"
          && !Array.isArray(payload)
          && typeof payload.event === "string"
          ? payload.event
          : null;
        return {
          homeProbability: snapshot.home_probability_ppm / 1_000_000,
          awayProbability: snapshot.away_probability_ppm / 1_000_000,
          sourceAt: snapshot.source_at,
          oracleVersion: snapshot.oracle_version,
          event,
        };
      }),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
