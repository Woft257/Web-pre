export interface PriceHistoryEntry {
  homeProbability: number;
  awayProbability: number;
  sourceAt: string;
  oracleVersion: number;
  event: string | null;
}

export function compactPriceHistory<T extends PriceHistoryEntry>(points: readonly T[]) {
  return points.reduce<T[]>((compacted, point) => {
    const previous = compacted.at(-1);
    const exactDuplicate = previous
      && previous.sourceAt === point.sourceAt
      && previous.oracleVersion === point.oracleVersion
      && previous.homeProbability === point.homeProbability
      && previous.awayProbability === point.awayProbability
      && previous.event === point.event;
    const unchanged = previous
      && previous.homeProbability === point.homeProbability
      && previous.awayProbability === point.awayProbability
      && previous.event === null
      && point.event === null;

    if (exactDuplicate || unchanged) {
      compacted[compacted.length - 1] = point;
    } else {
      compacted.push(point);
    }
    return compacted;
  }, []);
}
