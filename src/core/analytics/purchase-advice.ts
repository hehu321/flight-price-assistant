import { LocalPriceRecord } from "@/shared/types/storage";
import { calculatePriceStatistics } from "./price-statistics";
import { calculatePricePercentile } from "./price-percentile";

export type PurchaseAdviceLevel =
  | "buy_recommended"
  | "keep_watching"
  | "insufficient_data"
  | "high_volatility"
  | "verify_on_platform";

export interface PurchaseAdviceResult {
  level: PurchaseAdviceLevel;
  adviceText: string;
  disclaimer: string;
  percentile: number;
}

export function generatePurchaseAdvice(
  currentPrice: number,
  records: LocalPriceRecord[]
): PurchaseAdviceResult {
  const disclaimer = "分析仅基于用户本地历史查询记录，不保证未来机票价格变化。";

  if (!records || records.length < 3) {
    return {
      level: "insufficient_data",
      adviceText: "数据不足，建议继续积累本地历史价格",
      disclaimer,
      percentile: 50,
    };
  }

  const stats = calculatePriceStatistics(records);
  const percentile = calculatePricePercentile(currentPrice, records);

  if (percentile <= 25 || currentPrice <= stats.minPrice * 1.05) {
    return {
      level: "buy_recommended",
      adviceText: "当前价格属于历史较低位置，可以重点考虑购买",
      disclaimer,
      percentile,
    };
  } else if (percentile >= 75) {
    return {
      level: "keep_watching",
      adviceText: "当前价格处于历史较高位，建议继续观察",
      disclaimer,
      percentile,
    };
  } else {
    return {
      level: "keep_watching",
      adviceText: "当前价格处于中位水平，可按需购买或继续观察",
      disclaimer,
      percentile,
    };
  }
}
