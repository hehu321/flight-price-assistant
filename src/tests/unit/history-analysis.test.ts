import { describe, expect, it } from "vitest";
import { buildAlternatives, buildFlightPriceMatrix, buildJourneySummaries, compareSnapshots, snapshotLowest } from "@/core/analytics/history-analysis";
import { FlightResult, FlightQuery } from "@/shared/types/flight";
import { QuerySnapshot } from "@/shared/types/storage";

const query: FlightQuery = { tripType: "oneway", originCity: "武汉", originCityCode: "WUH", destinationCity: "北京", destinationCityCode: "BJS", departureDate: "2026-08-08", adultCount: 1, cabinClass: "economy", directOnly: false, enabledPlatforms: ["ctrip", "qunar", "fliggy", "tongcheng"] };
const emptyPlatforms = { ctrip: { status: "completed" as const, message: "完成", resultCount: 0, updatedAt: "2026-07-24T08:00:00.000Z" }, qunar: { status: "completed" as const, message: "完成", resultCount: 0, updatedAt: "2026-07-24T08:00:00.000Z" }, fliggy: { status: "completed" as const, message: "完成", resultCount: 0, updatedAt: "2026-07-24T08:00:00.000Z" }, tongcheng: { status: "completed" as const, message: "完成", resultCount: 0, updatedAt: "2026-07-24T08:00:00.000Z" } };

function flight(platform: FlightResult["platform"], price: number, overrides: Partial<FlightResult> = {}): FlightResult {
  return { id: `${platform}-${price}`, platform, marketingFlightNumber: "CZ3117", airline: "南方航空", departureDate: query.departureDate, departureTime: "08:10", arrivalTime: "10:05", arrivesNextDay: false, departureAirport: "天河机场T3", arrivalAirport: "大兴机场", direct: true, displayedPrice: price, totalPrice: price, priceType: "public", isStartingPrice: false, currency: "CNY", queryContextValid: true, confidence: 95, collectedAt: "2026-07-24T08:00:00.000Z", sourceUrl: "https://example.com", rawPriceText: `¥${price}`, warnings: [], ...overrides };
}

function snapshot(id: string, updatedAt: string, results: Partial<QuerySnapshot["results"]>, queryOverride: Partial<FlightQuery> = {}): QuerySnapshot {
  const queryValue = { ...query, ...queryOverride };
  return { id, taskId: id, journeyKey: `${queryValue.originCityCode}-${queryValue.destinationCityCode}-${queryValue.departureDate}`, query: queryValue, createdAt: updatedAt, updatedAt, platforms: emptyPlatforms, results: { ctrip: [], qunar: [], fliggy: [], tongcheng: [], ...results } };
}

describe("历史价格分析", () => {
  it("只在同一行程与出发日内汇总历史低价", () => {
    const same = snapshot("s1", "2026-07-24T08:00:00.000Z", { ctrip: [flight("ctrip", 500)] });
    const otherDate = snapshot("s2", "2026-07-25T08:00:00.000Z", { ctrip: [flight("ctrip", 200, { departureDate: "2026-08-09" })] }, { departureDate: "2026-08-09" });
    const summaries = buildJourneySummaries([same, otherDate]);
    expect(summaries).toHaveLength(2);
    expect(summaries.find((item) => item.journeyKey.endsWith("2026-08-08"))?.historicalLow).toBe(500);
  });

  it("合并同航班四平台价格并找出平台差价", () => {
    const current = snapshot("s1", "2026-07-24T08:00:00.000Z", { ctrip: [flight("ctrip", 520)], qunar: [flight("qunar", 480)], tongcheng: [flight("tongcheng", 500)] });
    const row = buildFlightPriceMatrix(current)[0];
    expect(row.lowestPrice).toBe(480);
    expect(row.saving).toBe(40);
    expect(row.prices.qunar?.displayedPrice).toBe(480);
  });

  it("计算两次快照的航班与平台涨跌", () => {
    const before = snapshot("before", "2026-07-24T08:00:00.000Z", { ctrip: [flight("ctrip", 500)] });
    const after = snapshot("after", "2026-07-25T08:00:00.000Z", { ctrip: [flight("ctrip", 560)] });
    const comparison = compareSnapshots(before, after);
    expect(comparison.platformChanges.find((item) => item.platform === "ctrip")?.delta).toBe(60);
    expect(comparison.flightChanges[0].delta).toBe(60);
  });

  it("给出多机场直飞替代选择", () => {
    const current = snapshot("s1", "2026-07-24T08:00:00.000Z", { ctrip: [flight("ctrip", 500)], qunar: [flight("qunar", 650, { marketingFlightNumber: "CZ3137", departureTime: "12:00", arrivalTime: "14:10", arrivalAirport: "首都机场T3" })] });
    expect(buildAlternatives(current).some((item) => item.kind === "airport")).toBe(true);
  });

  it("历史最低价不把未披露附加费的票面价当作可比总价", () => {
    const partial = snapshot("partial", "2026-07-24T08:00:00.000Z", { ctrip: [flight("ctrip", 399, { totalPrice: undefined })] });
    expect(snapshotLowest(partial)).toBeUndefined();
    expect(buildJourneySummaries([partial])[0].latestLowest).toBeUndefined();
  });
});
