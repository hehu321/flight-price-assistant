import { describe, it, expect } from "vitest";
import { calculateConfidence } from "@/core/confidence/confidence-calculator";
import { FlightResult } from "@/shared/types/flight";

describe("confidence-calculator", () => {
  it("应该为完整的合规结果计算高可信度得分", () => {
    const flight: FlightResult = {
      id: "1",
      platform: "ctrip",
      marketingFlightNumber: "CZ3137",
      airline: "南方航空",
      departureDate: "2026-08-16",
      departureTime: "08:20",
      arrivalTime: "10:25",
      arrivesNextDay: false,
      departureAirport: "WUH",
      arrivalAirport: "PKX",
      direct: true,
      displayedPrice: 620,
      totalPrice: 690,
      priceType: "public",
      isStartingPrice: false,
      currency: "CNY",
      queryContextValid: true,
      confidence: 90,
      collectedAt: "",
      sourceUrl: "",
      rawPriceText: "¥620",
      warnings: [],
    };

    const res = calculateConfidence(flight);
    expect(res.score).toBeGreaterThanOrEqual(85);
    expect(res.level).toBe("high");
  });

  it("如果上下文校验失败，应该直接判定为 invalid 0分", () => {
    const flight: FlightResult = {
      id: "1",
      platform: "ctrip",
      marketingFlightNumber: "CZ3137",
      airline: "南方航空",
      departureDate: "2026-08-16",
      departureTime: "08:20",
      arrivalTime: "10:25",
      arrivesNextDay: false,
      departureAirport: "WUH",
      arrivalAirport: "PKX",
      direct: true,
      displayedPrice: 620,
      priceType: "public",
      isStartingPrice: false,
      currency: "CNY",
      queryContextValid: false, // 上下文失效
      confidence: 0,
      collectedAt: "",
      sourceUrl: "",
      rawPriceText: "",
      warnings: [],
    };

    const res = calculateConfidence(flight);
    expect(res.score).toBe(0);
    expect(res.level).toBe("invalid");
  });
});
