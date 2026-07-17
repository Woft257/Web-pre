import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

export function apiFailure(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues[0]?.message ?? "Invalid request",
          issues: error.issues,
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const message = error instanceof Error
    ? error.message
    : typeof error === "object"
      && error !== null
      && "message" in error
      && typeof error.message === "string"
      ? error.message
      : "Unexpected server error";
  const conflictCodes = [
    "MARKET_NOT_OPEN",
    "MARKET_FEED_NOT_HEALTHY",
    "MARKET_ENDED",
    "STALE_ORACLE",
    "ORACLE_VERSION_CHANGED",
    "VMM_VERSION_CHANGED",
    "RESUME_REQUIRES_FRESH_ODDS",
    "SCORE_REGRESSION",
    "MARKET_EXPOSURE_LIMIT",
    "INSUFFICIENT_BALANCE",
    "INSUFFICIENT_SHARES",
  ];
  const matchedCode = conflictCodes.find((code) => message.includes(code));

  if (matchedCode) {
    return NextResponse.json(
      { error: { code: matchedCode, message: humanizeCode(matchedCode) } },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "The request could not be completed" } },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

function humanizeCode(code: string) {
  const messages: Record<string, string> = {
    MARKET_NOT_OPEN: "Trading is currently suspended or closed",
    MARKET_FEED_NOT_HEALTHY: "The live feed is not healthy; trading is paused",
    MARKET_ENDED: "This market has ended",
    STALE_ORACLE: "The live price is stale; wait for a fresh update",
    ORACLE_VERSION_CHANGED: "The live price changed; request a new quote",
    VMM_VERSION_CHANGED: "Another trade changed the price; request a new quote",
    RESUME_REQUIRES_FRESH_ODDS: "Resume requires two fresh odds snapshots after suspension",
    SCORE_REGRESSION: "The provider score moved backwards; trading remains paused",
    MARKET_EXPOSURE_LIMIT: "This order exceeds the per-market exposure limit",
    INSUFFICIENT_BALANCE: "Not enough available points",
    INSUFFICIENT_SHARES: "Not enough shares to sell",
  };
  return messages[code] ?? code;
}
