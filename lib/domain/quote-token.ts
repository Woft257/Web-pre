import "server-only";

import { jwtVerify, SignJWT, type JWTPayload } from "jose";

import { QUOTE_TTL_MS } from "@/lib/domain/constants";
import type { MarketSide } from "@/lib/domain/pricing";
import { env } from "@/lib/env";

export interface QuoteTokenPayload extends JWTPayload {
  userId: string;
  marketId: string;
  side: MarketSide;
  action: "buy" | "sell";
  amountMicro: number;
  oracleVersion: number;
  vmmVersion: number;
  quoteId: string;
  marketStatus: string;
  feedTimestamp: string | null;
  maxSlippageBps: number;
}

const key = new TextEncoder().encode(env.SESSION_SECRET);

export async function signQuoteToken(payload: QuoteTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${Math.floor(QUOTE_TTL_MS / 1000)}s`)
    .sign(key);
}

export async function verifyQuoteToken(token: string) {
  const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
  return payload as QuoteTokenPayload;
}
