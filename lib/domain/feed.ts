export const LIVE_FEED_STALE_MS = 10_000;
export const PRE_MATCH_FEED_STALE_MS = 2 * 60_000;

export function isFeedFresh(
  status: string,
  receivedAt: string | null,
  now = Date.now(),
) {
  if (!receivedAt || !["pre_match_open", "live_open"].includes(status)) return false;
  const receivedTime = Date.parse(receivedAt);
  if (!Number.isFinite(receivedTime)) return false;
  const maxAge = status === "live_open" ? LIVE_FEED_STALE_MS : PRE_MATCH_FEED_STALE_MS;
  const age = now - receivedTime;
  return age >= -30_000 && age <= maxAge;
}
