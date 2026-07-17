import { createClient } from "@supabase/supabase-js";

import { parseFifaMatch } from "@/lib/live-feed/fifa";
import { normalizeKalshiPair } from "@/lib/live-feed/kalshi";
import {
  fifaMatchUrl,
  kalshiMarketUrl,
  parseLiveFeedMapping,
} from "@/lib/live-feed/mapping";
import type { Database, Json } from "@/lib/supabase/database.types";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const pollIntervalMs = Number(process.env.LIVE_FEED_POLL_INTERVAL_MS ?? 2_000);
if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 500) {
  throw new Error("LIVE_FEED_POLL_INTERVAL_MS must be an integer of at least 500");
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

type Market = Database["public"]["Tables"]["markets"]["Row"];
type OracleStatus = "pre_match_open" | "live_open" | "suspended" | "ended";
const GOAL_WAITING_REASON = "Goal detected; awaiting fresh Kalshi prices";
const GOAL_PRICE_OBSERVED_REASON = "Goal detected; fresh Kalshi price observed";

async function fetchJson(url: string, source: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(`${source} returned HTTP ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

function baseStatus(phase: "scheduled" | "live" | "ended"): OracleStatus {
  if (phase === "scheduled") return "pre_match_open";
  if (phase === "live") return "live_open";
  return "ended";
}

function kalshiHasUpdatedAfterSuspension(
  market: Market,
  homeUpdatedAt: string,
  awayUpdatedAt: string,
) {
  if (!market.suspended_at) return false;
  const suspendedAt = Date.parse(market.suspended_at);
  return Date.parse(homeUpdatedAt) > suspendedAt && Date.parse(awayUpdatedAt) > suspendedAt;
}

async function syncMarket(market: Market) {
  const mapping = parseLiveFeedMapping(market.provider_event_id);
  const fifaPayload = await fetchJson(fifaMatchUrl(mapping), "FIFA");
  const fifa = parseFifaMatch(
    fifaPayload,
    mapping.fifa.matchId,
    market.home_code,
    market.away_code,
  );
  const sourceAt = new Date().toISOString();

  // A final score comes from FIFA, not from an exchange price. Keep the last mark
  // only to satisfy the oracle row contract, then permanently end trading.
  if (fifa.phase === "ended") {
    const { error } = await supabase.rpc("update_market_oracle", {
      p_market_id: market.id,
      p_provider: "kalshi-fifa",
      p_home_probability_ppm: market.oracle_home_probability_ppm,
      p_away_probability_ppm: market.oracle_away_probability_ppm,
      p_source_at: sourceAt,
      p_status: "ended",
      p_home_score: fifa.homeScore,
      p_away_score: fifa.awayScore,
      p_match_minute: fifa.minute ?? undefined,
      p_match_period: fifa.period,
      p_latest_event: market.latest_event ?? undefined,
      p_raw_payload: {
        priceSource: "last-valid-kalshi-mark",
        scoreSource: "fifa-live-api",
        fifa: {
          matchId: fifa.matchId,
          matchStatus: fifa.fifaMatchStatus,
          officialityStatus: fifa.fifaOfficialityStatus,
        },
      },
    });
    if (error) throw error;
    return;
  }

  const [kalshiHomePayload, kalshiAwayPayload] = await Promise.all([
    fetchJson(kalshiMarketUrl(mapping.kalshi.homeTicker), "Kalshi home market"),
    fetchJson(kalshiMarketUrl(mapping.kalshi.awayTicker), "Kalshi away market"),
  ]);
  const price = normalizeKalshiPair(
    kalshiHomePayload,
    kalshiAwayPayload,
    mapping.kalshi.homeTicker,
    mapping.kalshi.awayTicker,
  );
  const homePpm = Math.round(price.homeProbability * 1_000_000);
  const scoreIncreased = fifa.homeScore > market.home_score || fifa.awayScore > market.away_score;
  let status = baseStatus(fifa.phase);
  let suspensionReason: string | undefined;

  if (scoreIncreased) {
    status = "suspended";
    const previousPollAt = market.oracle_source_at ? Date.parse(market.oracle_source_at) : NaN;
    const priceAlreadyRefreshed = Number.isFinite(previousPollAt)
      && Date.parse(price.home.updatedAt) > previousPollAt
      && Date.parse(price.away.updatedAt) > previousPollAt;
    suspensionReason = priceAlreadyRefreshed
      ? GOAL_PRICE_OBSERVED_REASON
      : GOAL_WAITING_REASON;
  } else if (
    market.status === "suspended"
    && market.suspension_reason === GOAL_WAITING_REASON
  ) {
    status = "suspended";
    suspensionReason = kalshiHasUpdatedAfterSuspension(
      market,
      price.home.updatedAt,
      price.away.updatedAt,
    )
      ? GOAL_PRICE_OBSERVED_REASON
      : GOAL_WAITING_REASON;
  } else if (
    market.status === "suspended"
    && market.suspension_reason === GOAL_PRICE_OBSERVED_REASON
  ) {
    status = "live_open";
  }

  const latestEvent = scoreIncreased
    ? `Goal - ${market.home_code} ${fifa.homeScore}:${fifa.awayScore} ${market.away_code}`
    : market.latest_event ?? undefined;
  const rawPayload: Json = {
    priceSource: "kalshi-rest-midpoint",
    scoreSource: "fifa-live-api",
    normalization: "normalize-two-kalshi-yes-midpoints-v1",
    kalshi: {
      home: {
        ticker: price.home.ticker,
        bid: price.home.bid,
        ask: price.home.ask,
        updatedAt: price.home.updatedAt,
      },
      away: {
        ticker: price.away.ticker,
        bid: price.away.bid,
        ask: price.away.ask,
        updatedAt: price.away.updatedAt,
      },
    },
    fifa: {
      matchId: fifa.matchId,
      matchStatus: fifa.fifaMatchStatus,
      officialityStatus: fifa.fifaOfficialityStatus,
    },
    ...(scoreIncreased && latestEvent ? { event: latestEvent } : {}),
  };

  const stateChanged = homePpm !== market.oracle_home_probability_ppm
    || 1_000_000 - homePpm !== market.oracle_away_probability_ppm
    || fifa.homeScore !== market.home_score
    || fifa.awayScore !== market.away_score
    || status !== market.status
    || latestEvent !== (market.latest_event ?? undefined)
    || (status === "suspended" && suspensionReason !== (market.suspension_reason ?? undefined));

  if (!stateChanged) {
    const { error } = await supabase.rpc("heartbeat_market_feed", {
      p_market_id: market.id,
      p_provider: "kalshi-fifa",
      p_source_at: sourceAt,
      p_match_minute: fifa.minute ?? undefined,
      p_match_period: fifa.period,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.rpc("update_market_oracle", {
    p_market_id: market.id,
    p_provider: "kalshi-fifa",
    p_home_probability_ppm: homePpm,
    p_away_probability_ppm: 1_000_000 - homePpm,
    p_source_at: sourceAt,
    p_status: status,
    p_home_score: fifa.homeScore,
    p_away_score: fifa.awayScore,
    p_match_minute: fifa.minute ?? undefined,
    p_match_period: fifa.period,
    p_latest_event: latestEvent,
    p_suspension_reason: suspensionReason,
    p_raw_payload: rawPayload,
  });
  if (error) throw error;
}

async function suspendForFeedFailure(market: Market, error: unknown) {
  console.error(`[live-feed] ${market.slug}:`, error);
  if (market.status === "suspended") return;

  const { error: statusError } = await supabase.rpc("set_market_status", {
    p_market_id: market.id,
    p_status: "suspended",
    p_reason: "Kalshi price or FIFA score feed unavailable or invalid",
    p_actor: "live-feed-worker",
  });
  if (statusError) console.error(`[live-feed] could not suspend ${market.slug}:`, statusError);
}

export async function syncOnce() {
  const { data: markets, error } = await supabase
    .from("markets")
    .select("*")
    .eq("provider", "kalshi-fifa")
    .in("status", ["pre_match_open", "live_open", "suspended"]);
  if (error) throw error;

  await Promise.all(
    markets.map(async (market) => {
      try {
        await syncMarket(market);
      } catch (error) {
        await suspendForFeedFailure(market, error);
      }
    }),
  );
}

let stopped = false;
process.on("SIGINT", () => { stopped = true; });
process.on("SIGTERM", () => { stopped = true; });

const runOnce = process.argv.includes("--once");

async function main() {
  do {
    await syncOnce();
    if (!runOnce) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  } while (!stopped && !runOnce);
}

main().catch((error) => {
  console.error("[live-feed] fatal error:", error);
  process.exitCode = 1;
});
