export const MICRO_UNITS = 1_000_000;
export const PRICE_PPM = 1_000_000;
export const INITIAL_POINTS = 10_000;
export const MIN_ORDER_POINTS = 10;
export const QUOTE_TTL_MS = 5_000;
export const IN_PLAY_ACCEPTANCE_DELAY_MS = 3_000;
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_COOKIE_NAME = "mexc_uid_session";

export function pointsToMicro(points: number) {
  return Math.round(points * MICRO_UNITS);
}

export function microToPoints(micro: number | string | bigint) {
  return Number(micro) / MICRO_UNITS;
}
