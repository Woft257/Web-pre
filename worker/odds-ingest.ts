import { createClient } from "@supabase/supabase-js";

import { consensusProbability, type BookmakerPrice } from "@/lib/odds-provider/normalize";
import type { Database } from "@/lib/supabase/database.types";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "THE_ODDS_API_KEY",
] as const;

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing ${name}`);
  }
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface OddsApiOutcome {
  name: string;
  price: number;
}

interface OddsApiBookmaker {
  last_update: string;
  markets: Array<{ key: string; outcomes: OddsApiOutcome[] }>;
}

interface OddsApiEvent {
  bookmakers: OddsApiBookmaker[];
}

function parseProviderMapping(value: string | null) {
  const [sportKey, eventId] = value?.split(":") ?? [];
  if (!sportKey || !eventId) {
    throw new Error("provider_event_id must use sportKey:eventId format");
  }
  return { sportKey, eventId };
}

async function fetchMarketPrices(market: Database["public"]["Tables"]["markets"]["Row"]) {
  const { sportKey, eventId } = parseProviderMapping(market.provider_event_id);
  const url = new URL(
    `https://api.the-odds-api.com/v4/sports/${sportKey}/events/${eventId}/odds`,
  );
  url.searchParams.set("apiKey", process.env.THE_ODDS_API_KEY!);
  url.searchParams.set("regions", "eu");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "decimal");

  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) {
    throw new Error(`Odds provider returned ${response.status}`);
  }
  const event = (await response.json()) as OddsApiEvent;
  const prices: BookmakerPrice[] = [];

  for (const bookmaker of event.bookmakers ?? []) {
    const marketOdds = bookmaker.markets.find((item) => item.key === "h2h");
    if (!marketOdds) continue;
    if (marketOdds.outcomes.length !== 2) {
      throw new Error("Provider returned a 3-way 90-minute market; binary final-winner odds are required");
    }
    const home = marketOdds.outcomes.find((outcome) => outcome.name === market.home_name);
    const away = marketOdds.outcomes.find((outcome) => outcome.name === market.away_name);
    if (home && away) {
      prices.push({
        homeOdds: home.price,
        awayOdds: away.price,
        updatedAt: bookmaker.last_update,
      });
    }
  }

  return consensusProbability(prices);
}

async function syncOnce() {
  const { data: markets, error } = await supabase
    .from("markets")
    .select("*")
    .eq("provider", "the-odds-api")
    .in("status", ["pre_match_open", "live_open", "suspended"]);
  if (error) throw error;

  for (const market of markets) {
    try {
      const consensus = await fetchMarketPrices(market);
      const { error: updateError } = await supabase.rpc("update_market_oracle", {
        p_market_id: market.id,
        p_provider: "the-odds-api",
        p_home_probability_ppm: Math.round(consensus.homeProbability * 1_000_000),
        p_away_probability_ppm: Math.round(consensus.awayProbability * 1_000_000),
        p_source_at: consensus.sourceAt,
        p_status: market.status === "pre_match_open" ? "pre_match_open" : "live_open",
        p_home_score: market.home_score,
        p_away_score: market.away_score,
        p_match_minute: market.match_minute ?? undefined,
        p_match_period: market.match_period ?? undefined,
        p_latest_event: market.latest_event ?? undefined,
        p_raw_payload: {
          bookmakerCount: consensus.bookmakerCount,
          normalization: "inverse-odds-normalized-median-v1",
        },
      });
      if (updateError) throw updateError;
    } catch (error) {
      console.error(`[odds-worker] ${market.slug}:`, error);
      await supabase.rpc("set_market_status", {
        p_market_id: market.id,
        p_status: "suspended",
        p_reason: "Live odds feed unavailable or invalid",
        p_actor: "odds-worker",
      });
    }
  }
}

let stopped = false;
process.on("SIGINT", () => {
  stopped = true;
});
process.on("SIGTERM", () => {
  stopped = true;
});

while (!stopped) {
  await syncOnce();
  await new Promise((resolve) => setTimeout(resolve, 3_000));
}
