import { LocalPriceRecord } from "@/shared/types/storage";

export interface PriceStatistics {
  count: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  medianPrice: number;
}

export function calculatePriceStatistics(records: LocalPriceRecord[]): PriceStatistics {
  if (!records || records.length === 0) {
    return {
      count: 0,
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      medianPrice: 0,
    };
  }

  const prices = records
    .map((r) => r.totalPrice ?? r.displayedPrice)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return {
      count: 0,
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      medianPrice: 0,
    };
  }

  const sum = prices.reduce((a, b) => a + b, 0);
  const avgPrice = Math.round(sum / prices.length);
  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];

  let medianPrice: number;
  const mid = Math.floor(prices.length / 2);
  if (prices.length % 2 === 0) {
    medianPrice = Math.round((prices[mid - 1] + prices[mid]) / 2);
  } else {
    medianPrice = prices[mid];
  }

  return {
    count: prices.length,
    minPrice,
    maxPrice,
    avgPrice,
    medianPrice,
  };
}
