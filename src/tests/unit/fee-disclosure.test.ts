import { describe, expect, it } from "vitest";
import { mergeDisclosedFeeText } from "@/core/pricing/fee-disclosure";
import { FlightResult } from "@/shared/types/flight";

const flight: FlightResult = {
  id: "ctrip-1",
  platform: "ctrip",
  marketingFlightNumber: "CZ3117",
  airline: "南方航空",
  departureDate: "2026-08-16",
  departureTime: "08:10",
  arrivalTime: "10:05",
  arrivesNextDay: false,
  departureAirport: "天河机场T3",
  arrivalAirport: "大兴国际机场",
  direct: true,
  displayedPrice: 420,
  priceType: "public",
  isStartingPrice: false,
  currency: "CNY",
  queryContextValid: true,
  confidence: 90,
  collectedAt: "2026-07-24T08:00:00.000Z",
  sourceUrl: "https://example.com",
  rawPriceText: "¥420",
  warnings: [],
};

describe("页面公开费用合并", () => {
  it("只合并页面明确披露的机建和燃油费用", () => {
    const result = mergeDisclosedFeeText(flight, "机建费 ¥50 燃油附加费 ¥20");
    expect(result.airportConstructionFee).toBe(50);
    expect(result.fuelSurcharge).toBe(20);
    expect(result.totalPrice).toBe(490);
    expect(result.priceDisclosure).toBe("breakdown");
  });

  it("没有费用标签的列表文本保持为票价", () => {
    const result = mergeDisclosedFeeText(flight, "经济舱 ¥420 起");
    expect(result.totalPrice).toBeUndefined();
    expect(result.priceDisclosure).toBeUndefined();
  });
});
