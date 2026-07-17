import { normalizeDecimalOdds } from "@/lib/domain/pricing";

export interface BookmakerPrice {
  homeOdds: number;
  awayOdds: number;
  updatedAt: string;
}

function median(values: readonly number[]) {
  if (values.length === 0) {
    throw new Error("No valid bookmaker prices");
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function consensusProbability(prices: readonly BookmakerPrice[]) {
  const fresh = prices.filter((price) => {
    const age = Date.now() - new Date(price.updatedAt).getTime();
    return Number.isFinite(age) && age >= 0 && age <= 30_000;
  });
  if (fresh.length === 0) {
    throw new Error("All bookmaker prices are stale");
  }

  const normalized = fresh.map((price) => normalizeDecimalOdds([price.homeOdds, price.awayOdds]));
  const homeProbability = median(normalized.map(([home]) => home));
  return {
    homeProbability,
    awayProbability: 1 - homeProbability,
    sourceAt: fresh.map((price) => price.updatedAt).sort().at(-1)!,
    bookmakerCount: fresh.length,
  };
}
