export function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error("median () requires at least one value");
  }
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle]! + sorted[middle - 1]!) / 2;
  }
  return sorted[middle]!;
}
