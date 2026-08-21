import { describe, expect, it } from "vitest";
import { parsePriceText } from "@/core/pricing/price-parser";
import { isComparableCnyFare, verifiedTotalPrice } from "@/core/results/fare-presentation";
import { groupLowestPrice } from "@/core/results/result-presentation";
import { FlightResult } from "@/shared/types/flight";
import { MatchedFlightGroup } from "@/shared/types/matching";

function flight(currency: string, totalPrice?: number): FlightResult {
  return { id: currency, platform: "ctrip", marketingFlightNumber: "CA123", airline: "国航", departureDate: "2099-09-15", departureTime: "10:00", arrivalTime: "14:00", arrivesNextDay: false, departureAirport: "北京", arrivalAirport: "东京", direct: true, displayedPrice: totalPrice || 100, totalPrice, priceType: "public", isStartingPrice: false, currency, queryContextValid: true, confidence: 90, collectedAt: "", sourceUrl: "", rawPriceText: "", warnings: [] };
}

describe("国际报价币种隔离", () => {
  it("识别页面明确的外币标识", () => {
    expect(parsePriceText("US$ 320 含税").currency).toBe("USD");
    expect(parsePriceText("HK$ 1800 含税").currency).toBe("HKD");
    expect(parsePriceText("¥ 680 含税").currency).toBe("CNY");
  });

  it("外币含税价不参与人民币最低价", () => {
    const usd = flight("USD", 320); const cny = { ...flight("CNY", 680), platform: "qunar" as const };
    const group: MatchedFlightGroup = { id: "g", representative: usd, results: { ctrip: [usd], qunar: [cny] }, matchConfidence: 90, matchReasons: [], warnings: [] };
    expect(isComparableCnyFare(usd)).toBe(false);
    expect(verifiedTotalPrice(usd)).toBeUndefined();
    expect(groupLowestPrice(group)).toBe(680);
  });
});
