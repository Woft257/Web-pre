import { microToPoints, MICRO_UNITS, PRICE_PPM } from "@/lib/domain/constants";
import { marginalProbability, marketStateFromRow } from "@/lib/domain/pricing";
import type { Database } from "@/lib/supabase/database.types";

export type MarketRow = Database["public"]["Tables"]["markets"]["Row"];

export function serializeMarket(row: MarketRow) {
  const state = marketStateFromRow(row);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    competition: row.competition,
    stage: row.stage,
    home: {
      name: row.home_name,
      code: row.home_code,
      score: row.home_score,
      oracleProbability: row.oracle_home_probability_ppm / PRICE_PPM,
      price: marginalProbability(state, "home"),
    },
    away: {
      name: row.away_name,
      code: row.away_code,
      score: row.away_score,
      oracleProbability: row.oracle_away_probability_ppm / PRICE_PPM,
      price: marginalProbability(state, "away"),
    },
    kickoffAt: row.kickoff_at,
    tradingEndAt: row.trading_end_at,
    status: row.status,
    outcome: row.outcome,
    feedStatus: row.feed_status,
    suspensionReason: row.suspension_reason,
    matchMinute: row.match_minute,
    matchPeriod: row.match_period,
    latestEvent: row.latest_event,
    oracleSourceAt: row.oracle_source_at,
    oracleReceivedAt: row.oracle_received_at,
    oracleVersion: row.oracle_version,
    vmmVersion: row.vmm_version,
    minOrder: microToPoints(row.min_order_micro),
    maxOrder: microToPoints(row.max_order_micro),
    maxExposure: microToPoints(row.max_user_exposure_micro),
    canTrade:
      ["pre_match_open", "live_open"].includes(row.status) && row.feed_status === "healthy",
  };
}

export function serializePosition(row: {
  market_id: string;
  home_shares_micro: number;
  away_shares_micro: number;
  home_cost_micro: number;
  away_cost_micro: number;
  gross_bought_micro: number;
  net_cost_micro: number;
  realized_pnl_micro: number;
  markets: MarketRow;
}) {
  const market = serializeMarket(row.markets);
  const homeShares = row.home_shares_micro / MICRO_UNITS;
  const awayShares = row.away_shares_micro / MICRO_UNITS;
  const markValue = homeShares * market.home.oracleProbability + awayShares * market.away.oracleProbability;
  return {
    marketId: row.market_id,
    market,
    homeShares,
    awayShares,
    homeCost: microToPoints(row.home_cost_micro),
    awayCost: microToPoints(row.away_cost_micro),
    grossBought: microToPoints(row.gross_bought_micro),
    netCost: microToPoints(row.net_cost_micro),
    realizedPnl: microToPoints(row.realized_pnl_micro),
    markValue,
    unrealizedPnl: markValue - microToPoints(row.net_cost_micro),
  };
}
