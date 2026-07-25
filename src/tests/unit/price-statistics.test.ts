import { describe, it, expect } from "vitest";
import { calculatePriceStatistics } from "@/core/analytics/price-statistics";
import { LocalPriceRecord } from "@/shared/types/storage";

describe("price-statistics", () => {
  it("应该正确计算最高、最低、均值与中位数", () => {
    const records: LocalPriceRecord[] = [
      { id: "1", taskId: "t1", platform: "ctrip", originCityCode: "WUH", destinationCityCode: "BJS", departureDate: "2026-08-16", flightNumber: "CZ3137", displayedPrice: 500, totalPrice: 570, priceType: "public", confidence: 90, collectedAt: "" },
      { id: "2", taskId: "t1", platform: "qunar", originCityCode: "WUH", destinationCityCode: "BJS", departureDate: "2026-08-16", flightNumber: "CZ3137", displayedPrice: 600, totalPrice: 670, priceType: "public", confidence: 90, collectedAt: "" },
      { id: "3", taskId: "t1", platform: "fliggy", originCityCode: "WUH", destinationCityCode: "BJS", departureDate: "2026-08-16", flightNumber: "CZ3137", displayedPrice: 700, totalPrice: 770, priceType: "public", confidence: 90, collectedAt: "" },
    ];

    const stats = calculatePriceStatistics(records);
    expect(stats.count).toBe(3);
    expect(stats.minPrice).toBe(570);
    expect(stats.maxPrice).toBe(770);
    expect(stats.avgPrice).toBe(670);
    expect(stats.medianPrice).toBe(670);
  });
});
