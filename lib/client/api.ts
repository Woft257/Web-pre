interface ApiEnvelope<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: init?.cache ?? "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "Request failed");
  }
  return payload.data;
}

export function formatPoints(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatProbability(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    useGrouping: false,
  }).format(value * 100)}%`;
}

export function formatBangkokTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: process.env.NEXT_PUBLIC_APP_TIME_ZONE ?? "Asia/Bangkok",
  }).format(new Date(value));
}
