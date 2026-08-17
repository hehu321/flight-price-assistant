import { describe, expect, it } from "vitest";
import { snapshotLowest } from "@/core/analytics/history-analysis";
import { QuerySnapshot } from "@/shared/types/storage";
import { FlightQuery, FlightResult, RoundTripPackageResult } from "@/shared/types/flight";

const query: FlightQuery = { tripType: "roundtrip", originCity: "武汉", originCityCode: "WUH", destinationCity: "北京", destinationCityCode: "BJS", departureDate: "2099-08-20", returnDate: "2099-08-24", adultCount: 1, cabinClass: "economy", directOnly: false, enabledPlatforms: ["ctrip"] };
const platforms = { ctrip: { status: "completed" as const, message: "完成", resultCount: 2, updatedAt: "2099-08-01T00:00:00.000Z" }, qunar: { status: "cancelled" as const, message: "未参与", resultCount: 0, updatedAt: "2099-08-01T00:00:00.000Z" }, fliggy: { status: "cancelled" as const, message: "未参与", resultCount: 0, updatedAt: "2099-08-01T00:00:00.000Z" }, tongcheng: { status: "cancelled" as const, message: "未参与", resultCount: 0, updatedAt: "2099-08-01T00:00:00.000Z" } };
const leg = (legName: "outbound" | "inbound", price: number): FlightResult => ({ id: legName, platform: "ctrip", leg: legName, resultScope: legName === "outbound" ? "roundtrip_outbound" : "roundtrip_inbound", roundTripPricingMode: "split_fallback", marketingFlightNumber: "CZ3117", airline: "南方航空", departureDate: legName === "outbound" ? query.departureDate : query.returnDate!, departureTime: "08:00", arrivalTime: "10:00", arrivesNextDay: false, departureAirport: "天河机场", arrivalAirport: "大兴机场", direct: true, displayedPrice: price, totalPrice: price, priceType: "public", isStartingPrice: false, currency: "CNY", queryContextValid: true, confidence: 95, collectedAt: "2099-08-01T00:00:00.000Z", sourceUrl: "https://example.com", rawPriceText: `¥${price}`, warnings: [] });
const packageResult: RoundTripPackageResult = { id: "package", platform: "ctrip", resultScope: "roundtrip_package", outbound: { marketingFlightNumber: "CZ3117", airline: "南方航空", departureDate: query.departureDate, departureTime: "08:00", arrivalTime: "10:00", departureAirport: "天河机场", arrivalAirport: "大兴机场", direct: true }, inbound: { marketingFlightNumber: "CZ3118", airline: "南方航空", departureDate: query.returnDate!, departureTime: "12:00", arrivalTime: "14:00", departureAirport: "大兴机场", arrivalAirport: "天河机场", direct: true }, displayedTotalPrice: 980, isStartingPrice: false, currency: "CNY", confidence: 92, collectedAt: "2099-08-01T00:00:00.000Z", sourceUrl: "https://example.com", rawPriceText: "往返总价 ¥980", warnings: [] };

function snapshot(overrides: Partial<QuerySnapshot> = {}): QuerySnapshot {
  return { id: "s", taskId: "s", journeyKey: "WUH-BJS-2099-08-20-RT-2099-08-24", query, createdAt: "2099-08-01T00:00:00.000Z", updatedAt: "2099-08-01T00:00:00.000Z", platforms, results: { ctrip: [leg("outbound", 300), leg("inbound", 350)], qunar: [], fliggy: [], tongcheng: [] }, ...overrides };
}

describe("往返价格数据范围", () => {
  it("不会把两程分段价当成往返最低价", () => {
    expect(snapshotLowest(snapshot({ dataScopeVersion: 2 }))).toBeUndefined();
  });

  it("只使用平台明确披露的往返套餐总价", () => {
    expect(snapshotLowest(snapshot({ dataScopeVersion: 2, roundTripPackages: { ctrip: [packageResult] } }))).toBe(980);
  });

  it("旧版混合往返快照保留但不参与统计", () => {
    expect(snapshotLowest(snapshot())).toBeUndefined();
  });
});
