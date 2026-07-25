import { LocalPriceRecord } from "@/shared/types/storage";

export function calculatePricePercentile(currentPrice: number, records: LocalPriceRecord[]): number {
  if (!records || records.length === 0 || currentPrice <= 0) return 50;

  const prices = records
    .map((r) => r.totalPrice ?? r.displayedPrice)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) return 50;

  let lowerCount = 0;
  for (const price of prices) {
    if (price < currentPrice) {
      lowerCount++;
    }
  }

  const percentile = Math.round((lowerCount / prices.length) * 100);
  return Math.min(100, Math.max(0, percentile));
}
