export interface MarketTeam {
  name: string;
  code: string;
  score: number;
  oracleProbability: number;
  price: number;
}

export interface PublicMarket {
  id: string;
  slug: string;
  title: string;
  competition: string;
  stage: string;
  home: MarketTeam;
  away: MarketTeam;
  kickoffAt: string;
  tradingEndAt: string;
  status: string;
  outcome: "home" | "away" | null;
  feedStatus: string;
  suspensionReason: string | null;
  matchMinute: number | null;
  matchPeriod: string | null;
  latestEvent: string | null;
  oracleSourceAt: string | null;
  oracleReceivedAt: string | null;
  oracleVersion: number;
  vmmVersion: number;
  minOrder: number;
  canTrade: boolean;
}

export interface MarketHistoryPoint {
  homeProbability: number;
  awayProbability: number;
  sourceAt: string;
  oracleVersion: number;
  event: string | null;
}

export interface CurrentUser {
  id: string;
  uid: string;
  maskedUid: string;
  balance: number;
  positionValue: number;
  equity: number;
  pnl: number;
}

export interface LeaderboardEntry {
  rank: number;
  maskedUid: string;
  balance: number;
  positionValue: number;
  equity: number;
  pnl: number;
  correctPredictions: number;
  settledPredictions: number;
  updatedAt: string;
}

export interface PortfolioPosition {
  marketId: string;
  market: PublicMarket;
  homeShares: number;
  awayShares: number;
  homeCost: number;
  awayCost: number;
  grossBought: number;
  netCost: number;
  realizedPnl: number;
  markValue: number;
  unrealizedPnl: number;
}

export interface PortfolioTrade {
  id: string;
  marketId: string;
  marketTitle: string;
  side: "home" | "away";
  action: "buy" | "sell";
  shares: number;
  cashDelta: number;
  averagePrice: number;
  createdAt: string;
}

export interface PortfolioData {
  positions: PortfolioPosition[];
  trades: PortfolioTrade[];
}

export interface QuoteData {
  quoteId: string;
  quoteToken: string;
  action: "buy" | "sell";
  side: "home" | "away";
  shares: number;
  cashPoints: number;
  averagePrice: number;
  priceImpact: number;
  probabilityBefore: number;
  probabilityAfter: number;
  maxPayout: number;
  expectedProfit: number | null;
  oracleVersion: number;
  vmmVersion: number;
  feedTimestamp: string | null;
  maxSlippageBps: number;
  quotedAt: string;
  expiresAt: string;
}
