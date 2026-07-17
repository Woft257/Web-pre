import { MICRO_UNITS, PRICE_PPM } from "@/lib/domain/constants";

export type MarketSide = "home" | "away";

export interface VmmState {
  homeProbability: number;
  homeInventory: number;
  awayInventory: number;
  liquidityB: number;
  spreadBps: number;
}

export interface TradeQuote {
  shares: number;
  cashPoints: number;
  averagePrice: number;
  priceImpact: number;
  probabilityBefore: number;
  probabilityAfter: number;
  maxPayout: number;
}

function assertProbability(probability: number) {
  if (!(probability > 0 && probability < 1)) {
    throw new Error("Probability must be between 0 and 1");
  }
}

export function normalizeDecimalOdds(decimalOdds: readonly number[]) {
  if (decimalOdds.length < 2 || decimalOdds.some((odd) => !Number.isFinite(odd) || odd <= 1)) {
    throw new Error("Decimal odds must contain at least two values greater than 1");
  }

  const raw = decimalOdds.map((odd) => 1 / odd);
  const margin = raw.reduce((sum, probability) => sum + probability, 0);
  return raw.map((probability) => probability / margin);
}

export function vmmCost(state: Omit<VmmState, "spreadBps">) {
  assertProbability(state.homeProbability);
  if (!(state.liquidityB > 0)) {
    throw new Error("Liquidity must be positive");
  }

  const homeTerm = Math.log(state.homeProbability) + state.homeInventory / state.liquidityB;
  const awayTerm = Math.log(1 - state.homeProbability) + state.awayInventory / state.liquidityB;
  const maxTerm = Math.max(homeTerm, awayTerm);
  return (
    state.liquidityB *
    (maxTerm + Math.log(Math.exp(homeTerm - maxTerm) + Math.exp(awayTerm - maxTerm)))
  );
}

export function marginalProbability(state: Omit<VmmState, "spreadBps">, side: MarketSide) {
  const homeWeight =
    state.homeProbability * Math.exp(state.homeInventory / state.liquidityB);
  const awayWeight =
    (1 - state.homeProbability) * Math.exp(state.awayInventory / state.liquidityB);
  const homePrice = homeWeight / (homeWeight + awayWeight);
  return side === "home" ? homePrice : 1 - homePrice;
}

function deltaCost(state: VmmState, side: MarketSide, deltaShares: number) {
  const before = vmmCost(state);
  const after = vmmCost({
    ...state,
    homeInventory: state.homeInventory + (side === "home" ? deltaShares : 0),
    awayInventory: state.awayInventory + (side === "away" ? deltaShares : 0),
  });
  return after - before;
}

function sharesForBudget(state: VmmState, side: MarketSide, budget: number) {
  const probability = side === "home" ? state.homeProbability : 1 - state.homeProbability;
  let low = 0;
  let high = Math.max(1, (budget / Math.max(probability, 0.01)) * 1.25);

  for (let index = 0; index < 30 && deltaCost(state, side, high) < budget; index += 1) {
    high *= 2;
  }

  for (let index = 0; index < 80; index += 1) {
    const middle = (low + high) / 2;
    if (deltaCost(state, side, middle) < budget) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return low;
}

export function quoteBuy(state: VmmState, side: MarketSide, points: number): TradeQuote {
  if (!(points > 0)) {
    throw new Error("Buy amount must be positive");
  }

  const probabilityBefore = marginalProbability(state, side);
  const halfSpread = state.spreadBps / 20_000;
  const baseBudget = points / (1 + halfSpread);
  const shares = Math.floor(sharesForBudget(state, side, baseBudget) * MICRO_UNITS) / MICRO_UNITS;
  const probabilityAfter = marginalProbability(
    {
      ...state,
      homeInventory: state.homeInventory + (side === "home" ? shares : 0),
      awayInventory: state.awayInventory + (side === "away" ? shares : 0),
    },
    side,
  );

  return {
    shares,
    cashPoints: points,
    averagePrice: points / shares,
    priceImpact: probabilityAfter - probabilityBefore,
    probabilityBefore,
    probabilityAfter,
    maxPayout: shares,
  };
}

export function quoteSell(state: VmmState, side: MarketSide, shares: number): TradeQuote {
  if (!(shares > 0)) {
    throw new Error("Sell amount must be positive");
  }
  const availableInventory = side === "home" ? state.homeInventory : state.awayInventory;
  if (shares > availableInventory) {
    throw new Error("Sell amount exceeds market inventory");
  }

  const probabilityBefore = marginalProbability(state, side);
  const halfSpread = state.spreadBps / 20_000;
  const baseProceeds = -deltaCost(state, side, -shares);
  const cashPoints = baseProceeds * (1 - halfSpread);
  const probabilityAfter = marginalProbability(
    {
      ...state,
      homeInventory: state.homeInventory - (side === "home" ? shares : 0),
      awayInventory: state.awayInventory - (side === "away" ? shares : 0),
    },
    side,
  );

  return {
    shares,
    cashPoints,
    averagePrice: cashPoints / shares,
    priceImpact: probabilityAfter - probabilityBefore,
    probabilityBefore,
    probabilityAfter,
    maxPayout: shares,
  };
}

export function marketStateFromRow(row: {
  oracle_home_probability_ppm: number;
  home_inventory_microshares: number;
  away_inventory_microshares: number;
  liquidity_b_microshares: number;
  spread_bps: number;
}): VmmState {
  return {
    homeProbability: row.oracle_home_probability_ppm / PRICE_PPM,
    homeInventory: row.home_inventory_microshares / MICRO_UNITS,
    awayInventory: row.away_inventory_microshares / MICRO_UNITS,
    liquidityB: row.liquidity_b_microshares / MICRO_UNITS,
    spreadBps: row.spread_bps,
  };
}

export function markPosition(shares: number, probability: number) {
  assertProbability(probability);
  return shares * probability;
}
