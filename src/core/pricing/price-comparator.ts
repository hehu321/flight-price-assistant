import { FlightResult } from "@/shared/types/flight";

export function sortFlightResults(results: FlightResult[]): FlightResult[] {
  return [...results].sort((a, b) => {
    // 已核验含税价优先于仅有票面价的航班，避免错误混排。
    const aVerified = a.totalPrice !== undefined;
    const bVerified = b.totalPrice !== undefined;
    if (aVerified !== bVerified) return aVerified ? -1 : 1;
    const totalA = a.totalPrice ?? a.displayedPrice;
    const totalB = b.totalPrice ?? b.displayedPrice;

    // 2. 价格类型：公开价优先于会员价/券后价排序（如果价格相同）
    if (totalA !== totalB) {
      return totalA - totalB;
    }

    // 3. 高可信度优先
    if (a.confidence !== b.confidence) {
      return b.confidence - a.confidence;
    }

    // 4. 起飞时间
    return a.departureTime.localeCompare(b.departureTime);
  });
}
